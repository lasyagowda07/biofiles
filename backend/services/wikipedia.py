import re
from html import unescape
from urllib.parse import unquote, urlparse

import httpx
from bs4 import BeautifulSoup, Tag
from fastapi import HTTPException


INATURALIST_BASE_URL = "https://api.inaturalist.org/v1"
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"

REQUEST_TIMEOUT = 15.0

HEADERS = {
    "User-Agent": "BioFiles/0.1 (educational biodiversity explorer)",
    "Accept": "application/json",
}

EXCLUDED_SECTIONS = {
    "references",
    "further reading",
    "external links",
    "see also",
    "notes",
    "bibliography",
    "sources",
}

REMOVABLE_SELECTORS = (
    "sup.reference, "
    ".mw-editsection, "
    ".reference, "
    ".reflist, "
    ".navbox, "
    ".vertical-navbox, "
    ".metadata, "
    ".hatnote, "
    ".shortdescription, "
    ".toc, "
    ".thumb, "
    "figure, "
    "table, "
    "style, "
    "script"
)


# --------------------------------------------------
# HELPER: FETCH INATURALIST TAXON
# --------------------------------------------------

async def fetch_taxon(
    client: httpx.AsyncClient,
    taxon_id: int,
):
    """
    Retrieve species metadata from iNaturalist.
    """

    response = await client.get(
        f"{INATURALIST_BASE_URL}/taxa/{taxon_id}"
    )

    response.raise_for_status()

    results = response.json().get("results", [])

    if not results:
        raise HTTPException(
            status_code=404,
            detail="Species not found.",
        )

    return results[0]


# --------------------------------------------------
# HELPER: EXTRACT WIKIPEDIA TITLE
# --------------------------------------------------

def extract_wikipedia_title(wikipedia_url: str):
    """
    Extract an article title from a Wikipedia URL.
    """

    parsed_url = urlparse(wikipedia_url)

    return unquote(
        parsed_url.path.split("/wiki/")[-1]
    ).replace("_", " ")


# --------------------------------------------------
# HELPER: FETCH WIKIPEDIA TEXT
# --------------------------------------------------

async def fetch_wikipedia_text(
    client: httpx.AsyncClient,
    article_title: str,
    intro_only: bool = True,
):
    """
    Retrieve plain-text Wikipedia content.

    intro_only=True  -> Introduction
    intro_only=False -> Full article
    """

    params = {
        "action": "query",
        "prop": "extracts",
        "explaintext": 1,
        "redirects": 1,
        "format": "json",
        "titles": article_title,
    }

    if intro_only:
        params["exintro"] = 1

    response = await client.get(
        WIKIPEDIA_API_URL,
        params=params,
    )

    response.raise_for_status()

    pages = (
        response.json()
        .get("query", {})
        .get("pages", {})
    )

    page = next(iter(pages.values()), {})

    return {
        "title": page.get("title"),
        "text": page.get("extract"),
    }


# --------------------------------------------------
# HELPER: RESOLVE WIKIPEDIA REDIRECTS
# --------------------------------------------------

async def resolve_wikipedia_title(
    client: httpx.AsyncClient,
    article_title: str,
):
    """
    Resolve redirects before retrieving structured
    Wikipedia content.

    Example:
        Milvus migrans -> Black kite
    """

    response = await client.get(
        WIKIPEDIA_API_URL,
        params={
            "action": "query",
            "titles": article_title,
            "redirects": 1,
            "format": "json",
        },
    )

    response.raise_for_status()

    data = response.json()

    pages = data.get("query", {}).get("pages", {})

    page = next(iter(pages.values()), {})

    if not page or "missing" in page:
        raise HTTPException(
            status_code=404,
            detail="Wikipedia article not found.",
        )

    return page["title"]


# --------------------------------------------------
# HELPER: CLEAN EXTRACTED TEXT
# --------------------------------------------------

def clean_extracted_text(text: str) -> str:
    """
    Normalize whitespace while preserving readable
    sentences.
    """

    text = unescape(text)

    text = re.sub(r"\s+", " ", text)

    text = re.sub(r"\s+([,.;:!?])", r"\1", text)

    return text.strip()


# --------------------------------------------------
# HELPER: EXTRACT ARTICLE BLOCKS
# --------------------------------------------------

