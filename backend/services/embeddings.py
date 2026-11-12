import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 768

# Start with small batches to make testing easier.
EMBEDDING_BATCH_SIZE = 10


def get_embedding_client():
    """
    Create a Gemini API client.
    """

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is missing from the environment."
        )

    return genai.Client(api_key=GEMINI_API_KEY)


def generate_document_embeddings(
    texts: list[str],
) -> list[list[float]]:
    """
    Generate embeddings for document chunks.

    Returns one 768-dimensional vector per input text.

    Uses RETRIEVAL_DOCUMENT because these vectors
    will be stored and searched later.
    """

    if not texts:
        return []

    client = get_embedding_client()

    all_embeddings = []

    for start in range(
        0,
        len(texts),
        EMBEDDING_BATCH_SIZE,
    ):
        batch = texts[
            start:start + EMBEDDING_BATCH_SIZE
        ]

        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )

        if len(response.embeddings) != len(batch):
            raise RuntimeError(
                "Embedding API returned an unexpected "
                "number of vectors."
            )

        for embedding in response.embeddings:

            vector = embedding.values

            if len(vector) != EMBEDDING_DIMENSIONS:
                raise RuntimeError(
                    "Unexpected embedding dimensions."
                )

            all_embeddings.append(vector)

    return all_embeddings


def generate_query_embedding(
    query: str,
) -> list[float]:
    """
    Generate a vector for a user's question.

    Uses RETRIEVAL_QUERY rather than
    RETRIEVAL_DOCUMENT.
    """

    if not query.strip():
        raise ValueError("Query cannot be empty.")

    client = get_embedding_client()

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )

    vector = response.embeddings[0].values

    if len(vector) != EMBEDDING_DIMENSIONS:
        raise RuntimeError(
            "Unexpected query embedding dimensions."
        )

    return vector