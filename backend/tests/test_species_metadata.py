import asyncio

from backend.services.species_indexer import (
    get_species_metadata,
)


async def main():

    print("\n🌿 BIOFILES SPECIES METADATA TEST\n")

    metadata = await get_species_metadata(5268)

    print(metadata)

    assert metadata["scientific_name"] == "Milvus migrans"

    print("\n✅ SPECIES METADATA TEST PASSED!")


if __name__ == "__main__":
    asyncio.run(main())