def extract_article_blocks(soup: BeautifulSoup):
    """
    Extract headings, paragraphs and list items in
    document order.

    Each paragraph/list item is returned once.

    This prevents parent sections from duplicating
    content belonging to their subsections.
    """

    root = soup.select_one(".mw-parser-output")

    if root is None:
        root = soup

    # Remove non-content elements.
    for element in root.select(REMOVABLE_SELECTORS):
        element.decompose()

    blocks = []

    # We only process relevant text elements.
    for element in root.find_all(
        ["h2", "h3", "h4", "h5", "h6", "p", "li"]
    ):

        # Ignore nested list items that are already
        # represented by their parent list item.
        if element.name == "li":
            if element.find_parent("li"):
                continue

        # Ignore paragraphs inside list items to
        # avoid extracting the same text twice.
        if element.name == "p":
            if element.find_parent("li"):
                continue

        # Ignore headings or paragraphs inside
        # unrelated nested components.
        if element.find_parent(
            ["table", "figure", "nav"]
        ):
            continue

        text = clean_extracted_text(
            element.get_text(" ", strip=True)
        )

        if not text:
            continue

        if element.name.startswith("h"):
            blocks.append(
                {
                    "type": "heading",
                    "level": int(element.name[1]),
                    "text": text,
                }
            )

        else:
            blocks.append(
                {
                    "type": "content",
                    "text": text,
                }
            )

    return blocks


# --------------------------------------------------
# EXISTING FUNCTION: SPECIES DOSSIER
# --------------------------------------------------

async def get_species_info(taxon_id: int):
    """
    Retrieve introductory Wikipedia information
    for the species dossier.

    Preserves existing frontend behavior.
    """

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            headers=HEADERS,
        ) as client:

            taxon = await fetch_taxon(
                client,
                taxon_id,
            )

            scientific_name = taxon.get("name")

            common_name = taxon.get(
                "preferred_common_name"
            )

            wikipedia_url = taxon.get(
                "wikipedia_url"
            )

            if not wikipedia_url:
                return {
                    "taxon_id": taxon_id,
                    "common_name": common_name,
                    "scientific_name": scientific_name,
                    "title": None,
                    "summary": None,
                    "wikipedia_url": None,
                    "available": False,
                }

            article_title = extract_wikipedia_title(
                wikipedia_url
            )

            article = await fetch_wikipedia_text(
                client,
                article_title,
                intro_only=True,
            )

            summary = article["text"]

            return {
                "taxon_id": taxon_id,
                "common_name": common_name,
                "scientific_name": scientific_name,
                "title": article["title"],
                "summary": summary,
                "wikipedia_url": wikipedia_url,
                "available": bool(summary),
            }

    except httpx.HTTPStatusError as error:

        if error.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail="Species information not found.",
            )

        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve species information.",
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to the species information service.",
        )


# --------------------------------------------------
# EXISTING FUNCTION: FULL ARTICLE FOR RAG
# --------------------------------------------------

async def get_full_wikipedia_article(taxon_id: int):
    """
    Retrieve the complete plain-text Wikipedia
    article for a species.

    Retained for compatibility and debugging.
    """

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            headers=HEADERS,
        ) as client:

            taxon = await fetch_taxon(
                client,
                taxon_id,
            )

            wikipedia_url = taxon.get(
                "wikipedia_url"
            )

            if not wikipedia_url:
                return {
                    "taxon_id": taxon_id,
                    "title": None,
                    "content": None,
                    "source_url": None,
                    "available": False,
                }

            article_title = extract_wikipedia_title(
                wikipedia_url
            )

            article = await fetch_wikipedia_text(
                client,
                article_title,
                intro_only=False,
            )

            content = article["text"]

            return {
                "taxon_id": taxon_id,
                "title": article["title"],
                "content": content,
                "source_url": wikipedia_url,
                "available": bool(content),
            }

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Wikipedia article.",
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to Wikipedia.",
        )


# --------------------------------------------------
# NEW FUNCTION: STRUCTURED ARTICLE FOR RAG
# --------------------------------------------------

