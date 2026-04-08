#!/usr/bin/env python3
"""Fetch word data from linku.la/jasima and convert to our words.json format.

Run from repo root:
    cd backend && uv run python app/data/scripts/fetch_linku_words.py
"""

import json
import sys
from pathlib import Path

try:
    import httpx
except ImportError:
    import subprocess

    subprocess.run([sys.executable, "-m", "pip", "install", "httpx"], check=True)
    import httpx  # type: ignore[no-redef]

LINKU_URL = "https://linku.la/jasima/data.json"
OUTPUT_PATH = Path(__file__).parent.parent / "words.json"

# Map linku.la pu_verbatim POS tags to our lowercase labels
POS_MAP: dict[str, str] = {
    "NOUN": "noun",
    "VERB": "verb",
    "ADJECTIVE": "adjective",
    "ADVERB": "adjective",  # toki pona doesn't distinguish adverbs
    "PARTICLE": "particle",
    "PRE-VERB": "pre-verb",
    "PREPOSITION": "preposition",
    "CONJUNCTION": "particle",
    "INTERJECTION": "interjection",
    "NUMBER": "number",
    "NUMERAL": "number",
    "MODIFIER": "adjective",
}

# Books to include (exclude very obscure/experimental words)
INCLUDED_BOOKS = {"pu", "ku suli", "ku lili"}

# Manual POS for ku/lili words that lack pu_verbatim.
# linku.la only provides POS via pu_verbatim for pu words; everything else
# falls back to "word" without this map.
FALLBACK_POS: dict[str, str] = {
    "Pingo": "noun",  # car
    "ali": "adjective",  # alternate form of ale (all, every)
    "apeja": "verb",  # guilt, shame; to accuse
    "epiku": "adjective",  # epic, cool, awesome
    "ete": "preposition",  # beyond, outside of
    "ewe": "noun",  # stone, rock, gravel
    "isipin": "verb",  # to think, brainstorm
    "jasima": "verb",  # reflect, mirror, resound
    "ju": "particle",  # reserved
    "kalamARR": "interjection",  # pirate noise
    "kamalawala": "noun",  # anarchy, uprising, revolt
    "kan": "preposition",  # with, among
    "kapesi": "adjective",  # brown, gray
    "ke": "interjection",  # acknowledgement / acceptance
    "kese": "adjective",  # queer, LGBT+
    "kijetesantakalu": "noun",  # raccoon / Procyonidae
    "kiki": "adjective",  # spiky, sharp, angular
    "kipisi": "verb",  # split, cut, slice
    "kokosila": "verb",  # speak a non-Toki-Pona language
    "ku": "verb",  # interact with the Toki Pona Dictionary
    "kulijo": "interjection",  # casual appreciation
    "kuntu": "noun",  # laughter, humor, comedy
    "lanpan": "verb",  # take, seize, receive
    "leko": "noun",  # block, square, stairs
    "likujo": "noun",  # collection, assortment
    "linluwi": "noun",  # network, internet
    "loka": "noun",  # limb
    "lu": "particle",  # reserved
    "majuna": "adjective",  # old, aged, ancient
    "meso": "adjective",  # middle, medium, mediocre
    "misa": "noun",  # rodent (rat, mouse, squirrel)
    "misikeke": "noun",  # medicine
    "monsuta": "noun",  # fear, monster, threat
    "mulapisu": "noun",  # pizza
    "n": "particle",  # thinking / humming particle
    "neja": "number",  # four
    "nu": "particle",  # reserved
    "oke": "interjection",  # acknowledgement / ok
    "pake": "verb",  # stop, block, prevent
    "pata": "noun",  # sibling
    "peto": "noun",  # tears, sadness
    "po": "number",  # four
    "polinpin": "noun",  # bowling pin
    "pomotolo": "adjective",  # effective, useful
    "powe": "adjective",  # false, unreal, deceptive
    "samu": "verb",  # want to create new words
    "san": "number",  # three
    "soko": "noun",  # fungus
    "soto": "adjective",  # left, port side
    "su": "verb",  # interact with Sonja's story books
    "suke": "adjective",  # (typo of sike) round, circular
    "sutopatikuna": "noun",  # platypus
    "taki": "adjective",  # sticky, magnetic
    "te": "particle",  # opens a quote
    "teje": "adjective",  # right, starboard
    "to": "particle",  # closes a quote
    "toma": "noun",  # (typo of tomo) home, room
    "tonsi": "adjective",  # non-binary, gender-non-conforming
    "tuli": "number",  # three
    "u": "particle",  # reserved
    "umesu": "verb",  # amaze via leaderboard skill
    "unu": "adjective",  # purple
    "usawi": "noun",  # magic, sorcery
    "wa": "interjection",  # awe, amazement
    "waleja": "noun",  # context, topic, relevance
    "wasoweli": "noun",  # animal (waso + soweli hybrid)
    "yupekosi": "verb",  # revise old creative work unnecessarily
}


