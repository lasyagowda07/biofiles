"use client";

import { useEffect, useRef, useState } from "react";

import {
  Binoculars,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import { prepareSpeciesAI } from "@/lib/species-ai";

import type { Species } from "./SpeciesCard";

import SpeciesWindow from "./SpeciesWindow";
import SpeciesDossier from "./SpeciesDossier";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

export type OpenSpeciesWindow = {
  species: Species;
  locationName: string;
  x: number;
  y: number;
  zIndex: number;
  minimized: boolean;
};

type SpeciesWindowManagerProps = {
  windows: OpenSpeciesWindow[];
  activeWindowId: number | null;
  onFocus: (speciesId: number) => void;
  onMinimize: (speciesId: number) => void;
  onClose: (speciesId: number) => void;
  limitReached: boolean;
  onDismissLimit: () => void;
};

export const MAX_SPECIES_WINDOWS = 5;

export default function SpeciesWindowManager({
  windows,
  activeWindowId,
  onFocus,
  onMinimize,
  onClose,
  limitReached,
  onDismissLimit,
}: SpeciesWindowManagerProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Shared AI preparation state.
  const [preparingSpeciesId, setPreparingSpeciesId] =
    useState<number | null>(null);

  const [readySpeciesIds, setReadySpeciesIds] = useState<
    number[]
  >([]);

  const [aiError, setAIError] = useState<string | null>(null);

  // Prevent overlapping preparation requests in this browser.
  const preparingRef = useRef(false);

  // --------------------------------------------------
  // RESPONSIVE BEHAVIOR
  // --------------------------------------------------

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    function updateMobile() {
      setIsMobile(mediaQuery.matches);
    }

    updateMobile();

    mediaQuery.addEventListener("change", updateMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateMobile);
    };
  }, []);

  // --------------------------------------------------
  // PREPARE SPECIES AI
  // --------------------------------------------------

  async function handlePrepareAI(speciesId: number) {
    if (preparingRef.current) return;

    if (readySpeciesIds.includes(speciesId)) return;

    preparingRef.current = true;
    setPreparingSpeciesId(speciesId);
    setAIError(null);

    try {
      const result = await prepareSpeciesAI(speciesId);

      if (result.status === "ready") {
        setReadySpeciesIds((previous) =>
          previous.includes(speciesId)
            ? previous
            : [...previous, speciesId]
        );
      } else if (result.status === "indexing") {
        setAIError(
          "This species is being prepared by another request. Please try again shortly."
        );
      } else {
        setAIError(
          "Unable to prepare species knowledge. Please try again."
        );
      }
    } catch (error) {
      console.error("AI preparation failed:", error);

      setAIError(
        "Unable to prepare species knowledge. Please try again."
      );
    } finally {
      preparingRef.current = false;
      setPreparingSpeciesId(null);
    }
  }

  // --------------------------------------------------
  // ACTIVE WINDOW
  // --------------------------------------------------

  const visibleWindows = windows.filter(
    (item) => !item.minimized
  );

  const mobileActiveId = isMobile
    ? visibleWindows.reduce<number | null>(
        (currentId, item) => {
          if (currentId === null) {
            return item.species.id;
          }

          const currentWindow = visibleWindows.find(
            (windowItem) =>
              windowItem.species.id === currentId
          );

          return currentWindow &&
            currentWindow.zIndex > item.zIndex
            ? currentId
            : item.species.id;
        },
        null
      )
    : activeWindowId;

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <>
      {/* SPECIES WINDOW LAYER */}

      {windows.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-0 bottom-[72px] z-[90]">
          {windows.map((item) => {
            const displayName =
              item.species.common_name ||
              item.species.scientific_name;

            return (
              <SpeciesWindow
                key={item.species.id}
                title={`${displayName.toUpperCase()}.EXE`}
                initialPosition={{
                  x: item.x,
                  y: item.y,
                }}
                zIndex={item.zIndex}
                minimized={item.minimized}
                active={
                  isMobile
                    ? mobileActiveId === item.species.id
                    : activeWindowId === item.species.id
                }
                onFocus={() => onFocus(item.species.id)}
                onMinimize={() =>
                  onMinimize(item.species.id)
                }
                onClose={() => onClose(item.species.id)}
              >
                <SpeciesDossier
                  species={item.species}
                  locationName={item.locationName}
                  onClose={() => onClose(item.species.id)}
                  onPrepareAI={() =>
                    void handlePrepareAI(item.species.id)
                  }
                  isAIReady={readySpeciesIds.includes(
                    item.species.id
                  )}
                  isAIPreparing={
                    preparingSpeciesId === item.species.id
                  }
                />
              </SpeciesWindow>
            );
          })}
        </div>
      )}

      {/* TASKBAR */}

      {windows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] border-t-[3px] border-[#254d32] bg-[#a8bfa0] px-3 py-3 md:px-5">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="hidden shrink-0 items-center gap-2 border-2 border-[#254d32] bg-[#254d32] px-3 py-2 text-[#fffdf7] sm:flex">
              <Binoculars size={19} weight="bold" />

              <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                BIOFILES
              </span>
            </div>

            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
              {windows.map((item) => {
                const name =
                  item.species.common_name ||
                  item.species.scientific_name;

                const isActive =
                  !item.minimized &&
                  (isMobile
                    ? mobileActiveId === item.species.id
                    : activeWindowId === item.species.id);

                return (
                  <button
                    key={item.species.id}
                    type="button"
                    onClick={() => onFocus(item.species.id)}
                    title={name}
                    className={`
                      flex max-w-[190px] shrink-0 items-center
                      gap-2 border-2 border-[#254d32]
                      px-3 py-2
                      font-[family-name:var(--font-space-mono)]
                      text-xs font-bold transition-colors
                      ${
                        isActive
                          ? "bg-[#254d32] text-[#fffdf7]"
                          : "bg-[#fffdf7] hover:bg-[#e7a977]"
                      }
                    `}
                  >
                    <span className="max-w-[130px] truncate">
                      {name}
                    </span>

                    {item.minimized && (
                      <span aria-label="Minimized">_</span>
                    )}
                  </button>
                );
              })}
            </div>

            <span className="hidden shrink-0 font-[family-name:var(--font-space-mono)] text-[10px] font-bold sm:block">
              {windows.length}/{MAX_SPECIES_WINDOWS} OPEN
            </span>
          </div>
        </div>
      )}

      {/* AI PREPARATION POPUP */}

      {preparingSpeciesId !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#17291e]/50 p-4">
          <div
            role="status"
            className="w-full max-w-md border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[8px_8px_0_#17291e]"
          >
            <div className="border-b-[3px] border-[#254d32] bg-[#a8bfa0] px-5 py-4">
              <span className="font-[family-name:var(--font-press-start)] text-[10px]">
                BIOFILES AI
              </span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4">
                <SpinnerGap
                  size={32}
                  className="shrink-0 animate-spin"
                />

                <div>
                  <p className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold">
                    Preparing species knowledge
                  </p>

                  <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-sm text-[#58705b]">
                    Gathering research and preparing the AI.
                    This may take a moment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI ERROR POPUP */}

      {aiError && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#17291e]/50 p-4">
          <div
            role="alert"
            className="w-full max-w-md border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[8px_8px_0_#17291e]"
          >
            <div className="flex items-center justify-between border-b-[3px] border-[#254d32] bg-[#e7a977] px-5 py-4">
              <span className="font-[family-name:var(--font-press-start)] text-[10px]">
                AI PREPARATION ERROR
              </span>

              <button
                type="button"
                onClick={() => setAIError(null)}
                aria-label="Dismiss AI error"
                className="flex h-8 w-8 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7]"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="p-6">
              <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed">
                {aiError}
              </p>

              <button
                type="button"
                onClick={() => setAIError(null)}
                className="mt-5 border-2 border-[#254d32] bg-[#a8bfa0] px-5 py-3 font-[family-name:var(--font-space-mono)] text-xs font-bold"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINDOW LIMIT NOTIFICATION */}

      {limitReached && (
        <div
          role="alert"
          className="fixed bottom-24 right-4 z-[110] w-[min(360px,calc(100vw-32px))] border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[6px_6px_0_#254d32]"
        >
          <div className="flex items-center justify-between border-b-[3px] border-[#254d32] bg-[#e7a977] px-4 py-3">
            <div className="flex items-center gap-2">
              <WarningCircle size={19} weight="bold" />

              <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                WINDOW LIMIT
              </span>
            </div>

            <button
              type="button"
              onClick={onDismissLimit}
              aria-label="Dismiss notification"
              className="flex h-7 w-7 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7]"
            >
              <X size={15} weight="bold" />
            </button>
          </div>

          <div className="p-5">
            <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed">
              You can open up to five species files at once.
              Close one to explore another!
            </p>

            <button
              type="button"
              onClick={onDismissLimit}
              className="mt-4 border-2 border-[#254d32] bg-[#a8bfa0] px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </>
  );
}