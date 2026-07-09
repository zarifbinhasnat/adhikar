#!/usr/bin/env python3
"""
Phase 0 (cont'd): Embedding and Supabase ingestion for knowledge base chunks.
Reads JSONL from ingest_acts.py, computes embeddings, and uploads to Supabase.

Usage:
  export SUPABASE_URL="https://xxx.supabase.co"
  export SUPABASE_KEY="eyJxxx"
  export VOYAGE_API_KEY="pa-xxx"
  python3 embed_and_upload.py --input kb/constitution_sections.jsonl --model voyage-3
"""

import sys
import json
import argparse
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import time

try:
    import requests
    from supabase import create_client, Client
except ImportError:
    print("Install dependencies: pip install requests supabase")
    sys.exit(1)


@dataclass
class EmbeddingConfig:
    """Configuration for embedding models."""

    model_name: str
    provider: str  # 'voyage', 'cohere', 'openai'
    api_key: str
    embed_dim: int
    rate_limit: float = 1.0  # requests per second


EMBEDDING_MODELS = {
    "voyage-3": EmbeddingConfig(
        model_name="voyage-3",
        provider="voyage",
        api_key=os.getenv("VOYAGE_API_KEY", ""),
        embed_dim=1024,
        rate_limit=5.0,
    ),
    "voyage-lite": EmbeddingConfig(
        model_name="voyage-lite-02-instruct",
        provider="voyage",
        api_key=os.getenv("VOYAGE_API_KEY", ""),
        embed_dim=384,
        rate_limit=5.0,
    ),
    "bge-m3": EmbeddingConfig(
        model_name="BAAI/bge-m3",
        provider="huggingface",
        api_key=os.getenv("HF_API_KEY", ""),
        embed_dim=1024,
        rate_limit=2.0,
    ),
}


