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

import SpeciesCard, {
  type Species,
} from "@/components/explore/SpeciesCard";

import SpeciesDossier from "@/components/explore/SpeciesDossier";

import CategoryFilters, {
  type WildlifeCategory,
} from "@/components/explore/CategoryFilters";

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

type SpeciesResponse = {
  total_results: number;
  page: number;
  per_page: number;
  species: Species[];
};

type CategoriesResponse = {
  place_id: number;
  categories: WildlifeCategory[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const PAGE_SIZE = 20;

const SUGGESTED_DESTINATIONS = [
  "Goa",
  "California",
  "Costa Rica",
];

function SpeciesCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[5px_5px_0_#254d32]"
    >
      <div className="aspect-[4/3] animate-pulse bg-[#dce8d6]" />

      <div className="space-y-4 p-5">
        <div className="h-6 w-3/4 animate-pulse bg-[#dce8d6]" />
        <div className="h-4 w-1/2 animate-pulse bg-[#e8e9dc]" />
        <div className="mt-8 h-8 w-full animate-pulse bg-[#e8e9dc]" />
      </div>
    </div>
  );
}

export default function ExplorePage() {
  // --------------------------------------------------
  // LOCATION SEARCH STATE
  // --------------------------------------------------

  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);

  const [selectedPlace, setSelectedPlace] =
    useState<Place | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [searchError, setSearchError] =
    useState<string | null>(null);

  // --------------------------------------------------
  // SPECIES DISCOVERY STATE
  // --------------------------------------------------

  const [species, setSpecies] = useState<Species[]>([]);
  const [totalSpecies, setTotalSpecies] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  const [isLoadingSpecies, setIsLoadingSpecies] =
    useState(false);

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [speciesError, setSpeciesError] =
    useState<string | null>(null);

  // --------------------------------------------------
  // CATEGORY STATE
  // --------------------------------------------------

  const [categories, setCategories] =
    useState<WildlifeCategory[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  const [isLoadingCategories, setIsLoadingCategories] =
    useState(false);

  const [categoriesError, setCategoriesError] =
    useState<string | null>(null);

  // --------------------------------------------------
  // SPECIES DOSSIER STATE
  // --------------------------------------------------

  const [selectedSpecies, setSelectedSpecies] =
    useState<Species | null>(null);

  // --------------------------------------------------
  // REFS
  // --------------------------------------------------

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const speciesRequestRef =
    useRef<AbortController | null>(null);

  const speciesRequestIdRef = useRef(0);

  const categoriesRequestRef =
    useRef<AbortController | null>(null);

  const categoriesRequestIdRef = useRef(0);

  // --------------------------------------------------
  // CLOSE AUTOCOMPLETE WHEN CLICKING OUTSIDE
  // --------------------------------------------------

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(
          event.target as Node
        )
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // --------------------------------------------------
  // LOCATION AUTOCOMPLETE
  // --------------------------------------------------

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2 || selectedPlace) {
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

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

        const data: PlaceSearchResponse =
          await response.json();

        setPlaces(data.results);
        setIsDropdownOpen(true);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Location search error:", error);

        setSearchError(
          "We couldn't search locations right now. Please try again."
        );

        setPlaces([]);
        setIsDropdownOpen(false);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedPlace]);

  // --------------------------------------------------
  // CLEAN UP REQUESTS
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      speciesRequestRef.current?.abort();
      categoriesRequestRef.current?.abort();
    };
  }, []);

  // --------------------------------------------------
  // RESET SPECIES
  // --------------------------------------------------

  function resetSpecies() {
    speciesRequestRef.current?.abort();
    speciesRequestIdRef.current += 1;

    setSpecies([]);
    setTotalSpecies(0);
    setCurrentPage(0);

    setIsLoadingSpecies(false);
    setIsLoadingMore(false);
    setSpeciesError(null);

    setSelectedSpecies(null);
  }

  // --------------------------------------------------
  // RESET CATEGORIES
  // --------------------------------------------------

  function resetCategories() {
    categoriesRequestRef.current?.abort();
    categoriesRequestIdRef.current += 1;

    setCategories([]);
    setSelectedCategory(null);
    setIsLoadingCategories(false);
    setCategoriesError(null);
  }

  // --------------------------------------------------
  // FETCH CATEGORIES
  // --------------------------------------------------

  async function fetchCategories(placeId: number) {
    categoriesRequestRef.current?.abort();

    const controller = new AbortController();
    categoriesRequestRef.current = controller;

    const requestId = ++categoriesRequestIdRef.current;

    setIsLoadingCategories(true);
    setCategoriesError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/species/categories?place_id=${placeId}`,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Category request failed.");
      }

      const data: CategoriesResponse =
        await response.json();

      if (
        controller.signal.aborted ||
        requestId !== categoriesRequestIdRef.current
      ) {
        return;
      }

      setCategories(data.categories);
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestId !== categoriesRequestIdRef.current
      ) {
        return;
      }

      console.error("Category fetch error:", error);

      setCategoriesError(
        "We couldn't discover wildlife categories right now."
      );
    } finally {
      if (
        !controller.signal.aborted &&
        requestId === categoriesRequestIdRef.current
      ) {
        setIsLoadingCategories(false);
      }
    }
  }

  // --------------------------------------------------
  // FETCH SPECIES
  // --------------------------------------------------

  async function fetchSpecies(
    placeId: number,
    page: number,
    append: boolean,
    category: string | null
  ) {
    speciesRequestRef.current?.abort();

    const controller = new AbortController();

    speciesRequestRef.current = controller;

    const requestId = ++speciesRequestIdRef.current;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingSpecies(true);
    }

    setSpeciesError(null);

    const params = new URLSearchParams({
      place_id: String(placeId),
      page: String(page),
      per_page: String(PAGE_SIZE),
    });

    if (category) {
      params.set("iconic_taxon", category);
    }

    try {
      const response = await fetch(
        `${API_URL}/api/species?${params.toString()}`,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Species request failed.");
      }

      const data: SpeciesResponse =
        await response.json();

      if (
        controller.signal.aborted ||
        requestId !== speciesRequestIdRef.current
      ) {
        return;
      }

      setSpecies((previous) =>
        append
          ? [...previous, ...data.species]
          : data.species
      );

      setTotalSpecies(data.total_results);
      setCurrentPage(page);
    } catch (error) {
      if (
        controller.signal.aborted ||
        requestId !== speciesRequestIdRef.current
      ) {
        return;
      }

      console.error("Species fetch error:", error);

      setSpeciesError(
        "We couldn't load wildlife data right now. Please try again."
      );
    } finally {
      if (
        !controller.signal.aborted &&
        requestId === speciesRequestIdRef.current
      ) {
        setIsLoadingSpecies(false);
        setIsLoadingMore(false);
      }
    }
  }

  // --------------------------------------------------
  // LOCATION HANDLERS
  // --------------------------------------------------

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelectedPlace(null);
    setPlaces([]);
    setSearchError(null);

    setIsDropdownOpen(value.trim().length >= 2);

    resetSpecies();
    resetCategories();
  }

  function handleSelectPlace(place: Place) {
    setSelectedPlace(place);

    setQuery(place.display_name || place.name);

    setPlaces([]);
    setIsDropdownOpen(false);
    setSearchError(null);

    resetSpecies();
    resetCategories();

    void fetchCategories(place.id);
    void fetchSpecies(place.id, 1, false, null);
  }

  function handleClearSearch() {
    handleQueryChange("");
    setIsDropdownOpen(false);
  }

  function handleSuggestedDestination(destination: string) {
    handleQueryChange(destination);
    setIsDropdownOpen(true);
  }

  // --------------------------------------------------
  // CATEGORY HANDLER
  // --------------------------------------------------

  function handleSelectCategory(category: string | null) {
    if (!selectedPlace || category === selectedCategory) {
      return;
    }

    setSelectedCategory(category);

    resetSpecies();

    void fetchSpecies(
      selectedPlace.id,
      1,
      false,
      category
    );
  }

  // --------------------------------------------------
  // SPECIES DOSSIER HANDLERS
  // --------------------------------------------------

  function handleOpenDossier(item: Species) {
    setSelectedSpecies(item);
  }

  function handleCloseDossier() {
    setSelectedSpecies(null);
  }

  const hasMoreSpecies = species.length < totalSpecies;

  return (
    <main className="min-h-screen bg-[#f5f1e6] text-[#254d32]">
      {/* NAVIGATION */}

      <header className="border-b-[3px] border-[#254d32] bg-[#f5f1e6]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link
            href="/"
            className="font-[family-name:var(--font-press-start)] text-sm tracking-[-0.08em] md:text-lg"
          >
            BIOFILES
            <span className="text-[#e7a977]">.</span>
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

      {/* PAGE HEADING */}

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
          WE{" "}
          <span className="text-[#b57746]">
            EXPLORE?
          </span>
        </h1>

        <p className="mt-7 max-w-xl font-[family-name:var(--font-dm-sans)] text-base leading-relaxed text-[#58705b] md:text-lg">
          Every place has a story written by the wildlife
          living there. Pick a destination and discover who
          calls it home.
        </p>
      </section>

      {/* EXPLORER WORKSPACE */}

      <section className="bio-desktop-area min-h-[650px] border-y-[3px] border-[#254d32] px-4 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-5xl">

          {/* LOCATION FINDER */}

          <div className="border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[9px_9px_0_#254d32]">
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
                      handleQueryChange(
                        event.target.value
                      )
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

                  {isSearching ? (
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

                {/* AUTOCOMPLETE */}

                {isDropdownOpen &&
                  !selectedPlace &&
                  query.trim().length >= 2 && (
                    <div
                      id="bio-place-suggestions"
                      className="absolute left-0 right-0 top-full z-20 mt-2 max-h-80 overflow-y-auto border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[5px_5px_0_#254d32]"
                    >
                      {isSearching &&
                      places.length === 0 ? (
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
                            onClick={() =>
                              handleSelectPlace(place)
                            }
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
                      ) : !isSearching &&
                        !searchError ? (
                        <div className="px-5 py-5 font-[family-name:var(--font-space-mono)] text-sm">
                          No matching places found.
                        </div>
                      ) : null}
                    </div>
                  )}
              </div>

              {searchError && (
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
                    {searchError}
                  </p>
                </div>
              )}

              {/* SUGGESTED DESTINATIONS */}

              <div className="mt-9">
                <p className="mb-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed">
                  OR TRY A DESTINATION
                </p>

                <div className="flex flex-wrap gap-3">
                  {SUGGESTED_DESTINATIONS.map(
                    (destination) => (
                      <button
                        key={destination}
                        type="button"
                        onClick={() =>
                          handleSuggestedDestination(
                            destination
                          )
                        }
                        className="flex items-center gap-2 border-2 border-[#254d32] bg-[#f5f1e6] px-4 py-3 font-[family-name:var(--font-space-mono)] text-sm font-bold shadow-[3px_3px_0_#254d32] transition-transform hover:-translate-y-1 hover:bg-[#a8bfa0]"
                      >
                        <MapPin
                          size={15}
                          weight="bold"
                        />
                        {destination}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* WILDLIFE DISCOVERY */}

          <div className="mt-12">
            {!selectedPlace ? (
              <div className="border-[3px] border-dashed border-[#254d32] bg-[#f5f1e6]/90 p-7 text-center md:p-12">
                <div className="flex flex-col items-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center border-[3px] border-[#254d32] bg-[#e7a977] shadow-[5px_5px_0_#254d32]">
                    <Binoculars
                      size={43}
                      weight="duotone"
                    />
                  </div>

                  <span className="mb-4 font-[family-name:var(--font-press-start)] text-[9px] leading-relaxed">
                    A WHOLE WORLD AWAITS
                  </span>

                  <h3 className="max-w-lg font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-4xl">
                    Your next adventure starts here.
                  </h3>

                  <p className="mt-5 max-w-md font-[family-name:var(--font-dm-sans)] text-sm leading-relaxed text-[#58705b] md:text-base">
                    Search for a place above to discover
                    the incredible wildlife that calls
                    it home.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {/* DESTINATION HEADER */}

                <div className="mb-8 border-[3px] border-[#254d32] bg-[#a8bfa0] p-6 shadow-[6px_6px_0_#254d32] md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-5">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <CheckCircle
                          size={20}
                          weight="fill"
                        />

                        <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                          DESTINATION LOCKED IN
                        </span>
                      </div>

                      <h2 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-black tracking-tight md:text-6xl">
                        {selectedPlace.name}
                      </h2>

                      <p className="mt-2 font-[family-name:var(--font-space-mono)] text-sm">
                        {selectedPlace.display_name}
                      </p>
                    </div>

                    <div className="border-2 border-[#254d32] bg-[#fffdf7] px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs font-bold">
                      PLACE ID: {selectedPlace.id}
                    </div>
                  </div>
                </div>

                {/* FIELD NOTES HEADING */}

                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Leaf
                        size={19}
                        weight="fill"
                      />

                      <span className="font-[family-name:var(--font-press-start)] text-[9px]">
                        WILDLIFE FIELD NOTES
                      </span>
                    </div>

                    <h3 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-black tracking-tight md:text-4xl">
                      Meet the locals.
                    </h3>
                  </div>

                  {!isLoadingSpecies &&
                    !speciesError && (
                      <div className="border-2 border-[#254d32] bg-[#fffdf7] px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs font-bold">
                        {totalSpecies.toLocaleString()}{" "}
                        SPECIES
                      </div>
                    )}
                </div>

                {/* CATEGORY FILTERS */}

                <CategoryFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectCategory}
                  isLoading={isLoadingCategories}
                  error={categoriesError}
                  onRetry={() =>
                    void fetchCategories(selectedPlace.id)
                  }
                />

                {/* INITIAL LOADING */}

                {isLoadingSpecies ? (
                  <div
                    role="status"
                    aria-label="Loading wildlife"
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {Array.from({
                      length: 6,
                    }).map((_, index) => (
                      <SpeciesCardSkeleton
                        key={index}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* SPECIES GRID */}

                    {species.length > 0 && (
                      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {species.map((item) => (
                          <SpeciesCard
                            key={item.id}
                            species={item}
                            onClick={() =>
                              handleOpenDossier(item)
                            }
                          />
                        ))}

                        {isLoadingMore &&
                          Array.from({
                            length: 3,
                          }).map((_, index) => (
                            <SpeciesCardSkeleton
                              key={`loading-${index}`}
                            />
                          ))}
                      </div>
                    )}

                    {/* EMPTY STATE */}

                    {species.length === 0 &&
                      !speciesError && (
                        <div className="border-[3px] border-dashed border-[#254d32] bg-[#fffdf7] p-10 text-center">
                          <Binoculars
                            size={45}
                            weight="duotone"
                            className="mx-auto mb-5"
                          />

                          <h4 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
                            No wildlife records found.
                          </h4>

                          <p className="mt-3 font-[family-name:var(--font-dm-sans)] text-sm text-[#58705b]">
                            Try exploring another location
                            or category.
                          </p>
                        </div>
                      )}

                    {/* ERROR STATE */}

                    {speciesError && (
                      <div
                        role="alert"
                        className="mt-6 border-[3px] border-[#b54738] bg-[#fff0e9] p-6 text-[#9e382b]"
                      >
                        <div className="flex items-start gap-3">
                          <WarningCircle
                            size={24}
                            weight="bold"
                            className="shrink-0"
                          />

                          <div>
                            <p className="font-[family-name:var(--font-space-grotesk)] font-bold">
                              Something went wrong.
                            </p>

                            <p className="mt-2 font-[family-name:var(--font-dm-sans)] text-sm">
                              {speciesError}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                void fetchSpecies(
                                  selectedPlace.id,
                                  currentPage === 0
                                    ? 1
                                    : currentPage + 1,
                                  currentPage > 0,
                                  selectedCategory
                                )
                              }
                              className="mt-4 border-2 border-[#9e382b] px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold hover:bg-[#f8d9cd]"
                            >
                              RETRY REQUEST
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* LOAD MORE */}

                    {species.length > 0 &&
                      hasMoreSpecies &&
                      !speciesError && (
                        <div className="mt-10 flex flex-col items-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              void fetchSpecies(
                                selectedPlace.id,
                                currentPage + 1,
                                true,
                                selectedCategory
                              )
                            }
                            disabled={isLoadingMore}
                            className="flex items-center gap-3 border-[3px] border-[#254d32] bg-[#e7a977] px-7 py-4 font-[family-name:var(--font-press-start)] text-[10px] leading-relaxed shadow-[5px_5px_0_#254d32] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoadingMore ? (
                              <SpinnerGap
                                size={19}
                                className="animate-spin"
                              />
                            ) : (
                              <Binoculars
                                size={19}
                                weight="bold"
                              />
                            )}

                            {isLoadingMore
                              ? "SEARCHING..."
                              : "DISCOVER MORE"}
                          </button>

                          <p className="font-[family-name:var(--font-space-mono)] text-xs text-[#58705b]">
                            Showing{" "}
                            {species.length.toLocaleString()}{" "}
                            of{" "}
                            {totalSpecies.toLocaleString()}{" "}
                            species
                          </p>
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}

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

      {/* SPECIES DOSSIER MODAL */}

      {selectedSpecies && selectedPlace && (
        <SpeciesDossier
          key={selectedSpecies.id}
          species={selectedSpecies}
          locationName={selectedPlace.name}
          onClose={handleCloseDossier}
        />
      )}
    </main>
  );
}