def extract_pos(pu_verbatim_en: str) -> list[str]:
    """Extract POS list from pu_verbatim English entry.

    Format examples:
        "VERB to communicate, say, speak"
        "NOUN I, me, we, us"
        "ADJECTIVE good, positive, useful"
    """
    if not pu_verbatim_en:
        return []
    first_word = pu_verbatim_en.split()[0].upper().rstrip(",")
    # Handle compound tags like PRE-VERB
    for tag, mapped in POS_MAP.items():
        if pu_verbatim_en.upper().startswith(tag):
            return [mapped]
    mapped = POS_MAP.get(first_word)
    return [mapped] if mapped else []


def convert_word(word_name: str, data: dict) -> dict | None:
    """Convert a linku.la word entry to our WordData format."""
    book = data.get("book", "none")

    # Only include words from recognized books
    if book not in INCLUDED_BOOKS:
        return None

    def_en = (data.get("def") or {}).get("en", "").strip()
    if not def_en:
        return None

    pu_verbatim_en = (data.get("pu_verbatim") or {}).get("en", "")
    pos_list = extract_pos(pu_verbatim_en)

    # Fall back to manual map when pu_verbatim doesn't supply POS
    if not pos_list and word_name in FALLBACK_POS:
        pos_list = [FALLBACK_POS[word_name]]

    # Build definitions list
    if pos_list:
        definitions = [{"pos": pos_list[0], "definition": def_en}]
    else:
        definitions = [{"pos": "word", "definition": def_en}]
        pos_list = ["word"]

    # Extra display fields
    etymology = data.get("etymology") or None
    sitelen_pona = data.get("sitelen_pona") or None
    sitelen_emosi = data.get("sitelen_emosi") or None
    usage_category = data.get("usage_category") or None
    see_also = data.get("see_also") or None
    coined_era = data.get("coined_era") or None

    return {
        "word": word_name,
        "ku": book == "ku suli",
        "pos": pos_list,
        "definitions": definitions,
        "note": etymology,
        # Extended linku.la fields (used in word detail page)
        "sitelen_pona": sitelen_pona,
        "sitelen_emosi": sitelen_emosi,
        "usage_category": usage_category,
        "book": book,
        "see_also": see_also,
        "coined_era": coined_era,
    }


def main() -> None:
    print(f"Fetching {LINKU_URL}...")
    response = httpx.get(LINKU_URL, timeout=30)
    response.raise_for_status()
    payload = response.json()
    # API wraps words under a "data" key (alongside "languages", "credits", etc.)
    raw: dict[str, dict] = payload.get("data", payload)
    print(f"  Received {len(raw)} entries")

    words: list[dict] = []
    skipped = 0
    for word_name, data in sorted(raw.items()):
        entry = convert_word(word_name, data)
        if entry is None:
            skipped += 1
            continue
        words.append(entry)

    words.sort(key=lambda w: w["word"])

    print(f"  Converted {len(words)} words ({skipped} skipped)")
    OUTPUT_PATH.write_text(json.dumps(words, indent=2, ensure_ascii=False) + "\n")
    print(f"  Saved to {OUTPUT_PATH}")

    # Print book breakdown
    from collections import Counter

    book_counts = Counter(w["book"] for w in words)
    for book, count in sorted(book_counts.items()):
        print(f"    {book}: {count} words")


if __name__ == "__main__":
    main()
