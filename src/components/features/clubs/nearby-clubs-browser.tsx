"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, LocateFixed, MapPin } from "lucide-react";

import { ClubCard } from "@/components/features/clubs/club-card";
import { SectionTitle } from "@/components/ui/section-title";
import { formatClubDirectionsQuery } from "@/lib/utils/club-directions";

type ClubItem = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  indoor_courts_count?: number;
  outdoor_courts_count?: number;
  type: "Outdoor" | "Indoor";
  logo_url: string | null;
};

type NearbyClubsBrowserProps = {
  clubs: ClubItem[];
  locale: "fr" | "en";
};

type Coordinates = { lat: number; lng: number };
const FALLBACK_POSITION: Coordinates = { lat: 36.8065, lng: 10.1815 }; // Tunis center

const CITY_COORDINATES: Record<string, Coordinates> = {
  tunis: { lat: 36.8065, lng: 10.1815 },
  ariana: { lat: 36.8665, lng: 10.1647 },
  sfax: { lat: 34.7406, lng: 10.7603 },
  sousse: { lat: 35.8256, lng: 10.6084 },
  hammamet: { lat: 36.4008, lng: 10.6167 },
  nabeul: { lat: 36.4513, lng: 10.7357 },
  marsa: { lat: 36.8782, lng: 10.3247 },
};

