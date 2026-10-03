"""Pre-reviewed answers for the most common questions; matched by embedding similarity."""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from .retrieve import get_index

CARDS_FILE = Path(__file__).resolve().parent / "answer_cards.json"
MATCH_THRESHOLD = 0.85


class Cards:
    def __init__(self):
        self.index = get_index()
        self.cards = json.loads(CARDS_FILE.read_text(encoding="utf-8"))
        self.owner, vectors = [], []
        for i, card in enumerate(self.cards):
            for q in card["questions"]:
                self.owner.append(i)
                vectors.append(self.index.embed(q))
        self.vectors = np.vstack(vectors)

    def match(self, question, query_vector):
        """Similar wording is not enough ("search ... without warrant" vs "arrest ... without warrant"):
        the question must also mention every topic the card requires."""
        text = question.lower()
        sims = self.vectors @ query_vector
        for idx in np.argsort(-sims):
            score = float(sims[idx])
            if score < MATCH_THRESHOLD:
                break
            card = self.cards[self.owner[idx]]
            if all(any(word in text for word in group) for group in card.get("require", [])):
                return card, score
        return None, float(sims.max())

    def sources(self, card):
        out = []
        for sid in card["cites"]:
            parts = [c for c in self.index.chunks if c["section_id"] == sid]
            if not parts:
                raise KeyError(f"card {card['id']} cites unknown section {sid}")
            out.append({**parts[0], "text": "\n".join(p["text"] for p in parts)})
        return out


@lru_cache(maxsize=1)
def get_cards():
    return Cards()
