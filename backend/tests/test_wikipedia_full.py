import asyncio

from services.wikipedia import get_full_wikipedia_article


async def main():
    print("Fetching full Wikipedia article...\n")

    result = await get_full_wikipedia_article(5268)

    if not result["available"]:
        print("Wikipedia article unavailable.")
        return

    content = result["content"]

    print("ARTICLE FETCH SUCCESSFUL!\n")
    print(f"Title: {result['title']}")
    print(f"Source: {result['source_url']}")
    print(f"Characters: {len(content)}")
    print(f"Words: {len(content.split())}")

    print("\nFirst 500 characters:\n")
    print(content[:500])


if __name__ == "__main__":
    asyncio.run(main())