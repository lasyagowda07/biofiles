"use client";

import { useState } from "react";
import {
  ArrowSquareOut,
  Binoculars,
  Bird,
  Bug,
  Leaf,
  PawPrint,
  Tree,
} from "@phosphor-icons/react";

export type Species = {
  id: number;
  common_name: string | null;
  scientific_name: string;
  observation_count: number;
  photo_url: string | null;
  iconic_taxon_name: string | null;
  wikipedia_url: string | null;
};

type SpeciesCardProps = {
  species: Species;
  onClick: () => void;
};

const TAXON_LABELS: Record<string, string> = {
  Aves: "BIRD",
  Mammalia: "MAMMAL",
  Reptilia: "REPTILE",
  Amphibia: "AMPHIBIAN",
  Insecta: "INSECT",
  Plantae: "PLANT",
  Fungi: "FUNGUS",
  Arachnida: "ARACHNID",
  Mollusca: "MOLLUSK",
  Actinopterygii: "FISH",
  Animalia: "ANIMAL",
};

function TaxonIcon({
  taxon,
  size = 16,
}: {
  taxon: string | null;
  size?: number;
}) {
  switch (taxon) {
    case "Aves":
      return <Bird size={size} weight="fill" />;

    case "Insecta":
    case "Arachnida":
      return <Bug size={size} weight="fill" />;

    case "Plantae":
      return <Leaf size={size} weight="fill" />;

    case "Fungi":
      return <Tree size={size} weight="fill" />;

    case "Mammalia":
      return <PawPrint size={size} weight="fill" />;

    default:
      return <Binoculars size={size} weight="fill" />;
  }
}

export default function SpeciesCard({
  species,
  onClick,
}: SpeciesCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const taxonLabel = species.iconic_taxon_name
    ? TAXON_LABELS[species.iconic_taxon_name] ??
      species.iconic_taxon_name.toUpperCase()
    : "SPECIES";

  const displayName =
    species.common_name || species.scientific_name;

  const showImage = Boolean(species.photo_url) && !imageFailed;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Open species dossier for ${displayName}`}
      className="group flex h-full w-full flex-col overflow-hidden border-[3px] border-[#254d32] bg-[#fffdf7] text-left shadow-[5px_5px_0_#254d32] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#e7a977]"
    >
      {/* Wildlife photograph */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b-[3px] border-[#254d32] bg-[#dce8d6]">
        {showImage ? (
          <img
            src={species.photo_url!}
            alt={displayName}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#dce8d6]">
            <Binoculars
              size={42}
              weight="duotone"
              className="text-[#58705b]"
            />

            <span className="font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
              NO PHOTO AVAILABLE
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2 border-2 border-[#254d32] bg-[#f5f1e6] px-3 py-2 font-[family-name:var(--font-space-mono)] text-[10px] font-bold shadow-[2px_2px_0_#254d32]">
          <TaxonIcon taxon={species.iconic_taxon_name} />
          {taxonLabel}
        </div>

        <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border-2 border-[#254d32] bg-[#e7a977] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowSquareOut size={19} weight="bold" />
        </div>
      </div>

      {/* Species information */}
      <div className="flex w-full flex-1 flex-col p-5">
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold leading-tight tracking-tight">
          {displayName}
        </h3>

        <p className="mt-2 font-[family-name:var(--font-space-mono)] text-xs italic text-[#58705b]">
          {species.scientific_name}
        </p>

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 border-t border-[#b9c8af] pt-4">
            <span className="font-[family-name:var(--font-space-mono)] text-[11px] text-[#58705b]">
              OBSERVATIONS
            </span>

            <span className="border-2 border-[#254d32] bg-[#a8bfa0] px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs font-bold">
              {species.observation_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}