class Embedder:
    """Computes embeddings for text chunks."""

    def __init__(self, config: EmbeddingConfig):
        self.config = config
        self.session = requests.Session()
        self.last_request_time = 0

    def _rate_limit(self):
        """Enforce rate limiting."""
        elapsed = time.time() - self.last_request_time
        wait_time = (1.0 / self.config.rate_limit) - elapsed
        if wait_time > 0:
            time.sleep(wait_time)
        self.last_request_time = time.time()

    def embed_voyage(self, texts: List[str]) -> List[List[float]]:
        """Call Voyage AI embedding API."""
        self._rate_limit()
        url = "https://api.voyageai.com/v1/embeddings"
        headers = {"Authorization": f"Bearer {self.config.api_key}"}
        payload = {
            "model": self.config.model_name,
            "input": texts,
            "input_type": "document",
        }
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            # Sort by index to ensure order matches input
            embeddings = sorted(data["data"], key=lambda x: x["index"])
            return [e["embedding"] for e in embeddings]
        except Exception as e:
            print(f"❌ Voyage embedding error: {e}")
            return []

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts."""
        if self.config.provider == "voyage":
            return self.embed_voyage(texts)
        else:
            print(f"⚠️  Provider {self.config.provider} not yet implemented")
            return []


class SupabaseUploader:
    """Uploads embedded chunks to Supabase Postgres."""

    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)
        self.table_name = "kb_chunks"

    def create_table_if_needed(self):
        """Create the kb_chunks table with pgvector column if it doesn't exist."""
        # This would run raw SQL to create the table.
        # In practice, you'd use Supabase dashboard or a migration.
        # For now, we'll document the schema:
        schema = """
        CREATE TABLE IF NOT EXISTS kb_chunks (
            id TEXT PRIMARY KEY,
            act_name_en TEXT NOT NULL,
            act_name_bn TEXT,
            section_label TEXT NOT NULL,
            section_num TEXT,
            section_text_en TEXT NOT NULL,
            section_text_bn TEXT,
            embedding VECTOR(1024),  -- Voyage-3 dim; adjust for other models
            metadata JSONB,
            chunk_hash TEXT,
            source_url TEXT,
            last_verified TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX idx_kb_chunks_act_name ON kb_chunks(act_name_en);
        CREATE INDEX idx_kb_chunks_section_num ON kb_chunks(section_num);
        CREATE INDEX idx_kb_chunks_embedding ON kb_chunks USING ivfflat (embedding vector_cosine_ops);
        """
        print("Schema needed (run in Supabase SQL editor):\n" + schema)

    def upsert_chunks(self, chunks: List[Dict[str, Any]]) -> bool:
        """Upload chunks to kb_chunks table."""
        if not chunks:
            return True

        try:
            # In a real implementation, batch these inserts
            for chunk in chunks:
                record = {
                    "id": chunk["id"],
                    "section_label": chunk["metadata"]["section_label"],
                    "section_num": chunk["metadata"]["section_num"],
                    "act_name_en": chunk["metadata"]["act_name_en"],
                    "act_name_bn": chunk["metadata"]["act_name_bn"],
                    "section_text_en": chunk["text"],
                    "embedding": chunk.get("embedding"),
                    "metadata": chunk["metadata"],
                    "chunk_hash": chunk["metadata"]["chunk_hash"],
                    "source_url": chunk["metadata"]["source_url"],
                    "last_verified": chunk["metadata"]["last_verified"],
                }
                self.client.table(self.table_name).upsert(record).execute()
                print(f"  ✓ Upserted {chunk['id'][:8]}...")

            print(f"✓ Uploaded {len(chunks)} chunks")
            return True
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(
        description="Embed and upload KB chunks to Supabase"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Input JSONL file (from ingest_acts.py)"
    )
    parser.add_argument(
        "--model",
        default="voyage-3",
        choices=list(EMBEDDING_MODELS.keys()),
        help="Embedding model to use"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Batch size for embedding (default: 50)"
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload to Supabase (requires SUPABASE_URL, SUPABASE_KEY env vars)"
    )

    args = parser.parse_args()

    # Load input JSONL
    input_file = Path(args.input)
    if not input_file.exists():
        print(f"❌ Input file not found: {args.input}")
        sys.exit(1)

    print(f"📖 Loading chunks from {args.input}...")
    chunks = []
    with open(input_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                chunks.append(json.loads(line))
    print(f"  ✓ Loaded {len(chunks)} chunks")

    # Initialize embedder
    config = EMBEDDING_MODELS[args.model]
    if not config.api_key:
        print(f"❌ {args.model.upper()}_API_KEY not set in environment")
        sys.exit(1)

    embedder = Embedder(config)

    # Embed in batches
    print(f"\n🔢 Computing {args.model} embeddings...")
    for i in range(0, len(chunks), args.batch_size):
        batch = chunks[i:i + args.batch_size]
        texts = [c["text"] for c in batch]
        embeddings = embedder.embed_batch(texts)
        if embeddings:
            for chunk, emb in zip(batch, embeddings):
                chunk["embedding"] = emb
            print(f"  ✓ Embedded batch {i//args.batch_size + 1}")

    # Upload to Supabase if requested
    if args.upload:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            print("❌ SUPABASE_URL or SUPABASE_KEY not set")
            sys.exit(1)

        print(f"\n☁️  Uploading to Supabase...")
        uploader = SupabaseUploader(supabase_url, supabase_key)
        uploader.create_table_if_needed()
        uploader.upsert_chunks(chunks)
    else:
        # Write embedded chunks to local file for review
        output_file = input_file.with_suffix(".embedded.jsonl")
        with open(output_file, "w", encoding="utf-8") as f:
            for chunk in chunks:
                f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
        print(f"\n✓ Wrote embedded chunks to {output_file}")
        print(f"  To upload, run: python3 embed_and_upload.py --input {output_file} --upload")

    print("\n✅ Done!")


if __name__ == "__main__":
    main()
