# Adhikar  EঁE��িকার

> AI-powered legal rights companion for Bangladesh �E�E

Adhikar empowers Bangladeshi citizens to understand their legal rights through an intuitive mobile app backed by a Retrieval-Augmented Generation (RAG) system trained on actual Bangladeshi legislation.

## Features

- 📱 **React Native / Expo** mobile app with full Bangla typography support
- ⚖︁E**Rights Library**  Ebrowse rights by category with deep-link citations
- 🤁E**AI Chat**  Eask legal questions in plain Bangla or English
- 🗂�E�E**Evidence Vault**  Esecurely document incidents
- 📝 **Complaint Screen**  Eguided complaint drafting
- 🔍 **Semantic search** over legal documents via pgvector

## Architecture

```
adhikar/
├── src/
━E  ├── components/         # Reusable UI components
━E  ├── screens/            # All app screens
━E  ━E  ├── HomeScreen.js
━E  ━E  ├── RightsLibraryScreen.js
━E  ━E  ├── EvidenceVaultScreens.js
━E  ━E  ├── ComplaintScreen.js
━E  ━E  ├── LegalAidScreen.js
━E  ━E  └── ...
━E  ├── constants/          # Theme, typography, strings
━E  ├── context/            # Language context (Bangla/English)
━E  └── services/           # Storage service
├── scripts/                # Backend pipeline (Python + TypeScript)
━E  ├── ingest_acts.py      # Scrape & parse legal acts
━E  ├── embed_and_upload.py # Embeddings ↁESupabase pgvector
━E  └── supabase_edge_function_ask.ts  # RAG Q&A edge function
├── RAG_ARCHITECTURE.md
└── PHASE_0_DELIVERY.md
```

## Contribution

| Contributor | Role |
|-------------|------|
| Arifin Rafi | Frontend  EReact Native screens, navigation, design system, Bangla typography, citation UI |
| Md. Zarif Bin Hasnat | Backend  ERAG architecture, ingestion pipeline, Supabase schema, edge functions |

## Getting Started

### Mobile App
```bash
npm install
npx expo start
```

### Backend (Python ingestion)
```bash
cd scripts
pip install -r requirements.txt
python ingest_acts.py
python embed_and_upload.py
```
