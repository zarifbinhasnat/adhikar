"""Adhikar hub: local server the phone talks to over the hotspot.

Run: .venv/bin/uvicorn server.app:app --host 0.0.0.0 --port 8787
"""
import hashlib
import json
import re
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from rag import answer
from rag.cards import get_cards
from rag.retrieve import get_index

from . import packs

EVIDENCE_DIR = Path(__file__).resolve().parent / "data" / "evidence"
HOTLINES = {"emergency": "999", "legal_aid": "16430"}


@asynccontextmanager
async def lifespan(_app):
    # Load the index, embed the answer cards and pull both models into memory before the first question.
    await run_in_threadpool(get_cards)
    async with httpx.AsyncClient() as client:
        await client.post(f"{answer.OLLAMA}/api/chat", json=answer._chat([{"role": "user", "content": "hi"}], 1), timeout=120)
    yield


app = FastAPI(title="Adhikar hub", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class Question(BaseModel):
    question: str


def _event(kind, **data):
    return f"data: {json.dumps({'type': kind, **data}, ensure_ascii=False)}\n\n"


def _public(source):
    keys = ("section_id", "cite", "title", "act_name", "lang", "text", "source_url")
    return {k: source[k] for k in keys}


@app.post("/ask")
async def ask(body: Question):
    question = body.question.strip()[:500]
    if not question:
        raise HTTPException(400, "empty question")
    lang = answer.language_of(question)

    async def events():
        started = time.perf_counter()
        elapsed = lambda: round(time.perf_counter() - started, 2)
        if answer.is_emergency(question):
            yield _event("emergency", hotlines=HOTLINES, lang=lang, seconds=elapsed())
            return

        index, cards = get_index(), get_cards()
        query_vector = await run_in_threadpool(index.embed, question)
        card, score = cards.match(question, query_vector)
        if card:
            yield _event("card", id=card["id"], answer=card[lang], sources=[_public(s) for s in cards.sources(card)],
                         lang=lang, score=round(score, 3), seconds=elapsed())
            return

        async with httpx.AsyncClient() as client:
            search_text = question
            if not answer.BANGLA.search(question):
                search_text = f"{question} {await answer.to_bangla_query(question, client)}"
            sources = await run_in_threadpool(index.search, search_text, 5)
            yield _event("sources", sources=[_public(s) for s in sources], lang=lang, seconds=elapsed())

            text, first_token = "", None
            async for delta in answer.stream_answer(question, client, sources, lang):
                first_token = first_token or elapsed()
                text += delta
                yield _event("delta", text=delta)
        valid, cited = answer.check_citations(text, min(len(sources), answer.GEN_SOURCES))
        yield _event("done", valid=valid, cited=cited, first_token=first_token, seconds=elapsed(),
                     hotlines=HOTLINES)

    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/packs")
def list_packs():
    return packs.index()


@app.get("/packs/{pack_id}")
def get_pack(pack_id: str):
    if pack_id not in {p["id"] for p in packs.PACKS}:
        raise HTTPException(404, "unknown pack")
    data, digest = packs.build(pack_id)
    return Response(data, media_type="application/json; charset=utf-8", headers={"X-Content-SHA256": digest})


@app.post("/evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    id: str = Form(...),
    contentHash: str = Form(...),
    metadata: str = Form("{}"),
):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", id):
        raise HTTPException(400, "invalid id")
    folder = EVIDENCE_DIR / id
    folder.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    suffix = Path(file.filename or "").suffix[:8] or ".bin"
    with open(folder / f"original{suffix}", "wb") as out:
        while chunk := await file.read(1 << 20):
            digest.update(chunk)
            out.write(chunk)
    server_hash = digest.hexdigest()
    receipt = {
        "id": id,
        "receivedAt": datetime.now(timezone.utc).isoformat(),
        "serverHash": server_hash,
        "matches": server_hash == contentHash.lower(),
    }
    (folder / "metadata.json").write_text(json.dumps({"client": json.loads(metadata), "receipt": receipt}, indent=1))
    return receipt
