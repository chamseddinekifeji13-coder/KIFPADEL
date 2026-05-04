"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, LocateFixed, MapPin } from "lucide-react";

import { ClubCard } from "@/components/features/clubs/club-card";
import { SectionTitle } from "@/components/ui/section-title";

type ClubItem = {
  id: string;
  name: string;
  city: string;
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
  const hasAutoLocatedRef = useRef(false);

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
              ? "Location access denied. Please enable it in your settings."
              : "Accès à la position refusé. Veuillez l'autoriser dans vos paramètres.",
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

    // Check if site is running in a secure context (HTTPS)
    if (!window.isSecureContext) {
      setGeoError(locale === "en" ? "Location requires a secure (HTTPS) connection." : "La position nécessite une connexion sécurisée (HTTPS).");
      setLoadingGeo(false);
      return;
    }

    setLoadingGeo(true);
    setGeoError(null);
    setGeoPermissionDenied(false);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 15000,           // 15 seconds timeout
      maximumAge: 30000,        // Accept a cached position up to 30 seconds old
    };

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (error) => {
        // If high accuracy fails or times out, try one more time with low accuracy (Cell/Wifi)
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            applyLocationError,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        } else {
          applyLocationError(error);
        }
      },
      geoOptions
    );
  }, [applyLocationError, applyPosition, locale]);

  function handleLocateMe() {
    requestUserLocation();
  }

  useEffect(() => {
    if (hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    
    // Small delay to ensure everything is mounted and ready
    const timer = setTimeout(() => {
      requestUserLocation();
    }, 800);

    return () => clearTimeout(timer);
  }, [requestUserLocation]);

  return (
    <>
      <div
        role="tablist"
        aria-label={locale === "en" ? "Filter by city" : "Filtrer par ville"}
        className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2"
      >
        {cityTabs.map((city, i) => (
          <button
            key={city}
            type="button"
            role="tab"
            aria-selected={selectedCity === city}
            onClick={() => setSelectedCity(city)}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-xs font-bold transition-all ${
              (selectedCity === city) || (i === 0 && selectedCity === "Tous")
                ? "bg-sky-600 text-white shadow-md shadow-sky-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {city}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <SectionTitle title={locale === "en" ? "Best clubs" : "Meilleurs Clubs"} icon={<LayoutGrid className="h-4 w-4" />} />
        <button
          type="button"
          onClick={handleLocateMe}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-50"
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

      {geoError ? <p className="text-xs text-amber-600">{geoError}</p> : null}
      {geoPermissionDenied ? (
        <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-semibold">
            {locale === "en" ? "Enable location in your browser" : "Active la localisation dans ton navigateur"}
          </p>
          <p className="mt-1">
            {locale === "en"
              ? "Click the lock icon near the address bar, then set Location to Allow or Ask, and retry."
              : "Clique sur le cadenas pres de la barre d'adresse, puis mets Localisation sur Autoriser ou Demander, puis reessaie."}
          </p>
          <button
            type="button"
            onClick={handleLocateMe}
            className="mt-2 inline-flex items-center rounded-lg border border-amber-400/60 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
          >
            {locale === "en" ? "Retry location" : "Réessayer la localisation"}
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <MapPin className="h-3 w-3" />
        {userPosition
          ? locale === "en"
            ? "Sorted by nearest"
            : "Trié par proximité"
          : locale === "en"
            ? "Proximity requires location"
            : "La proximité nécessite la position"}
      </div>

      {displayedClubs.length === 0 ? (
        <div className="py-12 text-center italic text-slate-500">
          {locale === "en" ? "No clubs available right now." : "Aucun club disponible pour le moment."}
        </div>
      ) : (
        <div className="grid gap-6">
          {displayedClubs.map(({ club, distanceKm }) => {
            const destination = `${club.name}, ${club.city}, Tunisie`;
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
    </>
  );
}
