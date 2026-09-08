"""Adhikar hub: local server the phone talks to over the hotspot.

Run: .venv/bin/uvicorn server.app:app --host 0.0.0.0 --port 8787
"""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from . import packs

EVIDENCE_DIR = Path(__file__).resolve().parent / "data" / "evidence"

app = FastAPI(title="Adhikar hub")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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
