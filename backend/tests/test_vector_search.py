from services.vector_search import search_species_chunks


SPECIES_ID = 5268

TEST_QUESTIONS = [
    "What does the black kite eat?",
    "Where are black kites found?",
    "How do black kites reproduce?",
    "What are the different subspecies of black kite?",
    "What threats affect black kites?",
]


def main():

    print("\n🌿 BIOFILES SEMANTIC SEARCH TEST\n")

    for question in TEST_QUESTIONS:

        print("=" * 70)
        print(f"QUESTION: {question}")
        print("=" * 70)

        results = search_species_chunks(
            species_id=SPECIES_ID,
            query=question,
            top_k=3,
        )

        if not results:
            print("No matching chunks found.")
            continue

        for rank, result in enumerate(results, start=1):

            print(f"\nRESULT {rank}")

            print(
                f"Section: {result['section_path']}"
            )

            print(
                f"Similarity: {result['similarity']:.4f}"
            )

            print(
                f"Chunk: {result['chunk_index']}"
            )

            print(
                f"Preview: {result['content'][:200]}"
            )

            print("-" * 50)

    print("\n✅ SEMANTIC SEARCH TEST COMPLETED!")


if __name__ == "__main__":
    main()