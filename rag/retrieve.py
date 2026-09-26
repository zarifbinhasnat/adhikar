"""Hybrid retrieval: BM25 keywords + BGE-M3 vectors, merged by reciprocal rank fusion."""
import json
import re
from functools import lru_cache
from pathlib import Path

import httpx
import numpy as np
from rank_bm25 import BM25Okapi

INDEX = Path(__file__).resolve().parent / "index"
OLLAMA = "http://localhost:11434"
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
RRF_K = 60


def tokenize(text):
    # \w would split Bangla words at vowel signs, so match the Bengali block explicitly.
    return re.findall(r"[ঀ-৥ৰ-৿]+|[a-z]+|[0-9]+[a-z]?", text.lower().translate(BN_DIGITS))


class Index:
    def __init__(self):
        self.chunks = json.loads((INDEX / "chunks.json").read_text(encoding="utf-8"))
        self.vectors = np.load(INDEX / "vectors.npy")
        self.bm25 = BM25Okapi([tokenize(f"{c['header']} {c['text']}") for c in self.chunks])
        self.http = httpx.Client(timeout=60)

    def embed(self, text):
        res = self.http.post(f"{OLLAMA}/api/embed", json={"model": "bge-m3", "input": [text], "keep_alive": "2h"})
        res.raise_for_status()
        v = np.array(res.json()["embeddings"][0], dtype=np.float32)
        return v / np.linalg.norm(v)

    def search(self, query, k=6, pool=20, query_vector=None):
        qv = self.embed(query) if query_vector is None else query_vector
        dense = np.argsort(-(self.vectors @ qv))[:pool]
        sparse = np.argsort(-self.bm25.get_scores(tokenize(query)))[:pool]
        scores = {}
        for ranking in (dense, sparse):
            for rank, idx in enumerate(ranking):
                scores[int(idx)] = scores.get(int(idx), 0.0) + 1.0 / (RRF_K + rank + 1)
        best = sorted(scores, key=scores.get, reverse=True)
        out, seen = [], set()
        for idx in best:
            c = self.chunks[idx]
            if c["id"] in seen:
                continue
            seen.add(c["id"])
            out.append({**c, "score": round(scores[idx], 5)})
            if len(out) == k:
                break
        return out


@lru_cache(maxsize=1)
def get_index():
    return Index()
