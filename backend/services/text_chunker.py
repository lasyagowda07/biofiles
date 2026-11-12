import re


TARGET_WORDS = 200
MAX_WORDS = 300


def count_words(text: str) -> int:
    return len(text.split())


def split_sentences(text: str) -> list[str]:
    """
    Split text into sentences while preserving
    punctuation.

    Lightweight sentence splitting suitable for
    our initial Wikipedia RAG pipeline.
    """

    return [
        sentence.strip()
        for sentence in re.split(
            r"(?<=[.!?])\s+(?=[A-Z0-9])",
            text.strip(),
        )
        if sentence.strip()
    ]


def split_long_text(
    text: str,
    max_words: int = MAX_WORDS,
) -> list[str]:
    """
    Split oversized text at sentence boundaries.

    Falls back to word-level splitting only when
    an individual sentence exceeds max_words.
    """

    sentences = split_sentences(text)

    pieces = []
    current = []
    current_words = 0

    for sentence in sentences:

        sentence_words = count_words(sentence)

        if sentence_words > max_words:

            if current:
                pieces.append(" ".join(current))
                current = []
                current_words = 0

            words = sentence.split()

            for i in range(0, len(words), max_words):
                pieces.append(
                    " ".join(words[i:i + max_words])
                )

            continue

        if current_words + sentence_words > max_words:

            if current:
                pieces.append(" ".join(current))

            current = [sentence]
            current_words = sentence_words

        else:
            current.append(sentence)
            current_words += sentence_words

    if current:
        pieces.append(" ".join(current))

    return pieces


def get_last_sentence(text: str) -> str:
    """
    Return the final sentence of a chunk.
    """

    sentences = split_sentences(text)

    return sentences[-1] if sentences else ""


def chunk_section(
    content: str,
    target_words: int = TARGET_WORDS,
    max_words: int = MAX_WORDS,
) -> list[str]:
    """
    Chunk one Wikipedia section.

    Strategy:
    - Preserve paragraphs
    - Combine short paragraphs
    - Split oversized paragraphs
    - Add one-sentence overlap
    - Never exceed max_words
    """

    paragraphs = [
        paragraph.strip()
        for paragraph in content.split("\n\n")
        if paragraph.strip()
    ]

    # Split oversized paragraphs into
    # sentence-aware pieces.
    pieces = []

    for paragraph in paragraphs:

        if count_words(paragraph) > max_words:
            pieces.extend(
                split_long_text(paragraph, max_words)
            )
        else:
            pieces.append(paragraph)

    # Combine pieces into chunks.
    chunks = []

    current = []
    current_words = 0

    for piece in pieces:

        piece_words = count_words(piece)

        if (
            current
            and current_words + piece_words > target_words
        ):
            chunks.append("\n\n".join(current))

            current = [piece]
            current_words = piece_words

        else:
            current.append(piece)
            current_words += piece_words

    if current:
        chunks.append("\n\n".join(current))

    # Apply one-sentence overlap.
    overlapped_chunks = []

    for index, chunk in enumerate(chunks):

        if index == 0:
            overlapped_chunks.append(chunk)
            continue

        previous_chunk = chunks[index - 1]

        overlap = get_last_sentence(previous_chunk)

        if not overlap:
            overlapped_chunks.append(chunk)
            continue

        overlap_words = count_words(overlap)

        if overlap_words + count_words(chunk) <= max_words:

            overlapped_chunks.append(
                overlap + "\n\n" + chunk
            )

        else:
            overlapped_chunks.append(chunk)

    return overlapped_chunks


def chunk_wikipedia_article(article: dict) -> list[dict]:
    """
    Convert a structured Wikipedia article into
    chunks with metadata.

    Each chunk contains:
    - species_id
    - article_title
    - section_title
    - section_path
    - chunk_index
    - content
    - embedding_text
    - source_name
    - source_url
    """

    chunks = []

    for section in article.get("sections", []):

        section_chunks = chunk_section(
            section["content"]
        )

        for chunk in section_chunks:

            embedding_text = (
                f"Species: {article['title']}\n"
                f"Section: {section['path']}\n\n"
                f"{chunk}"
            )

            chunks.append(
                {
                    "species_id": article["taxon_id"],
                    "article_title": article["title"],
                    "section_title": section["title"],
                    "section_path": section["path"],
                    "chunk_index": len(chunks),
                    "content": chunk,
                    "embedding_text": embedding_text,
                    "source_name": "Wikipedia",
                    "source_url": article["source_url"],
                }
            )

    return chunks