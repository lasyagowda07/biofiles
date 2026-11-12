// --------------------------------------------------
// TYPES
// --------------------------------------------------

// Response from the species indexing endpoint.
export type SpeciesIndexResult = {
  species_id: number;
  status: "ready" | "indexing" | "failed";
  skipped?: boolean;
  chunks_stored?: number;
  message?: string;
};

// Wikipedia source supporting an AI answer.
export type SpeciesAISource = {
  chunk_index: number;
  section: string;
  source_name: string;
  url: string;
};

// Response from the species RAG endpoint.
export type SpeciesAIAnswer = {
  species_id: number;
  question: string;
  answer: string;
  answerable: boolean;
  sources: SpeciesAISource[];
};

// --------------------------------------------------
// CONFIGURATION
// --------------------------------------------------

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

// --------------------------------------------------
// PREPARE SPECIES AI
// --------------------------------------------------

export async function prepareSpeciesAI(
  speciesId: number
): Promise<SpeciesIndexResult> {
  const response = await fetch(
    `${API_URL}/api/species/${speciesId}/index`,
    {
      method: "POST",
    }
  );

  const data: SpeciesIndexResult = await response.json();

  if (response.status === 409) {
    return data;
  }

  if (!response.ok) {
    throw new Error(
      "Unable to prepare species knowledge. Please try again."
    );
  }

  return data;
}

// --------------------------------------------------
// ASK SPECIES AI
// --------------------------------------------------

export async function askSpeciesAI(
  speciesId: number,
  question: string
): Promise<SpeciesAIAnswer> {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Please enter a question.");
  }

  const response = await fetch(
    `${API_URL}/api/species/${speciesId}/ask`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        question: trimmedQuestion,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Unable to get an AI response. Please try again."
    );
  }

  const data: SpeciesAIAnswer = await response.json();

  return data;
}