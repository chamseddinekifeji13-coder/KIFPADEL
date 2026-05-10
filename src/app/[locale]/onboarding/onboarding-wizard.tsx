"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Shield,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Trophy,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { completeOnboardingAction } from "@/modules/onboarding/actions";
import type { Dictionary } from "@/i18n/get-dictionary";

type OnboardingWizardProps = {
  locale: string;
};

type Step = "profile" | "phone" | "level" | "trust";

const LEVELS = [
  { id: "beginner", label: "Débutant", description: "Je découvre le padel" },
  { id: "intermediate", label: "Intermédiaire", description: "Je joue régulièrement (1-2 ans)" },
  { id: "advanced", label: "Avancé", description: "Je participe à des tournois" },
  { id: "expert", label: "Expert", description: "Niveau compétition national" },
];

const CITIES = [
  "Tunis", "La Marsa", "Carthage", "Sidi Bou Said", "Sousse", "Sfax", "Hammamet", "Nabeul"
];

export function OnboardingWizard({ locale }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>("profile");
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const [level, setLevel] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");

  const steps: Step[] = ["profile", "phone", "level", "trust"];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canContinue = () => {
    switch (step) {
      case "profile": return displayName.length >= 2 && city.length > 0 && (gender === "male" || gender === "female");
      case "phone": return true; // Phone is optional until real SMS verification is wired.
      case "level": return level.length > 0;
      case "trust": return true;
      default: return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append("locale", locale);
    formData.append("displayName", displayName);
    formData.append("city", city);
    formData.append("phone", phone);
    formData.append("level", level);
    formData.append("gender", gender);
    
    // We don't catch here because redirect() throws a special error that Next.js needs to catch
    try {
      await completeOnboardingAction(formData);
    } catch (err) {
      // If it's a redirect error, re-throw it so Next.js can handle it
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        throw err;
      }
      console.error("Onboarding failed:", err);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
          <span>Étape {currentStepIndex + 1} sur {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-8">
          <div 
            className={cn(
              "h-full bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] transition-all duration-500 ease-out",
              progress === 25 ? "w-1/4" :
              progress === 50 ? "w-1/2" :
              progress === 75 ? "w-3/4" :
              progress === 100 ? "w-full" : "w-0"
            )}
          />
        </div>
      </div>

      {urlError && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Erreur de création</p>
            <p className="opacity-80">{urlError}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        {step === "profile" && (
          <ProfileStep
            displayName={displayName}
            setDisplayName={setDisplayName}
            city={city}
            setCity={setCity}
            cities={CITIES}
            gender={gender}
            setGender={setGender}
          />
        )}

        {step === "phone" && (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
          />
        )}

        {step === "level" && (
          <LevelStep
            level={level}
            setLevel={setLevel}
            levels={LEVELS}
          />
        )}

        {step === "trust" && (
          <TrustStep level={level} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {currentStepIndex > 0 && (
          <button
            onClick={handleBack}
            className="h-12 px-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] font-bold text-sm hover:text-white transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
        )}
        
        {step === "trust" ? (
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 h-12 rounded-xl bg-[var(--gold)] text-black font-bold text-sm hover:bg-[var(--gold-dark)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Création..." : (
              <>
                <Sparkles className="h-4 w-4" />
                Commencer à jouer
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="flex-1 h-12 rounded-xl bg-[var(--gold)] text-black font-bold text-sm hover:bg-[var(--gold-dark)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuer
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Profile Step
function ProfileStep({
  displayName,
  setDisplayName,
  city,
  setCity,
  cities,
  gender,
  setGender,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  cities: string[];
  gender: "" | "male" | "female";
  setGender: (v: "" | "male" | "female") => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <User className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-bold text-white">Ton profil</h2>
          <p className="text-xs text-[var(--foreground-muted)]">Comment veux-tu être appelé ?</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Nom d&apos;affichage
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex: Ahmed B."
            className="w-full h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Genre (matchmaking)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender("male")}
              className={cn(
                "h-11 rounded-xl text-sm font-bold transition-all",
                gender === "male"
                  ? "bg-[var(--gold)] text-black"
                  : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--gold)]/40",
              )}
            >
              Homme
            </button>
            <button
              type="button"
              onClick={() => setGender("female")}
              className={cn(
                "h-11 rounded-xl text-sm font-bold transition-all",
                gender === "female"
                  ? "bg-[var(--gold)] text-black"
                  : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--gold)]/40",
              )}
            >
              Femme
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Ville
          </label>
          <div className="grid grid-cols-2 gap-2">
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={cn(
                  "h-10 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                  city === c
                    ? "bg-[var(--gold)] text-black"
                    : "bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-white hover:border-[var(--gold)]/30"
                )}
              >
                <MapPin className="h-3 w-3" />
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Phone Step
function PhoneStep({
  phone,
  setPhone,
}: {
  phone: string;
  setPhone: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <Phone className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-bold text-white">Vérification téléphone</h2>
          <p className="text-xs text-[var(--foreground-muted)]">Optionnel pour être contacté par les clubs</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider">
            Numéro de téléphone
          </label>
          <div className="flex gap-2">
            <div className="h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center text-white font-medium">
              +216
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="55 123 456"
              className="flex-1 h-12 px-4 rounded-xl bg-[var(--background)] border border-[var(--border)] text-white placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-50"
            />
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 text-xs leading-relaxed text-[var(--foreground-muted)]">
          La vérification SMS sera ajoutée prochainement. Pour l&apos;instant, ce numéro est seulement enregistré comme contact et ne donne pas de bonus de confiance.
        </div>

        <p className="text-xs text-[var(--foreground-muted)] text-center">
          Tu peux ignorer cette étape, puis ajouter un numéro plus tard depuis ton profil.
        </p>
      </div>
    </div>
  );
}

// Level Step
function LevelStep({
  level,
  setLevel,
  levels,
}: {
  level: string;
  setLevel: (v: string) => void;
  levels: { id: string; label: string; description: string }[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-bold text-white">Ton niveau</h2>
          <p className="text-xs text-[var(--foreground-muted)]">Pour de meilleurs matchs</p>
        </div>
      </div>

      <div className="space-y-2">
        {levels.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={cn(
              "w-full p-4 rounded-xl text-left transition-all",
              level === l.id
                ? "bg-[var(--gold)]/10 border-2 border-[var(--gold)]"
                : "bg-[var(--background)] border border-[var(--border)] hover:border-[var(--gold)]/30"
            )}
          >
            <p className={cn("font-bold", level === l.id ? "text-[var(--gold)]" : "text-white")}>
              {l.label}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">{l.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// Trust Step
function TrustStep({ level }: { level: string }) {
  const levelBonuses: Record<string, number> = {
    beginner: 5,
    intermediate: 10,
    advanced: 15,
    expert: 20,
  };
  
  const baseScore = 50;
  const levelBonus = levelBonuses[level] || 0;
  const totalScore = baseScore + levelBonus;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-bold text-white">Score de confiance</h2>
          <p className="text-xs text-[var(--foreground-muted)]">Ton capital fiabilité</p>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-[var(--background)] border border-[var(--border)] text-center">
        <p className="text-5xl font-black text-[var(--gold)]">{totalScore}</p>
        <p className="text-sm text-[var(--foreground-muted)] mt-2">Score de départ</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
          <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5" />
          <div>
            <p className="text-[var(--success)] font-medium">Gagne des points</p>
            <p className="text-xs text-[var(--foreground-muted)]">En respectant tes réservations et en jouant régulièrement</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/20">
          <Shield className="h-4 w-4 text-[var(--danger)] mt-0.5" />
          <div>
            <p className="text-[var(--danger)] font-medium">Attention aux pénalités</p>
            <p className="text-xs text-[var(--foreground-muted)]">No-show (-18), annulation tardive (-10), mauvais comportement (-25)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
