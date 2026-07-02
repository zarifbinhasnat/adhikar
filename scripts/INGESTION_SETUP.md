# Phase 0: Knowledge Base Ingestion Setup

This directory contains scripts to scrape acts from bdlaws.minlaw.gov.bd, parse them into structured sections, compute embeddings, and upload to Supabase for the RAG system.

## Prerequisites

- Python 3.9+
- Internet access to bdlaws.minlaw.gov.bd
- (Optional) Supabase account with project created
- (Optional) Voyage AI API key (for embeddings)

## Installation

### 1. Create a Python virtual environment

```bash
cd scripts
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

## Workflow

### Step 1: Scrape acts from bdlaws

The `ingest_acts.py` script fetches acts from bdlaws.minlaw.gov.bd, parses the HTML, and extracts sections into JSON format.

**Default (Constitution and CrPC):**
```bash
python3 ingest_acts.py
```

**All P0–P1 acts (takes ~15 seconds):**
```bash
python3 ingest_acts.py --acts constitution crc evidence ict police rti
```

**Custom output directory:**
```bash
python3 ingest_acts.py --acts constitution crc --output ../kb_data/
```

**Adjust rate limiting (slower for stability):**
```bash
python3 ingest_acts.py --rate-limit 3.0
```

**Output:**
- `kb/constitution_sections.jsonl` — One JSON object per line; ready for embedding
- `kb/constitution_sections.json` — Same, as a single array (for manual review)
- `kb/manifest.json` — Record of what was ingested and when

### Step 2: Compute embeddings

The `embed_and_upload.py` script reads JSONL chunks and adds embeddings.

**Without uploading (local review first):**
```bash
python3 embed_and_upload.py --input kb/constitution_sections.jsonl --model voyage-3
```

This outputs `kb/constitution_sections.embedded.jsonl` with embedding vectors added.

**Set your API key first:**
```bash
export VOYAGE_API_KEY="pa-xxx..."  # Get from https://dash.voyageai.com/
python3 embed_and_upload.py --input kb/constitution_sections.jsonl --model voyage-3
```

**Supported models:**
- `voyage-3` — 1024-dim, multilingual, excellent for legal text (recommended)
- `voyage-lite` — 384-dim, faster, lower cost
- `bge-m3` — 1024-dim, open-source multilingual

### Step 3: Set up Supabase

1. **Create a Supabase project** (https://supabase.com)
2. **Go to SQL Editor** and run this schema:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create kb_chunks table
CREATE TABLE kb_chunks (
    id TEXT PRIMARY KEY,
    act_name_en TEXT NOT NULL,
    act_name_bn TEXT,
    section_label TEXT NOT NULL,
    section_num TEXT,
    section_text_en TEXT NOT NULL,
    section_text_bn TEXT,
    embedding VECTOR(1024),
    metadata JSONB,
    chunk_hash TEXT,
    source_url TEXT,
    last_verified TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_kb_chunks_act_name ON kb_chunks(act_name_en);
CREATE INDEX idx_kb_chunks_section_num ON kb_chunks(section_num);
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_kb_chunks_metadata ON kb_chunks USING GIN (metadata);

-- For full-text search (optional, Phase 2)
CREATE INDEX idx_kb_chunks_text_en ON kb_chunks USING GIN (to_tsvector('english', section_text_en));
CREATE INDEX idx_kb_chunks_text_bn ON kb_chunks USING GIN (to_tsvector('simple', section_text_bn));
```

3. **Get your credentials:**
   - Project URL: Settings → API → Project URL
   - Anon Key: Settings → API → Project API Keys → `anon` key

### Step 4: Upload to Supabase

Set environment variables:

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_KEY="eyJxxx..."
export VOYAGE_API_KEY="pa-xxx..."
```

Then upload:

```bash
python3 embed_and_upload.py --input kb/constitution_sections.jsonl --model voyage-3 --upload
```

Or create a `.env` file in the `scripts/` directory:

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx...
VOYAGE_API_KEY=pa-xxx...
```

Then:

```bash
source .env
python3 embed_and_upload.py --input kb/constitution_sections.jsonl --model voyage-3 --upload
```

## Ingestion Status

### Currently Working

| Act | P-Code | Status | Notes |
|---|---|---|---|
| Constitution | 367 | ✓ Scraping works | Articles 26–44 (Fundamental Rights) |
| CrPC 1898 | 75 | ✓ Scraping works | Arrest, detention, trial procedures |
| Evidence Act 1872 | 40 | ✓ Scraping works | §65B digital records (critical for Evidence Vault) |
| ICT Act 2006 | 273 | ✓ Scraping works | §63 recording consent (critical for recording feature) |
| Police Act 1861 | 61 | ✓ Scraping works | Police stop, search powers |
| RTI Act 2009 | 1011 | ✓ Scraping works | RTI filing and appeals |

### Known Issues & Workarounds

**Issue: HTML parsing varies by act**

The bdlaws website uses inconsistent HTML structures for different acts. The `parse_sections()` method in `ingest_acts.py` is a heuristic. For acts with unusual formatting:

1. First, run the scraper and inspect the output JSON
2. If sections are missing or garbled, adjust the regex in `parse_sections()` to match the specific act's structure
3. Alternatively, manually review `kb/constitution_sections.json` and edit subsections as needed

**Issue: Bangla text missing**

bdlaws stores Bangla and English in separate divs or tabs. Currently, the parser only captures English text. To capture Bangla:

1. Open the act URL in a browser: https://bdlaws.minlaw.gov.bd/act-detail/type/law/id/367
2. Check if there's a Bangla version button or tab
3. If so, modify the scraper to fetch both versions in separate requests

**Issue: Rate limiting / IP blocking**

If you hit 403 or 429 errors:

1. Increase `--rate-limit` to 5.0 or 10.0
2. Spread requests across multiple sessions
3. Use a residential proxy if available

## Chunk Format

Each chunk in the output JSONL looks like:

```json
{
  "id": "a1b2c3d4",
  "text": "## Article 27\n\nEquality before law...",
  "metadata": {
    "section_label": "Article 27",
    "section_num": "27",
    "act_name_en": "Constitution of Bangladesh",
    "act_name_bn": "বাংলাদেশের সংবিধান",
    "act_year": 1972,
    "source_url": "https://bdlaws.minlaw.gov.bd/act-detail/type/law/id/367",
    "last_verified": "15 Jul 2026",
    "chunk_hash": "a1b2c3d4"
  }
}
```

## Cost & Performance

- **Scraping:** ~500–1000 requests to bdlaws; ~30 seconds total
- **Embedding (Voyage-3):** ~$0.002 per 1M tokens; ~6 acts × 200 sections × 100 tokens ≈ 120K tokens ≈ $0.00024
- **Storage (Supabase):** ~1 GB free tier; KB will use ~10 MB
- **Retrieval latency:** Vector search on Supabase ≈50–200ms

## Next Steps (Phase 1)

Once ingestion is complete:

1. Create a Supabase Edge Function (`/ask`) that accepts a query and returns cited answers
2. Add an "Ask" tab to the React Native app
3. Implement streaming SSE for real-time answer generation
4. Add citation deep-links to the source acts in the app

See `RAG_ARCHITECTURE.md` for the full roadmap.
