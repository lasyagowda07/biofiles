"use client";

import {
  Bird,
  Bug,
  Fish,
  Flower,
  Leaf,
  PawPrint,
  Tree,
  SpinnerGap,
  Binoculars,
} from "@phosphor-icons/react";

export type WildlifeCategory = {
  id: string;
  name: string;
  species_count: number;
};

type CategoryFiltersProps = {
  categories: WildlifeCategory[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  Animalia: "Other Animals",
  Plantae: "Plants",
  Fungi: "Fungi",
  Aves: "Birds",
  Mammalia: "Mammals",
  Reptilia: "Reptiles",
  Amphibia: "Amphibians",
  Actinopterygii: "Fish",
  Insecta: "Insects",
  Arachnida: "Arachnids",
  Mollusca: "Mollusks",
};

function getCategoryIcon(category: string) {
  switch (category) {
    case "Aves":
      return Bird;
    case "Mammalia":
      return PawPrint;
    case "Insecta":
    case "Arachnida":
      return Bug;
    case "Actinopterygii":
      return Fish;
    case "Plantae":
      return Leaf;
    case "Fungi":
      return Tree;
    case "Animalia":
      return PawPrint;
    default:
      return Flower;
  }
}

export default function CategoryFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading,
  error,
  onRetry,
}: CategoryFiltersProps) {
  return (
    <div className="mb-9 border-[3px] border-[#254d32] bg-[#fffdf7] shadow-[5px_5px_0_#254d32]">
      {/* WINDOW TITLE BAR */}

      <div className="flex items-center justify-between border-b-[3px] border-[#254d32] bg-[#dce8d6] px-4 py-3">
        <div className="flex items-center gap-2">
          <Binoculars size={19} weight="bold" />

          <span className="font-[family-name:var(--font-press-start)] text-[9px]">
            EXPLORE_BY_CATEGORY.EXE
          </span>
        </div>

        <span className="font-[family-name:var(--font-vt323)] text-xl">
          ● ● ●
        </span>
      </div>

      <div className="p-5 md:p-6">
        <p className="mb-5 font-[family-name:var(--font-dm-sans)] text-sm text-[#58705b]">
          Choose a wildlife group to explore.
        </p>

        {/* LOADING */}

        {isLoading && (
          <div
            role="status"
            className="flex items-center gap-3 font-[family-name:var(--font-space-mono)] text-sm"
          >
            <SpinnerGap size={20} className="animate-spin" />
            Discovering wildlife categories...
          </div>
        )}

        {/* ERROR */}

        {!isLoading && error && (
          <div className="flex flex-wrap items-center gap-3">
            <p
              role="alert"
              className="font-[family-name:var(--font-dm-sans)] text-sm text-[#9e382b]"
            >
              {error}
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="border-2 border-[#254d32] px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold hover:bg-[#dce8d6]"
            >
              RETRY
            </button>
          </div>
        )}

        {/* CATEGORY BUTTONS */}

        {!isLoading && !error && (
          <div className="flex flex-wrap gap-3">
            {/* ALL WILDLIFE */}

            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              aria-pressed={selectedCategory === null}
              className={`flex items-center gap-2 border-2 border-[#254d32] px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs font-bold transition-all ${
                selectedCategory === null
                  ? "bg-[#254d32] text-[#fffdf7] shadow-[3px_3px_0_#e7a977]"
                  : "bg-[#f5f1e6] text-[#254d32] hover:-translate-y-0.5 hover:bg-[#a8bfa0]"
              }`}
            >
              <Binoculars size={17} weight="bold" />
              ALL WILDLIFE
            </button>

            {/* DYNAMIC CATEGORIES */}

            {categories.map((category) => {
              const Icon = getCategoryIcon(category.id);

              const isSelected =
                selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    onSelectCategory(category.id)
                  }
                  aria-pressed={isSelected}
                  className={`flex items-center gap-2 border-2 border-[#254d32] px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-[#254d32] text-[#fffdf7] shadow-[3px_3px_0_#e7a977]"
                      : "bg-[#f5f1e6] text-[#254d32] hover:-translate-y-0.5 hover:bg-[#a8bfa0]"
                  }`}
                >
                  <Icon size={17} weight="bold" />

                  {(
                    CATEGORY_LABELS[category.id] ??
                    category.name
                  ).toUpperCase()}

                  <span
                    className={`ml-1 border px-2 py-0.5 text-[10px] ${
                      isSelected
                        ? "border-[#a8bfa0] text-[#dce8d6]"
                        : "border-[#a8bfa0] text-[#58705b]"
                    }`}
                  >
                    {category.species_count.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}