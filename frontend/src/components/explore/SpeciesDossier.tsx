"use client";

import { useEffect, useState } from "react";
import {
  ArrowSquareOut,
  Binoculars,
  BookOpen,
  CheckCircle,
  Leaf,
  LockKey,
  X,
} from "@phosphor-icons/react";

import type { Species } from "./SpeciesCard";

type SpeciesDossierProps = {
  species: Species;
  locationName: string;
  onClose: () => void;
};

const TAXON_LABELS: Record<string, string> = {
  Aves: "Bird",
  Mammalia: "Mammal",
  Reptilia: "Reptile",
  Amphibia: "Amphibian",
  Insecta: "Insect",
  Plantae: "Plant",
  Fungi: "Fungus",
  Arachnida: "Arachnid",
  Mollusca: "Mollusk",
  Actinopterygii: "Fish",
  Animalia: "Animal",
};

export default function SpeciesDossier({
  species,
  locationName,
  onClose,
}: SpeciesDossierProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const displayName =
    species.common_name || species.scientific_name;

  const classification = species.iconic_taxon_name
    ? TAXON_LABELS[species.iconic_taxon_name] ??
      species.iconic_taxon_name
    : "Unknown";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Prevent background scrolling while the dossier is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#17291e]/75 p-3 backdrop-blur-[3px] md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="species-dossier-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[9px_9px_0_#17291e]"
      >
        {/* Retro title bar */}
        <div className="flex shrink-0 items-center justify-between border-b-[3px] border-[#254d32] bg-[#a8bfa0] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Leaf size={20} weight="fill" />

            <span className="truncate font-[family-name:var(--font-press-start)] text-[9px] md:text-[11px]">
              SPECIES_FILE.EXE
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close species dossier"
            className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#e7a977]"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto">
          {/* Photograph */}
          <div className="relative aspect-[16/9] border-b-[3px] border-[#254d32] bg-[#dce8d6]">
            {species.photo_url && !imageFailed ? (
              <img
                src={species.photo_url}
                alt={displayName}
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Binoculars
                  size={65}
                  weight="duotone"
                  className="text-[#58705b]"
                />
              </div>
            )}

            <div className="absolute bottom-4 left-4 border-2 border-[#254d32] bg-[#f5f1e6] px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold">
              FILE #{species.id}
            </div>
          </div>

          {/* Species information */}
          <div className="p-6 md:p-9">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle size={18} weight="fill" />

              <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                SPECIES IDENTIFIED
              </span>
            </div>

            <h2
              id="species-dossier-title"
              className="font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-5xl"
            >
              {displayName}
            </h2>

            <p className="mt-3 font-[family-name:var(--font-space-mono)] text-sm italic text-[#58705b]">
              {species.scientific_name}
            </p>

            {/* Information panel */}
            <div className="mt-8 border-[3px] border-[#254d32] bg-[#f5f1e6]">
              <div className="flex items-center justify-between gap-4 border-b-2 border-[#254d32] px-4 py-4">
                <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                  CLASSIFICATION
                </span>

                <span className="font-[family-name:var(--font-space-mono)] text-sm font-bold">
                  {classification}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 border-b-2 border-[#254d32] px-4 py-4">
                <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                  OBSERVATIONS IN {locationName.toUpperCase()}
                </span>

                <span className="font-[family-name:var(--font-space-mono)] text-sm font-bold">
                  {species.observation_count.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                  TAXON ID
                </span>

                <span className="font-[family-name:var(--font-space-mono)] text-sm font-bold">
                  {species.id}
                </span>
              </div>
            </div>

            {/* About section */}
            <div className="mt-9">
              <div className="mb-4 flex items-center gap-2">
                <BookOpen size={21} weight="bold" />

                <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
                  About this species
                </h3>
              </div>

              <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-7 text-[#58705b]">
                Curious about the {displayName.toLowerCase()}?
                Explore its natural history, habitat, behavior,
                and ecological significance through the
                available reference material.
              </p>

              {species.wikipedia_url ? (
                <a
                  href={species.wikipedia_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-3 border-[3px] border-[#254d32] bg-[#e7a977] px-5 py-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed shadow-[4px_4px_0_#254d32] transition-transform hover:-translate-y-1"
                >
                  <ArrowSquareOut size={19} weight="bold" />
                  OPEN WIKIPEDIA
                </a>
              ) : (
                <p className="mt-5 font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                  No Wikipedia article is linked to this species.
                </p>
              )}
            </div>

            {/* Future AI feature */}
            <div className="mt-10 border-[3px] border-dashed border-[#254d32] bg-[#dce8d6] p-5">
              <div className="flex items-center gap-3">
                <LockKey size={24} weight="duotone" />

                <div>
                  <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                    Ask BioFiles AI
                  </h3>

                  <p className="mt-1 font-[family-name:var(--font-dm-sans)] text-xs text-[#58705b]">
                    AI-powered species research is coming soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}