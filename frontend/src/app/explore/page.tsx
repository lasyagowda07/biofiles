"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Binoculars,
  CheckCircle,
  Compass,
  GlobeHemisphereWest,
  Leaf,
  MapPin,
  MagnifyingGlass,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

type Place = {
  id: number;
  name: string;
  display_name: string;
  place_type: number | null;
};

type PlaceSearchResponse = {
  query: string;
  results: Place[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const SUGGESTED_DESTINATIONS = [
  "Goa",
  "California",
  "Costa Rica",
];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2 || selectedPlace) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/places/search?q=${encodeURIComponent(
            trimmedQuery
          )}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Location search failed.");
        }

        const data: PlaceSearchResponse = await response.json();

        setPlaces(data.results);
        setIsDropdownOpen(true);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Location search error:", err);

        setError(
          "We couldn't search locations right now. Please try again."
        );

        setPlaces([]);
        setIsDropdownOpen(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedPlace]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedPlace(null);
    setPlaces([]);
    setError(null);
    setIsDropdownOpen(value.trim().length >= 2);
  }

  function handleSelectPlace(place: Place) {
    setSelectedPlace(place);
    setQuery(place.display_name || place.name);
    setPlaces([]);
    setIsDropdownOpen(false);
    setError(null);
  }

  function handleClearSearch() {
    setQuery("");
    setPlaces([]);
    setSelectedPlace(null);
    setIsDropdownOpen(false);
    setError(null);
  }

  function handleSuggestedDestination(destination: string) {
    handleQueryChange(destination);
    setIsDropdownOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f5f1e6] text-[#254d32]">
      {/* Navigation */}
      <header className="border-b-[3px] border-[#254d32] bg-[#f5f1e6]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link
            href="/"
            className="font-[family-name:var(--font-press-start)] text-sm tracking-[-0.08em] md:text-lg"
          >
            BIOFILES<span className="text-[#e7a977]">.</span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 border-2 border-[#254d32] px-4 py-3 font-[family-name:var(--font-press-start)] text-[9px] transition-colors hover:bg-[#a8bfa0]"
          >
            <ArrowLeft size={15} weight="bold" />
            BACK HOME
          </Link>
        </div>
      </header>

      {/* Page heading */}
      <section className="mx-auto max-w-7xl px-5 pb-10 pt-14 md:px-10 md:pt-20">
        <div className="mb-7 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 border-2 border-[#254d32] bg-[#a8bfa0] px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold">
            <Compass size={17} weight="bold" />
            FIELD EXPLORER v1.0
          </span>

          <span className="inline-flex items-center gap-2 font-[family-name:var(--font-space-mono)] text-xs">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#4f985b]" />
            SYSTEM ONLINE
          </span>
        </div>

        <h1 className="max-w-4xl font-[family-name:var(--font-space-grotesk)] text-5xl font-black leading-[0.98] tracking-[-0.075em] md:text-7xl lg:text-8xl">
          WHERE SHALL
          <br />
          WE <span className="text-[#b57746]">EXPLORE?</span>
        </h1>

        <p className="mt-7 max-w-xl font-[family-name:var(--font-dm-sans)] text-base leading-relaxed text-[#58705b] md:text-lg">
          Every place has a story written by the wildlife living there.
          Pick a destination and discover who calls it home.
        </p>
      </section>

      {/* Explorer workspace */}
      <section className="bio-desktop-area min-h-[650px] border-y-[3px] border-[#254d32] px-4 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Window */}
          <div className="border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[9px_9px_0_#254d32]">
            {/* Title bar */}
            <div className="flex items-center justify-between gap-3 border-b-[3px] border-[#254d32] bg-[#a8bfa0] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <GlobeHemisphereWest
                  size={21}
                  weight="duotone"
                  className="shrink-0"
                />

                <span className="truncate font-[family-name:var(--font-press-start)] text-[9px] md:text-[11px]">
                  LOCATION_FINDER.EXE
                </span>
              </div>

              <span className="shrink-0 font-[family-name:var(--font-vt323)] text-xl">
                ● ● ●
              </span>
            </div>

            {/* Window body */}
            <div className="p-5 md:p-9">
              <div className="mb-5 flex items-center gap-2">
                <MapPin size={21} weight="fill" />

                <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold tracking-tight md:text-2xl">
                  Find your next destination
                </h2>
              </div>

              <p className="mb-7 font-[family-name:var(--font-dm-sans)] text-sm text-[#58705b]">
                Search for a city, state, region, or country.
              </p>

              {/* Search */}
              <div
                ref={searchContainerRef}
                className="relative"
              >
                <div className="flex items-center border-[3px] border-[#254d32] bg-[#f5f1e6]">
                  <MagnifyingGlass
                    size={22}
                    weight="bold"
                    className="ml-4 shrink-0"
                  />

                  <input
                    type="text"
                    value={query}
                    onChange={(event) =>
                      handleQueryChange(event.target.value)
                    }
                    onFocus={() => {
                      if (
                        query.trim().length >= 2 &&
                        !selectedPlace
                      ) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    placeholder="Search a place..."
                    aria-label="Search for a location"
                    aria-expanded={isDropdownOpen}
                    aria-controls="bio-place-suggestions"
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent px-4 py-5 font-[family-name:var(--font-space-mono)] text-sm outline-none placeholder:text-[#7a927b] md:text-base"
                  />

                  {isLoading ? (
                    <SpinnerGap
                      size={21}
                      className="mr-4 shrink-0 animate-spin"
                    />
                  ) : query ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="Clear location search"
                      className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center hover:bg-[#a8bfa0]"
                    >
                      <X size={19} weight="bold" />
                    </button>
                  ) : null}
                </div>

                {/* Suggestions dropdown */}
                {isDropdownOpen &&
                  !selectedPlace &&
                  query.trim().length >= 2 && (
                    <div
                      id="bio-place-suggestions"
                      className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[5px_5px_0_#254d32]"
                    >
                      {isLoading && places.length === 0 ? (
                        <div className="flex items-center gap-3 px-5 py-5 font-[family-name:var(--font-space-mono)] text-sm">
                          <SpinnerGap
                            size={18}
                            className="animate-spin"
                          />
                          Searching the planet...
                        </div>
                      ) : places.length > 0 ? (
                        places.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            onClick={() => handleSelectPlace(place)}
                            className="flex w-full items-center gap-3 border-b border-[#b9c8af] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[#dce8d6]"
                          >
                            <MapPin
                              size={19}
                              weight="fill"
                              className="shrink-0"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block font-[family-name:var(--font-space-grotesk)] text-sm font-bold">
                                {place.name}
                              </span>

                              <span className="block truncate font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                                {place.display_name}
                              </span>
                            </span>

                            <ArrowRight
                              size={18}
                              weight="bold"
                              className="shrink-0"
                            />
                          </button>
                        ))
                      ) : !isLoading && !error ? (
                        <div className="px-5 py-5 font-[family-name:var(--font-space-mono)] text-sm">
                          No matching places found.
                        </div>
                      ) : null}
                    </div>
                  )}
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 border-2 border-[#b54738] bg-[#fff0e9] p-4 text-[#9e382b]"
                >
                  <WarningCircle
                    size={20}
                    weight="bold"
                    className="shrink-0"
                  />

                  <p className="font-[family-name:var(--font-dm-sans)] text-sm">
                    {error}
                  </p>
                </div>
              )}

              {/* Suggested locations */}
              <div className="mt-9">
                <p className="mb-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed">
                  OR TRY A DESTINATION
                </p>

                <div className="flex flex-wrap gap-3">
                  {SUGGESTED_DESTINATIONS.map((destination) => (
                    <button
                      key={destination}
                      type="button"
                      onClick={() =>
                        handleSuggestedDestination(destination)
                      }
                      className="flex items-center gap-2 border-2 border-[#254d32] bg-[#f5f1e6] px-4 py-3 font-[family-name:var(--font-space-mono)] text-sm font-bold shadow-[3px_3px_0_#254d32] transition-transform hover:-translate-y-1 hover:bg-[#a8bfa0]"
                    >
                      <MapPin size={15} weight="bold" />
                      {destination}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Exploration result */}
          <div className="mt-12 border-[3px] border-dashed border-[#254d32] bg-[#f5f1e6]/90 p-7 text-center md:p-12">
            {selectedPlace ? (
              <div className="flex flex-col items-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center border-[3px] border-[#254d32] bg-[#a8bfa0] shadow-[4px_4px_0_#254d32]">
                  <CheckCircle size={34} weight="fill" />
                </div>

                <span className="mb-4 font-[family-name:var(--font-press-start)] text-[9px]">
                  DESTINATION LOCKED IN
                </span>

                <h3 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-5xl">
                  {selectedPlace.name}
                </h3>

                <p className="mt-3 font-[family-name:var(--font-space-mono)] text-sm text-[#58705b]">
                  {selectedPlace.display_name}
                </p>

                <div className="mt-7 inline-flex items-center gap-2 border-2 border-[#254d32] bg-[#fffdf7] px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs">
                  <Leaf size={17} weight="fill" />
                  PLACE ID: {selectedPlace.id}
                </div>

                <p className="mt-7 max-w-md font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#58705b]">
                  Location selected! In the next checkpoint,
                  we'll bring the wildlife living here into view.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center border-[3px] border-[#254d32] bg-[#e7a977] shadow-[5px_5px_0_#254d32]">
                  <Binoculars size={43} weight="duotone" />
                </div>

                <span className="mb-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed">
                  A WHOLE WORLD AWAITS
                </span>

                <h3 className="max-w-lg font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-4xl">
                  Your next adventure starts here.
                </h3>

                <p className="mt-5 max-w-md font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#58705b] md:text-base">
                  Search for a place above to discover the
                  incredible wildlife that calls it home.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[3px] border-[#254d32] bg-[#254d32] px-5 py-6 text-[#f5f1e6] md:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span className="font-[family-name:var(--font-press-start)] text-[9px]">
            BIOFILES © 2026
          </span>

          <span className="font-[family-name:var(--font-vt323)] text-xl">
            Made for the curious.
          </span>
        </div>
      </footer>
    </main>
  );
}