function normalizeCity(city: string) {
  return city.trim().toLowerCase();
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

export function NearbyClubsBrowser({ clubs, locale }: NearbyClubsBrowserProps) {
  const [selectedCity, setSelectedCity] = useState("Tous");
  const [userPosition, setUserPosition] = useState<Coordinates | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPermissionDenied, setGeoPermissionDenied] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const cityTabs = useMemo(() => {
    const uniqueCities = [...new Set(clubs.map((club) => club.city).filter(Boolean))].sort();
    return ["Tous", ...uniqueCities];
  }, [clubs]);

  const displayedClubs = useMemo(() => {
    const filtered =
      selectedCity === "Tous" ? clubs : clubs.filter((club) => club.city === selectedCity);

    const withDistance = filtered.map((club) => {
      const cityKey = normalizeCity(club.city);
      const clubCoordinates = CITY_COORDINATES[cityKey];
      const distanceKm =
        userPosition && clubCoordinates ? haversineKm(userPosition, clubCoordinates) : null;
      return { club, distanceKm };
    });

    return withDistance.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return a.club.name.localeCompare(b.club.name);
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [clubs, selectedCity, userPosition]);

  const applyPosition = useCallback((position: GeolocationPosition) => {
    setUserPosition({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
    setLastUpdated(new Date());
    setGeoError(null);
    setGeoPermissionDenied(false);
    setLoadingGeo(false);
  }, []);

  const applyLocationError = useCallback(
    (error: GeolocationPositionError) => {
      setLoadingGeo(false);
      
      // Fallback if not already set
      setUserPosition((prev) => prev ?? FALLBACK_POSITION);

      switch (error.code) {
        case error.PERMISSION_DENIED:
          setGeoPermissionDenied(true);
          setGeoError(
            locale === "en"
              ? "Location blocked. Enable Location in your device settings (Windows: Settings > Privacy > Location | Phone: enable GPS) and allow it for this browser."
              : "Position bloquée. Activez la Localisation dans les paramètres de votre appareil (Windows : Paramètres > Confidentialité > Localisation | Téléphone : activez le GPS) et autorisez-la pour ce navigateur.",
          );
          break;
        case error.TIMEOUT:
          setGeoError(
            locale === "en"
              ? "Location request timed out. Retrying might help."
              : "Délai d'attente dépassé. Réessayez pour obtenir un signal GPS.",
          );
          break;
        case error.POSITION_UNAVAILABLE:
          setGeoError(
            locale === "en"
              ? "Position unavailable. Ensure GPS is on."
              : "Position indisponible. Vérifiez que votre GPS est activé.",
          );
          break;
        default:
          setGeoError(
            locale === "en"
              ? "An unknown error occurred while locating."
              : "Une erreur inconnue est survenue lors de la localisation.",
          );
      }
    },
    [locale],
  );

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError(locale === "en" ? "Geolocation is not supported by your browser." : "Votre navigateur ne supporte pas la géolocalisation.");
      setLoadingGeo(false);
      return;
    }

    if (!window.isSecureContext) {
      setGeoError(locale === "en" ? "Location requires a secure (HTTPS) connection." : "La position nécessite une connexion sécurisée (HTTPS).");
      setLoadingGeo(false);
      return;
    }

    setLoadingGeo(true);
    setGeoError(null);
    setGeoPermissionDenied(false);

    // Always attempt getCurrentPosition directly.
    // Do NOT short-circuit based on the Permissions API — the browser-level
    // permission and the OS-level permission can report different states,
    // which leads to false "denied" results.
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (error) => {
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          // Retry once with low accuracy (Cell/WiFi based)
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            applyLocationError,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        } else {
          applyLocationError(error);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [applyLocationError, applyPosition, locale]);

  function handleLocateMe() {
    requestUserLocation();
  }

  function handleReloadPage() {
    window.location.reload();
  }

  // Listen for permission changes — when the user toggles location in browser 
  // settings, automatically retry geolocation without needing a page reload.
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.permissions) return;

    navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
      const onChange = () => {
        if (status.state === "granted") {
          // Permission was just re-enabled — auto-request location
          setGeoPermissionDenied(false);
          setGeoError(null);
          requestUserLocation();
        } else if (status.state === "denied") {
          setGeoPermissionDenied(true);
        }
      };
      status.addEventListener("change", onChange);
    }).catch(() => {
      // Permissions API not supported — no-op
    });

    return () => {
      // Cleanup (the listener is on the permissionStatus object which gets GC'd)
    };
  }, [requestUserLocation]);

  return (
    <>
      <div
        role="tablist"
        aria-label={locale === "en" ? "Filter by city" : "Filtrer par ville"}
        className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2"
      >
        {cityTabs.map((city, i) => {
          const isSelected = selectedCity === city || (i === 0 && selectedCity === "Tous");
          return (
          <button
            key={city}
            type="button"
            role="tab"
            aria-selected={isSelected ? "true" : "false"}
            onClick={() => setSelectedCity(city)}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-xs font-bold transition-all border ${
              isSelected
                ? "bg-gold text-black border-gold shadow-gold"
                : "bg-surface-elevated text-foreground-muted border-white/5 hover:border-gold/30 hover:text-white"
            }`}
          >
            {city}
          </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SectionTitle title={locale === "en" ? "Best clubs" : "Meilleurs Clubs"} icon={<LayoutGrid className="h-4 w-4" />} />
        <button
          type="button"
          onClick={handleLocateMe}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black hover:bg-gold-light active:scale-95 shadow-gold transition-all"
          disabled={loadingGeo}
        >
          <LocateFixed className="h-3 w-3" />
          {loadingGeo
            ? locale === "en"
              ? "Locating..."
              : "Localisation..."
            : locale === "en"
              ? "Locate me"
              : "Me localiser"}
        </button>
      </div>

      {geoError ? <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">{geoError}</p> : null}
      {geoPermissionDenied ? (
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
            {locale === "en" ? "Location blocked" : "Localisation bloquée"}
          </p>
          <p className="mt-2 text-xs text-foreground-muted font-medium">
            {locale === "en"
              ? "Enable location in your browser settings (click the lock icon in the address bar), then reload."
              : "Active la localisation dans les paramètres du navigateur (clique sur le cadenas), puis recharge."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleReloadPage}
              className="inline-flex items-center rounded-xl bg-amber-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-700 transition-all active:scale-95"
            >
              {locale === "en" ? "↻ Reload" : "↻ Recharger"}
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              className="inline-flex items-center rounded-xl border border-white/10 bg-surface px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-white/5 transition-all"
            >
              {locale === "en" ? "Retry" : "Réessayer"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-foreground-muted/60">
        <MapPin className="h-3 w-3 text-gold/40" />
        {userPosition
          ? locale === "en"
            ? `Nearest ${lastUpdated ? `(Updated ${lastUpdated.toLocaleTimeString()})` : ""}`
            : `Proximité ${lastUpdated ? `(MàJ ${lastUpdated.toLocaleTimeString()})` : ""}`
          : locale === "en"
            ? "Location required for distance"
            : "Position requise pour distance"}
      </div>

      {displayedClubs.length === 0 ? (
        <div className="py-20 text-center italic text-foreground-muted font-medium">
          {locale === "en" ? "No clubs available right now." : "Aucun club disponible pour le moment."}
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedClubs.map(({ club, distanceKm }) => {
            const destination = formatClubDirectionsQuery({
              name: club.name,
              city: club.city,
              address: club.address ?? undefined,
            });
            const directionsHref = userPosition
              ? `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lng}&destination=${encodeURIComponent(destination)}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

            return (
              <ClubCard
                key={club.id}
                club={club}
                distanceKm={distanceKm}
                directionsHref={directionsHref}
                locale={locale}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