async def get_structured_wikipedia_article(
    taxon_id: int,
):
    """
    Retrieve Wikipedia content organized into
    sections and subsections.

    Features:
    - Resolves redirects
    - Fetches article HTML once
    - Preserves section hierarchy
    - Extracts paragraphs and lists
    - Prevents parent/child content duplication
    - Excludes references and navigation sections

    Used by BioFiles' RAG indexing pipeline.
    """

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            headers=HEADERS,
        ) as client:

            # --------------------------------------
            # STEP 1: FETCH SPECIES METADATA
            # --------------------------------------

            taxon = await fetch_taxon(
                client,
                taxon_id,
            )

            wikipedia_url = taxon.get(
                "wikipedia_url"
            )

            if not wikipedia_url:
                return {
                    "taxon_id": taxon_id,
                    "title": None,
                    "source_url": None,
                    "sections": [],
                    "available": False,
                }

            # --------------------------------------
            # STEP 2: RESOLVE WIKIPEDIA REDIRECT
            # --------------------------------------

            article_title = extract_wikipedia_title(
                wikipedia_url
            )

            article_title = await resolve_wikipedia_title(
                client,
                article_title,
            )

            # --------------------------------------
            # STEP 3: FETCH COMPLETE ARTICLE HTML
            # --------------------------------------

            response = await client.get(
                WIKIPEDIA_API_URL,
                params={
                    "action": "parse",
                    "page": article_title,
                    "prop": "text",
                    "format": "json",
                },
            )

            response.raise_for_status()

            data = response.json()

            if "error" in data:
                raise HTTPException(
                    status_code=502,
                    detail="Unable to parse Wikipedia article.",
                )

            parsed_article = data.get("parse", {})

            html_content = (
                parsed_article
                .get("text", {})
                .get("*", "")
            )

            if not html_content:
                return {
                    "taxon_id": taxon_id,
                    "title": article_title,
                    "source_url": wikipedia_url,
                    "sections": [],
                    "available": False,
                }

            # --------------------------------------
            # STEP 4: PARSE HTML
            # --------------------------------------

            soup = BeautifulSoup(
                html_content,
                "html.parser",
            )

            blocks = extract_article_blocks(soup)

            # --------------------------------------
            # STEP 5: BUILD SECTION HIERARCHY
            # --------------------------------------

            sections = []

            current_section = {
                "title": "Introduction",
                "path": "Introduction",
                "content_blocks": [],
            }

            hierarchy = []

            excluded_level = None

            for block in blocks:

                if block["type"] == "heading":

                    level = block["level"]
                    title = block["text"]

                    # Exit excluded subtree when we
                    # encounter a heading at the same
                    # or higher level.
                    if (
                        excluded_level is not None
                        and level <= excluded_level
                    ):
                        excluded_level = None

                    # Finalize previous section.
                    if (
                        current_section is not None
                        and current_section["content_blocks"]
                    ):
                        sections.append(current_section)

                    current_section = None

                    # Maintain heading hierarchy.
                    while (
                        hierarchy
                        and hierarchy[-1]["level"] >= level
                    ):
                        hierarchy.pop()

                    hierarchy.append(
                        {
                            "level": level,
                            "title": title,
                        }
                    )

                    # Exclude reference sections
                    # and their subsections.
                    if title.lower() in EXCLUDED_SECTIONS:
                        excluded_level = level

                    if excluded_level is not None:
                        continue

                    section_path = " > ".join(
                        item["title"]
                        for item in hierarchy
                    )

                    current_section = {
                        "title": title,
                        "path": section_path,
                        "content_blocks": [],
                    }

                elif block["type"] == "content":

                    if excluded_level is not None:
                        continue

                    if current_section is None:
                        continue

                    current_section[
                        "content_blocks"
                    ].append(block["text"])

            # --------------------------------------
            # STEP 6: FINALIZE LAST SECTION
            # --------------------------------------

            if (
                current_section is not None
                and current_section["content_blocks"]
            ):
                sections.append(current_section)

            # --------------------------------------
            # STEP 7: FORMAT OUTPUT
            # --------------------------------------

            result_sections = []

            for section in sections:

                content = "\n\n".join(
                    section["content_blocks"]
                )

                if not content.strip():
                    continue

                result_sections.append(
                    {
                        "title": section["title"],
                        "path": section["path"],
                        "content": content,
                    }
                )

            return {
                "taxon_id": taxon_id,
                "title": parsed_article.get(
                    "title",
                    article_title,
                ),
                "source_url": wikipedia_url,
                "sections": result_sections,
                "available": bool(result_sections),
            }

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve Wikipedia article.",
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=502,
            detail="Unable to connect to Wikipedia.",
        )