import asyncio
import httpx

from services.wikipedia import (
    get_full_wikipedia_article,
    WIKIPEDIA_API_URL,
    HEADERS,
    REQUEST_TIMEOUT,
)


async def main():
    print("Fetching Black kite Wikipedia sections...\n")

    article = await get_full_wikipedia_article(5268)

    if not article["available"]:
        print("Wikipedia article unavailable.")
        return

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        headers=HEADERS,
    ) as client:

        response = await client.get(
            WIKIPEDIA_API_URL,
            params={
                "action": "parse",
                "page": article["title"],
                "prop": "sections",
                "format": "json",
            },
        )

        response.raise_for_status()

        data = response.json()

        if "error" in data:
            raise RuntimeError(data["error"])

        sections = data.get("parse", {}).get("sections", [])

        print(f"Article: {article['title']}")
        print(f"Total sections: {len(sections)}\n")

        for section in sections:
            level = int(section.get("toclevel", 1))
            title = section.get("line", "Untitled")
            index = section.get("index")

            indent = "  " * (level - 1)

            print(f"{indent}[{index}] {title}")


if __name__ == "__main__":
    asyncio.run(main())