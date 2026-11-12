import asyncio

from services.wikipedia import get_structured_wikipedia_article
from services.text_chunker import chunk_wikipedia_article


async def main():

    print("Fetching Wikipedia article...\n")

    article = await get_structured_wikipedia_article(5268)

    if not article["available"]:
        print("Article unavailable.")
        return

    chunks = chunk_wikipedia_article(article)

    print(f"Species: {article['title']}")
    print(f"Sections: {len(article['sections'])}")
    print(f"Total chunks: {len(chunks)}\n")

    for chunk in chunks:

        print(
            f"CHUNK {chunk['chunk_index']} "
            f"| {chunk['section_path']}"
        )

        print(
            f"Words: {len(chunk['content'].split())}"
        )

        print(
            f"Preview: {chunk['content'][:120]}"
        )

        print("-" * 60)

    # Verify chunk size limit.
    oversized = [
        chunk
        for chunk in chunks
        if len(chunk["content"].split()) > 300
    ]

    print("\nVALIDATION")

    if oversized:
        print(f"❌ {len(oversized)} chunks exceed 300 words.")
    else:
        print("✅ All chunks are within 300 words.")

    # Verify metadata.
    missing_metadata = [
        chunk
        for chunk in chunks
        if not chunk["section_path"]
        or not chunk["source_url"]
    ]

    if missing_metadata:
        print("❌ Some chunks have missing metadata.")
    else:
        print("✅ All chunks contain section metadata.")


if __name__ == "__main__":
    asyncio.run(main())