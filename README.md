# Adhikar (অধিকার)

> Know your rights, answered privately, straight from the law.

Adhikar is a mobile app that helps people in Bangladesh understand and use their legal rights, especially during a police encounter. It answers questions in Bangla, English or Banglish and quotes the official statute text behind every answer. Its AI runs entirely on a local laptop: no question, recording or answer leaves the device network.

## Features

- **Ask Adhikar.** Local AI answers with a citation on every line. The statute text is shown first, high-risk questions get pre-verified answers, and emergencies go straight to 999 and 16430.
- **Police Stop.** Your rights during an arrest under the 2026 CrPC reforms, each with its legal citation.
- **Rights Library.** Constitutional rights in plain language, alongside the official text.
- **Evidence Vault.** Record video with time and location. Each recording is sealed with a SHA-256 hash, can be verified at any time, and can be backed up to the hub, which issues a receipt.
- **Law Packs.** Download official acts for offline reading. Every pack is checked against its checksum.
- **RTI and Legal Aid.** RTI Act 2009 steps, deadlines and an application template, plus the national helplines (16430, 109, 1098, 333, 999).
- **Complaints.** Guided complaint drafting.
- **Bilingual.** Full Bangla and English interface.

## Architecture

```
iPhone / Android (Expo Go) ──LAN──▶ Laptop
                                   ├── Expo Metro :8081        app bundle
                                   ├── Adhikar hub :8787       FastAPI: /ask, /packs, /evidence
                                   ├── Search index            BM25 + BGE-M3 vectors (RRF)
                                   └── Ollama :11434           Qwen3-8B (answers), BGE-M3 (embeddings)
```

The knowledge base is 13 Bangladeshi acts (1,382 sections) parsed from bdlaws.minlaw.gov.bd. See [RAG_ARCHITECTURE.md](RAG_ARCHITECTURE.md) for the full pipeline and measured results, and `docs/report/` for the procedure and design-decision report.

## Project structure

```
adhikar/
├── App.js                 navigation (bottom tabs + native stack)
├── src/
│   ├── screens/           Home, Ask, Police Stop, Rights, Record, Evidence, Law Packs, RTI, Legal Aid, Complaint
│   ├── services/          ask, hub, law packs, evidence integrity, storage
│   ├── components/ constants/ context/ data/
├── server/                Adhikar hub (FastAPI) and law-pack definitions
├── rag/                   index builder, hybrid retrieval, answer generation, answer cards
├── corpus/                raw official pages (+ snapshot provenance) and parsed sections
├── eval/                  50-question golden set, evaluation runner, results
├── scripts/               ingest_bdlaws.py (corpus scraper), start_demo.sh
└── docs/report/           procedure report and PDF builder
```

## Getting started

**Requirements**
- Node.js 20 or newer, Python 3.11 or newer, Git, and [Ollama](https://ollama.com).
- At least 16 GB RAM for `qwen3:8b`.
- A phone with the latest **Expo Go**.
- A free Expo account.

**One-time setup**

```bash
git clone https://github.com/zarifbinhasnat/adhikar.git
cd adhikar
npm install
ollama pull qwen3:8b
ollama pull bge-m3
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npx expo login                         # sign in to Expo Go on the phone with the same account
```

**Run (macOS)**

```bash
scripts/start_demo.sh                  # starts Ollama, builds the index if missing, starts the hub and Expo
```

Scan the QR code with the phone. The phone and laptop must be on the same network; a phone hotspot works best.

**Run (Windows, PowerShell)**

```powershell
$env:PYTHONUTF8=1
.venv\Scripts\python rag\build_index.py                                  # first time only
.venv\Scripts\uvicorn server.app:app --host 0.0.0.0 --port 8787          # window 1
npx expo start --lan                                                     # window 2
```

Allow Python and Node.js through Windows Firewall on private networks.

**Evaluate**

```bash
.venv/bin/python eval/run_eval.py      # writes eval/results.json
```

## Contributions

Based on the commit history (`git log`, `git shortlog -sn`).

**Arifin Rafi** ([@arifinrafi89](https://github.com/arifinrafi89)) — Frontend
- Project scaffold, design system, navigation and the original screen layouts.
- Bangla typography and bilingual strings.
- Legal content of the app screens: Police Stop arrest rights (2026 CrPC), official Constitution text in the Rights Library, RTI steps and template, legal aid helplines.
- Offline law packs in the app (download, checksum verification, reader).
- Evidence storage in permanent app storage, with backup to the hub.
- Ask Adhikar screen with streaming answers.
- Verified answer cards for high-risk questions.
- Expo SDK 58 upgrade, expo-video player and the native-stack navigation fix.

**Md. Zarif Bin Hasnat** ([@zarifbinhasnat](https://github.com/zarifbinhasnat)) — Backend, AI and Integration
- Overall system and RAG architecture.
- Law corpus: bdlaws scraper with Wayback fallback, 13 acts with snapshot provenance, and corpus review.
- Local AI: BGE-M3 index, hybrid BM25 + vector retrieval, grounded answer generation with Qwen3-8B, citation checks, and the Bangla/Banglish query rewrite.
- Adhikar hub: streaming `/ask`, law packs and evidence upload with receipts.
- Evidence integrity: SHA-256 sealing and verification.
- Evaluation: 50-question golden set, evaluation runner and two measured runs.
- Procedure and design-decision report, and the demo start script.

## Disclaimer

Adhikar provides legal information, not legal advice. For help with a specific case, contact the National Legal Aid helpline **16430**. In an emergency, call **999**.
