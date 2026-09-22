#!/usr/bin/env python3
"""Chunk the statute corpus and embed it with BGE-M3 (via Ollama) into rag/index/.

Usage: .venv/bin/python rag/build_index.py
"""
import json
import re
import time
from pathlib import Path

import httpx
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "corpus" / "structured"
OUT = ROOT / "rag" / "index"
OLLAMA = "http://localhost:11434"
EMBED_MODEL = "bge-m3"
MAX_CHARS = 1800  # long sections are split at sub-section boundaries

SHORT_NAMES = {
    "constitution_en": "Constitution", "constitution_bn": "সংবিধান", "crpc_en": "CrPC",
    "police_act_en": "Police Act", "evidence_en": "Evidence Act", "evidence_amend_2022_en": "Evidence (Amendment) Act 2022",
    "rti_bn": "RTI Act", "ict_bn": "ICT Act", "legal_aid_bn": "Legal Aid Act",
    "women_children_bn": "Women & Children Act", "torture_custodial_bn": "Torture & Custodial Death Act",
    "dowry_bn": "Dowry Prohibition Act", "cyber_suraksha_2026_bn": "Cyber Protection Act 2026",
}


def citation(key, label):
    word = "Art." if key.startswith("constitution") else "§"
    return f"{SHORT_NAMES[key]} {word}{'' if word == '§' else ' '}{label}"


def split_long(text):
    if len(text) <= MAX_CHARS:
        return [text]
    parts, cur = [], ""
    for line in text.split("\n"):
        if cur and len(cur) + len(line) > MAX_CHARS and re.match(r"^\(?[0-9০-৯a-zক-হ]+\)", line):
            parts.append(cur.strip())
            cur = ""
        cur += line + "\n"
    if cur.strip():
        parts.append(cur.strip())
    return parts


def chunks():
    for path in sorted(CORPUS.glob("*.json")):
        if path.name == "manifest.json" or path.stem not in SHORT_NAMES:
            continue
        for s in json.loads(path.read_text(encoding="utf-8")):
            if s["repealed"]:
                continue
            pieces = split_long(s["text"])
            for i, piece in enumerate(pieces):
                header = f"[{s['act_name']} › {s['part']} › {s['section_label']} — {s['title']}]".replace(" ›  ›", " ›")
                yield {
                    "id": f"{s['id']}#{i}" if len(pieces) > 1 else s["id"],
                    "section_id": s["id"],
                    "act_key": s["act_key"],
                    "act_name": s["act_name"],
                    "lang": s["lang"],
                    "label": s["section_label"],
                    "title": s["title"],
                    "cite": citation(s["act_key"], s["section_label"]),
                    "source_url": s["source_url"],
                    "header": header,
                    "text": piece,
                }


def embed(texts, client):
    res = client.post(f"{OLLAMA}/api/embed", json={"model": EMBED_MODEL, "input": texts}, timeout=600)
    res.raise_for_status()
    vecs = np.array(res.json()["embeddings"], dtype=np.float32)
    return vecs / np.linalg.norm(vecs, axis=1, keepdims=True)


def main():
    items = list(chunks())
    OUT.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    vecs = []
    with httpx.Client() as client:
        for i in range(0, len(items), 32):
            batch = items[i:i + 32]
            vecs.append(embed([f"{c['header']}\n{c['text']}"[:6000] for c in batch], client))
            print(f"embedded {i + len(batch)}/{len(items)}", flush=True)
    np.save(OUT / "vectors.npy", np.vstack(vecs))
    (OUT / "chunks.json").write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    print(f"{len(items)} chunks in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
