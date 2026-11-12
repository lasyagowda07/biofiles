import asyncio

from services.wikipedia import get_structured_wikipedia_article


async def main():

    print("Fetching structured Wikipedia article...\n")

    article = await get_structured_wikipedia_article(5268)

    if not article["available"]:
        print("No article available.")
        return

    print(f"Article: {article['title']}")
    print(f"Sections retrieved: {len(article['sections'])}\n")

    for section in article["sections"]:

        print(f"SECTION: {section['path']}")
        print(f"Words: {len(section['content'].split())}")
        print(f"Preview: {section['content'][:150]}")
        print("-" * 60)


if __name__ == "__main__":
    asyncio.run(main())