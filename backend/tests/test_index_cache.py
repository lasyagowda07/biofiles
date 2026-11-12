from datetime import datetime, timedelta, timezone

from backend.database import get_db_connection
from backend.services.species_indexer import (
    get_species_index_info,
    is_species_cache_fresh,
)


SPECIES_ID = 5268


def main():

    print("\n🌿 BIOFILES INDEX CACHE TEST\n")

    info = get_species_index_info(SPECIES_ID)

    print("Index information:", info)

    assert info is not None
    assert info["status"] == "ready"

    fresh = is_species_cache_fresh(SPECIES_ID)

    print("Cache fresh:", fresh)

    assert fresh is True

    print("\n✅ CACHE TEST PASSED!")


if __name__ == "__main__":
    main()