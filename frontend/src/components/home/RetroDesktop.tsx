"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowUpRight,
  FolderOpen,
  Info,
  Leaf,
} from "@phosphor-icons/react";

import DraggableWindow from "./DraggableWindow";

type WindowId = "explore" | "about";

type WindowState = {
  open: boolean;
  minimized: boolean;
  zIndex: number;
};

type Position = {
  x: number;
  y: number;
};

export default function RetroDesktop() {
  const [windows, setWindows] = useState<
    Record<WindowId, WindowState>
  >({
    explore: {
      open: true,
      minimized: false,
      zIndex: 2,
    },
    about: {
      open: true,
      minimized: false,
      zIndex: 1,
    },
  });

  const [topZIndex, setTopZIndex] = useState(3);

  const [positions, setPositions] = useState<
    Record<WindowId, Position>
  >({
    explore: { x: 20, y: 65 },
    about: { x: 20, y: 390 },
  });

  useEffect(() => {
    function updatePositions() {
      const width = window.innerWidth;

      if (width < 768) {
        setPositions({
          explore: { x: 10, y: 65 },
          about: { x: 10, y: 400 },
        });
      } else if (width < 1100) {
        setPositions({
          explore: { x: 25, y: 65 },
          about: { x: 300, y: 350 },
        });
      } else {
        setPositions({
          explore: { x: 45, y: 65 },
          about: { x: 680, y: 65 },
        });
      }
    }

    updatePositions();

    window.addEventListener("resize", updatePositions);

    return () => window.removeEventListener("resize", updatePositions);
  }, []);

  function focusWindow(id: WindowId) {
    const nextZIndex = topZIndex + 1;

    setTopZIndex(nextZIndex);

    setWindows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        zIndex: nextZIndex,
      },
    }));
  }

  function minimizeWindow(id: WindowId) {
    setWindows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        minimized: true,
      },
    }));
  }

  function closeWindow(id: WindowId) {
    setWindows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        open: false,
        minimized: false,
      },
    }));
  }

  function openWindow(id: WindowId) {
    const nextZIndex = topZIndex + 1;

    setTopZIndex(nextZIndex);

    setWindows((current) => ({
      ...current,
      [id]: {
        open: true,
        minimized: false,
        zIndex: nextZIndex,
      },
    }));
  }

  return (
    <main className="bio-desktop min-h-screen overflow-hidden bg-[#F5F1E6] text-[#254D32]">
      {/* Navigation */}
      <header className="relative z-50 border-b-[3px] border-[#254D32] bg-[#FFFDF7]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link
            href="/"
            className="group flex items-center gap-2 font-pixel text-xs md:text-sm"
          >
            <Leaf
              size={25}
              weight="fill"
              className="transition-transform duration-500 group-hover:-rotate-45"
            />
            BIOFILES_
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openWindow("explore")}
              className="bio-nav-button"
            >
              EXPLORE
            </button>

            <button
              type="button"
              onClick={() => openWindow("about")}
              className="bio-nav-button"
            >
              ABOUT
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="bio-hero relative mx-auto max-w-7xl px-5 pt-14 md:px-10 md:pt-20">
        <div className="relative z-10 text-center">
          <p className="bio-hero-enter mb-6 font-retro text-xl tracking-widest md:text-2xl">
            THE INTERNET&apos;S NATURE ARCHIVE
          </p>

          <h1 className="bio-hero-enter bio-go-wild font-pixel text-[clamp(2.7rem,10vw,8.5rem)] leading-[1.35]">
            GO WILD.
          </h1>

          <p className="bio-hero-enter mt-4 font-heading text-lg md:text-2xl">
            Discover the world beyond your window.
          </p>
        </div>
      </section>

      {/* Interactive desktop */}
      <section className="relative mx-auto mt-12 max-w-7xl px-5 pb-20 md:px-10">
        <div className="bio-desktop-area relative min-h-[590px] border-[3px] border-[#254D32] bg-[#E8E9DC] md:min-h-[650px]">
          {/* Desktop label */}
          <div className="absolute left-5 top-4 font-retro text-xl opacity-60">
            BIOFILES_OS / DESKTOP
          </div>

          {/* Desktop icons */}
          <div className="absolute bottom-6 left-6 z-20 flex gap-7">
            <button
              type="button"
              onClick={() => openWindow("explore")}
              className="bio-desktop-icon"
              aria-label="Open Explore window"
            >
              <FolderOpen size={40} weight="duotone" />
              <span>EXPLORE.EXE</span>
            </button>

            <button
              type="button"
              onClick={() => openWindow("about")}
              className="bio-desktop-icon"
              aria-label="Open About window"
            >
              <Info size={40} weight="duotone" />
              <span>ABOUT.TXT</span>
            </button>
          </div>

          {/* Explore window */}
          {windows.explore.open && !windows.explore.minimized && (
            <DraggableWindow
              key={`explore-${positions.explore.x}-${positions.explore.y}`}
              title="EXPLORE.EXE"
              initialPosition={positions.explore}
              zIndex={windows.explore.zIndex}
              onFocus={() => focusWindow("explore")}
              onMinimize={() => minimizeWindow("explore")}
              onClose={() => closeWindow("explore")}
              className="w-[min(520px,calc(100%-40px))]"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Leaf size={32} weight="duotone" />

                  <h2 className="font-pixel text-sm leading-relaxed">
                    EXPLORE NATURE
                  </h2>
                </div>

                <p className="max-w-sm font-heading text-lg leading-relaxed">
                  Discover species, explore habitats, and learn about
                  the living world.
                </p>

                <Link
                  href="/explore"
                  className="bio-primary-button inline-flex items-center gap-3"
                >
                  START EXPLORING
                  <ArrowUpRight size={18} weight="bold" />
                </Link>
              </div>
            </DraggableWindow>
          )}

          {/* About window */}
          {windows.about.open && !windows.about.minimized && (
            <DraggableWindow
              key={`about-${positions.about.x}-${positions.about.y}`}
              title="ABOUT.TXT"
              initialPosition={positions.about}
              zIndex={windows.about.zIndex}
              onFocus={() => focusWindow("about")}
              onMinimize={() => minimizeWindow("about")}
              onClose={() => closeWindow("about")}
              className="w-[min(370px,calc(100%-40px))]"
            >
              <div className="space-y-4">
                <p className="font-pixel text-xs leading-relaxed">
                  ABOUT BIOFILES
                </p>

                <p className="font-heading text-lg leading-relaxed">
                  A digital field guide to biodiversity, built for
                  curious minds.
                </p>

                <div className="border-t border-dashed border-[#254D32]/40 pt-3 font-retro text-xl">
                  EST. 2026
                </div>
              </div>
            </DraggableWindow>
          )}
        </div>

        <p className="mt-5 text-center font-retro text-xl opacity-70">
          DRAG WINDOWS TO EXPLORE THE DESKTOP ✳
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t-[3px] border-[#254D32] bg-[#254D32] px-5 py-5 text-[#F5F1E6]">
        <div className="mx-auto flex max-w-7xl items-center justify-between font-retro text-xl">
          <span>BIOFILES © 2026</span>
          <span>STAY CURIOUS ✳</span>
        </div>
      </footer>
    </main>
  );
}