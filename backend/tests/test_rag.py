from services.rag import generate_rag_answer


SPECIES_ID = 5268

TEST_QUESTIONS = [
    "What does the black kite eat?",
    "Where are black kites found?",
    "How many eggs do black kites typically lay?",
    "How many black kites are living in New York City today?",
]


def main():

    print("\n🌿 BIOFILES RAG GENERATION TEST\n")

    for question in TEST_QUESTIONS:

        print("=" * 70)
        print(f"QUESTION: {question}")
        print("=" * 70)

        result = generate_rag_answer(
            species_id=SPECIES_ID,
            question=question,
            top_k=5,
        )

        print(f"\nAnswerable: {result['answerable']}")

        print("\nANSWER:")
        print(result["answer"])

        print("\nSOURCES:")

        if not result["sources"]:
            print("No sources.")

        for source in result["sources"]:

            print(
                f"- {source['source_name']} "
                f"→ {source['section']} "
                f"(Chunk {source['chunk_index']})"
            )

        print()

    print("✅ RAG GENERATION TEST COMPLETED!")


if __name__ == "__main__":
    main()