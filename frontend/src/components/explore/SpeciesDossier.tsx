"use client";

import { useEffect, useState } from "react";

import {
  ArrowSquareOut,
  Binoculars,
  BookOpen,
  CheckCircle,
  LockKey,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";

import SpeciesAIChat from "./SpeciesAIChat";

import type { Species } from "./SpeciesCard";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SpeciesDossierProps = {
  species: Species;
  locationName: string;
  onClose: () => void;
  onPrepareAI: () => void;
  isAIReady: boolean;
  isAIPreparing: boolean;
};

type SpeciesInfo = {
  taxon_id: number;
  common_name: string | null;
  scientific_name: string;
  title: string | null;
  summary: string | null;
  wikipedia_url: string | null;
  available: boolean;
};

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

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

// --------------------------------------------------
// WIKIPEDIA URL VALIDATION
// --------------------------------------------------

function getWikipediaUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      return null;
    }

    if (parsedUrl.hostname !== "en.wikipedia.org") {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function SpeciesDossier({
  species,
  locationName,
  onPrepareAI,
  isAIReady,
  isAIPreparing,
}: SpeciesDossierProps) {
  // --------------------------------------------------
  // SPECIES IMAGE STATE
  // --------------------------------------------------

  const [imageFailed, setImageFailed] = useState(false);

  // --------------------------------------------------
  // WIKIPEDIA INFORMATION STATE
  // --------------------------------------------------

  const [speciesInfo, setSpeciesInfo] =
    useState<SpeciesInfo | null>(null);

  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  const [infoError, setInfoError] =
    useState<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);

  // --------------------------------------------------
  // SPECIES DISPLAY VALUES
  // --------------------------------------------------

  const displayName =
    species.common_name || species.scientific_name;

  const classification = species.iconic_taxon_name
    ? TAXON_LABELS[species.iconic_taxon_name] ??
      species.iconic_taxon_name
    : "Unknown";

  // --------------------------------------------------
  // FETCH WIKIPEDIA INFORMATION
  // --------------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSpeciesInfo() {
      setIsLoadingInfo(true);
      setInfoError(null);
      setSpeciesInfo(null);

      try {
        const response = await fetch(
          `${API_URL}/api/species/${species.id}/info`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Species information request failed: ${response.status}`
          );
        }

        const data: SpeciesInfo = await response.json();

        if (!controller.signal.aborted) {
          setSpeciesInfo(data);
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Species encyclopedia error:", error);

        setInfoError(
          "We couldn't load this species' encyclopedia information right now."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingInfo(false);
        }
      }
    }

    void fetchSpeciesInfo();

    return () => controller.abort();
  }, [species.id, retryCount]);

  // --------------------------------------------------
  // WIKIPEDIA DISPLAY VALUES
  // --------------------------------------------------

  const wikipediaUrl = getWikipediaUrl(
    speciesInfo?.wikipedia_url ?? species.wikipedia_url
  );

  const summaryParagraphs =
    speciesInfo?.summary
      ?.split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? [];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="bg-[#fffdf7]">
      {/* --------------------------------------------------
          SPECIES PHOTOGRAPH
      -------------------------------------------------- */}

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

      {/* --------------------------------------------------
          SPECIES INFORMATION
      -------------------------------------------------- */}

      <div className="p-6 md:p-9">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle size={18} weight="fill" />

          <span className="font-[family-name:var(--font-press-start)] text-[9px]">
            SPECIES IDENTIFIED
          </span>
        </div>

        <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-5xl">
          {displayName}
        </h2>

        <p className="mt-3 font-[family-name:var(--font-space-mono)] text-sm italic text-[#58705b]">
          {species.scientific_name}
        </p>

        {/* --------------------------------------------------
            INFORMATION PANEL
        -------------------------------------------------- */}

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

        {/* --------------------------------------------------
            FIELD ENCYCLOPEDIA
        -------------------------------------------------- */}

        <section className="mt-10">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-[#254d32] bg-[#e7a977]">
              <BookOpen size={22} weight="duotone" />
            </div>

            <div>
              <span className="font-[family-name:var(--font-press-start)] text-[8px]">
                FIELD ENCYCLOPEDIA
              </span>

              <h3 className="mt-1 font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
                About this species
              </h3>
            </div>
          </div>

          {/* LOADING */}

          {isLoadingInfo && (
            <div
              role="status"
              className="border-[3px] border-[#254d32] bg-[#f5f1e6] p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <SpinnerGap
                  size={20}
                  className="animate-spin"
                />

                <span className="font-[family-name:var(--font-space-mono)] text-xs font-bold">
                  RETRIEVING FIELD NOTES...
                </span>
              </div>

              <div className="space-y-3">
                <div className="h-3 w-full animate-pulse bg-[#dce8d6]" />
                <div className="h-3 w-11/12 animate-pulse bg-[#dce8d6]" />
                <div className="h-3 w-4/5 animate-pulse bg-[#dce8d6]" />
                <div className="h-3 w-2/3 animate-pulse bg-[#dce8d6]" />
              </div>
            </div>
          )}

          {/* ERROR */}

          {!isLoadingInfo && infoError && (
            <div
              role="alert"
              className="border-[3px] border-[#b54738] bg-[#fff0e9] p-5 text-[#9e382b]"
            >
              <div className="flex items-start gap-3">
                <WarningCircle
                  size={22}
                  weight="bold"
                  className="shrink-0"
                />

                <div>
                  <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed">
                    {infoError}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setRetryCount((previous) => previous + 1)
                    }
                    className="mt-4 border-2 border-[#9e382b] px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold hover:bg-[#f8d9cd]"
                  >
                    RETRY REQUEST
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WIKIPEDIA ARTICLE */}

          {!isLoadingInfo &&
            !infoError &&
            speciesInfo?.available &&
            summaryParagraphs.length > 0 && (
              <div className="border-[3px] border-[#254d32] bg-[#f5f1e6] p-5 md:p-6">
                {speciesInfo.title && (
                  <div className="mb-5 border-b-2 border-[#b9c8af] pb-4">
                    <span className="font-[family-name:var(--font-space-mono)] text-[10px] font-bold text-[#58705b]">
                      ARTICLE
                    </span>

                    <p className="mt-1 font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                      {speciesInfo.title}
                    </p>
                  </div>
                )}

                <div className="space-y-5">
                  {summaryParagraphs.map(
                    (paragraph, index) => (
                      <p
                        key={index}
                        className="font-[family-name:var(--font-dm-sans)] text-sm leading-7 text-[#425e47] md:text-[15px]"
                      >
                        {paragraph}
                      </p>
                    )
                  )}
                </div>

                <div className="mt-6 border-t-2 border-[#b9c8af] pt-4">
                  <p className="font-[family-name:var(--font-space-mono)] text-[10px] text-[#58705b]">
                    SOURCE: WIKIPEDIA
                  </p>
                </div>
              </div>
            )}

          {/* NO WIKIPEDIA ARTICLE */}

          {!isLoadingInfo &&
            !infoError &&
            (!speciesInfo?.available ||
              summaryParagraphs.length === 0) && (
              <div className="border-[3px] border-dashed border-[#254d32] bg-[#f5f1e6] p-6">
                <BookOpen
                  size={28}
                  weight="duotone"
                  className="mb-4"
                />

                <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#58705b]">
                  We haven't found encyclopedia information
                  for this species yet. You can still explore
                  its observation records and classification.
                </p>
              </div>
            )}

          {/* WIKIPEDIA LINK */}

          {!isLoadingInfo && wikipediaUrl && (
            <a
              href={wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 border-[3px] border-[#254d32] bg-[#e7a977] px-5 py-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed shadow-[4px_4px_0_#254d32] transition-transform hover:-translate-y-1"
            >
              <ArrowSquareOut
                size={19}
                weight="bold"
              />

              READ FULL WIKIPEDIA ARTICLE
            </a>
          )}
        </section>

        {/* --------------------------------------------------
            ASK BIOFILES AI
        -------------------------------------------------- */}

        <div className="mt-10 border-[3px] border-[#254d32] bg-[#dce8d6] p-5">
          <div className="flex items-center gap-3">
            <LockKey size={24} weight="duotone" />

            <div>
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                Ask BioFiles AI
              </h3>

              <p className="mt-1 font-[family-name:var(--font-dm-sans)] text-xs text-[#58705b]">
                Explore this species with AI-powered research.
              </p>
            </div>
          </div>

          {/* LAUNCH AI BUTTON */}

          <button
            type="button"
            onClick={onPrepareAI}
            disabled={isAIPreparing || isAIReady}
            className="mt-5 flex items-center gap-2 border-[3px] border-[#254d32] bg-[#e7a977] px-5 py-3 font-[family-name:var(--font-press-start)] text-[9px] shadow-[4px_4px_0_#254d32] transition-transform hover:-translate-y-1 disabled:cursor-default disabled:opacity-60"
          >
            {isAIPreparing ? (
              <SpinnerGap
                size={18}
                className="animate-spin"
              />
            ) : isAIReady ? (
              <CheckCircle
                size={18}
                weight="fill"
              />
            ) : (
              <BookOpen
                size={18}
                weight="bold"
              />
            )}

            {isAIPreparing
              ? "PREPARING..."
              : isAIReady
                ? "AI READY"
                : "LAUNCH BIOFILES AI"}
          </button>

          {/* AI READY MESSAGE */}

          {isAIReady && (
            <p
              role="status"
              className="mt-5 font-[family-name:var(--font-space-mono)] text-xs text-[#425e47]"
            >
              Species knowledge is ready! You can now ask questions below.
            </p>
          )}
        </div>

        {/* --------------------------------------------------
            AI CHAT INTERFACE

            Only rendered once species indexing is complete.
            Each dossier maintains its own conversation.
        -------------------------------------------------- */}

        {isAIReady && (
          <SpeciesAIChat
            speciesId={species.id}
            speciesName={displayName}
          />
        )}
      </div>
    </div>
  );
}