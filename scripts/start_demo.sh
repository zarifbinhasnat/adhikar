#!/usr/bin/env bash
# Starts everything the live demo needs on the laptop: Ollama, the search index, the Adhikar hub and Expo.
# Join the iPhone's Personal Hotspot first, then run: scripts/start_demo.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! curl -s localhost:11434/api/version >/dev/null; then
  OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 nohup ollama serve >/tmp/adhikar-ollama.log 2>&1 &
  until curl -s localhost:11434/api/version >/dev/null; do sleep 1; done
fi

[ -f rag/index/vectors.npy ] || .venv/bin/python rag/build_index.py

if ! curl -s localhost:8787/health >/dev/null; then
  nohup .venv/bin/uvicorn server.app:app --host 0.0.0.0 --port 8787 >/tmp/adhikar-hub.log 2>&1 &
  echo "Loading models into memory…"
  until curl -s localhost:8787/health >/dev/null; do sleep 1; done
fi

echo "Hub ready on http://$(ipconfig getifaddr en0 || echo localhost):8787"
npx expo start --lan
