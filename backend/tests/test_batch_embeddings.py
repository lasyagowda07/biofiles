import asyncio

from services.wikipedia import get_structured_wikipedia_article
from services.text_chunker import chunk_wikipedia_article
from services.embeddings import generate_document_embeddings


async def main():

    print("Fetching structured Wikipedia article...")

    article = await get_structured_wikipedia_article(5268)

    if not article["available"]:
        print("Wikipedia article unavailable.")
        return

    chunks = chunk_wikipedia_article(article)

    print(f"Species: {article['title']}")
    print(f"Chunks generated: {len(chunks)}")

    embedding_texts = [
        chunk["embedding_text"]
        for chunk in chunks
    ]

    print("\nGenerating Gemini embeddings...")

    embeddings = generate_document_embeddings(
        embedding_texts
    )

    print(f"\nEmbeddings generated: {len(embeddings)}")

    dimensions = {
        len(vector)
        for vector in embeddings
    }

    print(f"Vector dimensions: {dimensions}")

    assert len(embeddings) == len(chunks)
    assert dimensions == {768}

    print("\n✅ BATCH EMBEDDING TEST PASSED!")


if __name__ == "__main__":
    asyncio.run(main())