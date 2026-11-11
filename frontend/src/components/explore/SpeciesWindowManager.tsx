"use client";

import { useEffect, useState } from "react";

import {
  Binoculars,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import type { Species } from "./SpeciesCard";

import SpeciesWindow from "./SpeciesWindow";
import SpeciesDossier from "./SpeciesDossier";

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
      {/* ------------------------------------------
          SPECIES WINDOW LAYER

          This creates a separate stacking context.

          The layer stays below the taskbar (z-100),
          but windows can use their own z-index values
          to move in front of one another.

          pointer-events-none allows interaction
          with the Explore page behind the windows.
      ------------------------------------------ */}

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
                />
              </SpeciesWindow>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------
          TASKBAR

          Always above the species window layer.
      ------------------------------------------ */}

      {windows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[100] border-t-[3px] border-[#254d32] bg-[#a8bfa0] px-3 py-3 shadow-[0_-5px_0_#254d32]/10 md:px-5">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            {/* BIOFILES LABEL */}

            <div className="hidden shrink-0 items-center gap-2 border-2 border-[#254d32] bg-[#254d32] px-3 py-2 text-[#fffdf7] sm:flex">
              <Binoculars size={19} weight="bold" />

              <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                BIOFILES
              </span>
            </div>

            {/* OPEN WINDOW BUTTONS */}

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
                      flex
                      max-w-[190px]
                      shrink-0
                      items-center
                      gap-2
                      border-2
                      border-[#254d32]
                      px-3
                      py-2
                      font-[family-name:var(--font-space-mono)]
                      text-xs
                      font-bold
                      transition-colors
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

            {/* WINDOW COUNTER */}

            <span className="hidden shrink-0 font-[family-name:var(--font-space-mono)] text-[10px] font-bold sm:block">
              {windows.length}/{MAX_SPECIES_WINDOWS} OPEN
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------
          WINDOW LIMIT NOTIFICATION
      ------------------------------------------ */}

      {limitReached && (
        <div
          role="alert"
          className="fixed bottom-24 right-4 z-[110] w-[min(360px,calc(100vw-32px))] border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[6px_6px_0_#254d32]"
        >
          {/* NOTIFICATION TITLE BAR */}

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
              className="flex h-7 w-7 items-center justify-center border-2 border-[#254d32] bg-[#fffdf7] transition-colors hover:bg-[#f5f1e6]"
            >
              <X size={15} weight="bold" />
            </button>
          </div>

          {/* NOTIFICATION CONTENT */}

          <div className="p-5">
            <p className="font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed">
              You can open up to five species files at once.
              Close one to explore another!
            </p>

            <button
              type="button"
              onClick={onDismissLimit}
              className="mt-4 border-2 border-[#254d32] bg-[#a8bfa0] px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold transition-colors hover:bg-[#e7a977]"
            >
              GOT IT!
            </button>
          </div>
        </div>
      )}
    </>
  );
}