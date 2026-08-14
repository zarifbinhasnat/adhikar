#!/usr/bin/env python3
"""Render docs/report/report.html with live repository data and print it to PDF via headless Chrome.

Usage: python3 docs/report/build_report.py [--out ~/Downloads/Adhikar_Local_RAG_Report.pdf]
"""
import argparse
import html
import json
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

STATUS = "In progress — Day 1 of 5"
STATE_SUMMARY = (
    "Ollama is installed and the BGE-M3 embedding model is downloaded; Qwen3-8B is downloading. "
    "The statute corpus (11 acts) is fetched, parsed and committed. Corpus review, the search index, "
    "the answer API and the app's Ask screen are next. Speed and quality figures in this report are "
    "planning estimates until the Day-1 benchmark is recorded."
)

ACT_NOTES = {
    "constitution_en": "Full text; Part III (Arts. 26–47A) is the core",
    "constitution_bn": "Official Bangla; 1:1 label parity with English",
    "crpc_en": "Consolidated incl. 2026 amendment (§§46A–E, 54, 54A)",
    "police_act_en": "Police powers and duties",
    "evidence_en": "§§65A/65B digital evidence (Evidence Vault)",
    "evidence_amend_2022_en": "Inserted digital-record provisions",
    "rti_bn": "Request, response, appeal procedure",
    "ict_bn": "Recording/consent and digital-record provisions",
    "legal_aid_bn": "2026 amendment consolidation to verify",
    "women_children_bn": "2020 and 2026 amendments to verify",
    "torture_custodial_bn": "Custodial torture and death; complaint route",
}

# (id, title, status, context, options, decision, rationale, consequences)
DECISIONS = [
    ("D1", "Run all inference locally instead of through cloud APIs", "ok",
     "The earlier design (RAG_ARCHITECTURE.md) sent questions to the Claude API and embeddings to Voyage AI via a Supabase backend. The presentation's central claim is that people's legal questions, which can reveal an arrest, abuse or a dispute with the state, stay private.",
     "(a) Cloud LLM and embeddings; (b) hybrid with a cloud fallback toggle; (c) fully local on the presenter's laptop.",
     "Option (c). No component contacts an external service at question time, and the app has no cloud mode.",
     "Only (c) makes the privacy claim literally true and demonstrable. It also removes API keys, per-query cost and dependence on venue Internet. A visible cloud toggle would undercut the message.",
     "Answer quality is bounded by what an 8B model can do; this is mitigated by D14. The earlier Supabase and Edge Function templates are superseded."),
    ("D2", "Size the model to about 8B parameters at 4-bit quantisation", "ok",
     "16 GB of unified memory is shared by macOS, the GPU, the model, the embedding model and the development servers.",
     "3–4B models (fast, weaker Bangla); 7–8B at 4-bit (≈5 GB); 12–14B at 4-bit (≈7.5–9 GB).",
     "Primary model of about 8B at Q4_K_M. A 12B model is considered only as a comparison (D4).",
     "8B at 4-bit leaves about 2–3 GB headroom (Figure 2). 12B leaves too little room once BGE-M3, Metro and the KV cache are resident, risking swapping during the demonstration. 4-bit K-quant is the standard quality/size balance on Apple silicon.",
     "Long contexts are avoided: about 6 retrieved sections keeps the KV cache small."),
    ("D3", "Use Ollama, installed globally, as the model runtime", "ok",
     "A runtime must serve both a chat model and an embedding model on Apple silicon behind a simple HTTP API.",
     "Ollama; Apple MLX (mlx-lm); llama.cpp server; LM Studio.",
     "Ollama 0.40, installed with Homebrew system-wide; models in ~/.ollama so they remain available after this project.",
     "Ollama uses the Metal GPU, serves chat and embeddings from one process, streams tokens, keeps models resident (keep_alive), and pulls models by name with checksum verification. MLX can be faster but would need a hand-written streaming server. The owner asked for a global install to keep experimenting with models later.",
     "The server is started manually rather than as a login service, so after a reboot it must be restarted (brew services start ollama)."),
    ("D4", "Primary language model: Qwen3-8B; Gemma-3-12B as conditional comparison", "prov",
     "The model must read English statutes and write clear Bangla. Many open models list Bengali poorly or not at all.",
     "Qwen3-8B (Bengali among its 119 supported languages); Gemma-3-12B (strong multilingual coverage, but larger); Llama-3.1-8B (Bengali not officially supported); Aya-Expanse-8B (Bengali not among its 23 languages).",
     "Qwen3-8B as primary, with its 'thinking' mode disabled for latency. Gemma-3-12B is benchmarked only if Qwen3's Bangla is inadequate.",
     "Qwen3-8B is the strongest Bangla-capable model that fits the D2 budget comfortably. Llama and Aya are excluded on language coverage. The choice stays provisional until the Section 9 benchmark is run.",
     "If Gemma-3-12B wins, memory headroom shrinks and context must be cut further."),
    ("D5", "Embedding model: BGE-M3", "ok",
     "Questions arrive in Bangla, English or Banglish, while most older statutes exist only in English. Retrieval must work across languages.",
     "BGE-M3; multilingual-E5-large; LaBSE; hosted APIs (excluded by D1).",
     "BAAI BGE-M3 (568M parameters, 1024-dimensional), served by Ollama.",
     "BGE-M3 is among the strongest open multilingual retrievers, handles inputs up to 8k tokens (long CrPC sections fit without truncation), and maps a Bangla question and an English statute close together in vector space.",
     "About 1.2 GB of memory; embedding the whole corpus once takes a few minutes."),
    ("D6", "Reranker deferred behind a measured gate", "prov",
     "A cross-encoder reranker improves ordering, but costs memory and roughly 0.5–1 s per query on this hardware.",
     "Always rerank with bge-reranker-v2-m3; never rerank; rerank only if needed.",
     "Add the reranker only if hybrid retrieval misses the recall@6 target (Section 9).",
     "With a corpus of about 1,300 sections and hybrid retrieval, reranking may add latency without improving the answers. The decision is left to data.",
     "If it is needed, Day 2 absorbs the integration."),
    ("D7", "In-memory vector and BM25 index instead of a vector database", "ok",
     "The corpus is small: about 1,300 sections, roughly 1,300 × 1024 floats ≈ 5 MB of vectors.",
     "pgvector (earlier plan; needs Postgres); LanceDB or Chroma (embedded databases); numpy matrix plus rank_bm25 held in the API process.",
     "numpy cosine search plus rank_bm25, fused by reciprocal rank, loaded at API start-up from files on disk.",
     "At this size exact search takes about a millisecond. A database adds a process, a schema and failure modes with no benefit. Fewer moving parts means fewer ways for a live demonstration to fail. This replaces the LanceDB suggestion made at planning time.",
     "Would need revisiting beyond about 100k sections. That is far outside this project."),
    ("D8", "No fine-tuning; retrieval-augmented generation only", "ok",
     "The owner asked what needs to be trained.",
     "Full or LoRA fine-tuning on Bangladeshi law; LoRA for answer style only; no training.",
     "No training for the presentation. A style-only LoRA remains a possible later experiment.",
     "Fine-tuning on a small legal corpus does not reliably teach facts. It encourages fluent hallucination, cannot produce verifiable citations, and must be redone when the law changes, which it did in 2026. Retrieval gives citations and updates by re-ingestion. Long training runs also throttle a fanless laptop.",
     "All factual quality depends on corpus quality and retrieval (D9–D12)."),
    ("D9", "Source statutes from Wayback Machine snapshots of bdlaws", "ok",
     "bdlaws.minlaw.gov.bd, the official source, timed out from the network and the in-app browser, and the owner reported it down.",
     "Wait for the site; use unofficial third-party compilations; use Internet Archive copies of the official pages.",
     "Fetch the official pages from the Wayback Machine (raw id_ mode), recording the snapshot timestamp per act, with an option to re-fetch live when the site returns.",
     "Archived copies are byte-level copies of the official pages, so authority is preserved. Third-party compilations add transcription risk. Snapshots span December 2025 to September 2026.",
     "Four newer acts had no usable snapshot (Section 12, R2). Raw HTML is committed so the corpus can be rebuilt without either site."),
    ("D10", "Replace the earlier ingestion script", "ok",
     "The existing ingest_acts.py had never produced output.",
     "Patch the old script; write a new one.",
     "New script scripts/ingest_bdlaws.py. The old script is left in place for history.",
     "The old script had a non-existent URL pattern, four wrong act IDs (Table 6.1) and a parser written for a different page structure, so little of it was reusable.",
     "Earlier documents describing Phase 0 as complete are inaccurate. This report supersedes them."),
    ("D11", "Corpus scope prioritises police encounters and current law", "ok",
     "Five days allow only a focused corpus. The most likely questions concern arrest, detention, police conduct, information requests and legal aid.",
     "All acts in the earlier plan; a narrow set; a narrow set adjusted for legal changes.",
     "11 acts (Table 6.2), excluding repealed law: the Cyber Security Act 2023 is replaced in scope by the Cyber Protection Act 2026, and the Torture and Custodial Death (Prevention) Act 2013 is added.",
     "Citing repealed law would be actively harmful. The torture act directly serves the app's police-encounter purpose.",
     "Penal Code, Road Transport and Labour law are deferred."),
    ("D12", "Section-level units with merged sub-sections and amendment notes", "ok",
     "Legal answers are cited by section, and bdlaws splits long sections across several rows.",
     "Fixed-size token chunks; one row per chunk; one section per unit with rows merged.",
     "One section per unit. Un-numbered rows are appended to the preceding section, and amendment footnotes are kept in an amendments list rather than inline.",
     "Fixed chunks cut through provisions and break citations. Row-level units lose sub-sections: the first parser dropped the second half of CrPC §54. Amendment notes record when the text changed, for example 'substituted by Act XI of 2026', which strengthens citations.",
     "Very long sections (e.g. CrPC §167, about 5,000 characters) are split at sub-section boundaries at indexing time, each part keeping the section header."),
    ("D13", "Demonstrate on a physical iPhone with Expo Go over a hotspot", "ok",
     "The iOS Simulator needs a full Xcode install, which is absent. The owner wants to present from an iPhone.",
     "Install Xcode (tens of GB) for the Simulator; browser mobile view; real iPhone with Expo Go.",
     "Real iPhone, Expo Go, laptop connected to the phone's Personal Hotspot.",
     "A real phone is more convincing than a simulator and needs no Xcode. The hotspot avoids venue Wi-Fi client isolation.",
     "Expo Go must support SDK 54 (R6). The API address must be set to the laptop's hotspot IP."),
    ("D14", "Answer-quality strategy for a small model", "ok",
     "An 8B model will sometimes be wrong. Wrong legal information can do real harm.",
     "Trust the model; constrain it heavily; replace it entirely with search results.",
     "Layered constraints (Section 7): verified answer cards for top questions, a fixed answer template, temperature 0.1–0.2, few-shot Bangla examples, both language versions in context where available, mandatory citation validation, and verbatim statute text under every answer.",
     "Each layer removes a specific failure mode (Table 7.1). Together they make the model an explainer of retrieved law rather than a source of law.",
     "Answers are less conversational, which suits the domain."),
    ("D15", "AI-performed corpus review with stated limits", "ok",
     "The owner has no time to review legal text, and no legal professional is available before the presentation.",
     "Skip review; owner review; systematic automated and AI review.",
     "The assistant performs the review in Section 8 and documents what was checked.",
     "Mechanical checks (counts, parity, script handling) already found two parser defects that would otherwise have shipped. Their limits are explicit, and the product carries a legal-information disclaimer.",
     "Before any public release, review by a lawyer remains necessary."),
    ("D16", "Small, self-contained commits", "ok",
     "The owner asked for commits in small chunks rather than one large commit.",
     "Single commit at the end; commit per logical step.",
     "One commit per working step: scraper, corpus data, index, API, app screen, evaluation, report.",
     "Each step can be reviewed and reverted on its own, and the history doubles as a progress record for the presentation (Appendix B).",
     "Unrelated pre-existing working-tree changes (package.json, tsconfig.json) are deliberately left out of these commits."),
]

RISKS = [
    ("R1", "Qwen3-8B Bangla quality insufficient for clear answers", "Medium", "Gemma-3-12B comparison (D4); verified cards for top questions; verbatim statute always shown."),
    ("R2", "Four acts missing: CrPC Amendment 2026, Legal Aid Amendment 2026, Dowry Prohibition 2018, Cyber Protection 2026", "Certain", "CrPC amendment already consolidated. Retry Wayback when its rate limit clears and the live site with --live. Otherwise the app states these are not yet covered."),
    ("R3", "Snapshots of amended acts may not consolidate the latest amendment", "Medium", "Inspect amendment notes per key section (Section 8, check 5); flag affected sections in answers."),
    ("R4", "Thermal throttling of the fanless laptop during a long demonstration", "Medium", "Mains power, warm models, short contexts, brief pauses between questions."),
    ("R5", "Phone cannot reach the laptop on venue network", "Medium", "Personal Hotspot; tested on Day 4; recorded fallback video."),
    ("R6", "Expo Go version incompatible with SDK 54; four dependency mismatches reported by Expo", "Low–Medium", "Verify on the iPhone on Day 3; align versions with expo install --fix if needed."),
    ("R7", "Provenance timestamps missing for acts fetched before provenance tracking was added", "Certain", "Re-fetch those acts with --refresh once Wayback responds; until then marked 'unrecorded'."),
    ("R8", "Footnote text occasionally leaks into statute body", "Low", "Residue scan in review (Section 8, check 6); targeted clean-up."),
]

PROCEDURE = [
    ("Environment audit", "Hardware: Apple M4, 16 GB, 239 GB free. Found no Ollama and no full Xcode; Python, Node and Homebrew present.",
     "sysctl -n machdep.cpu.brand_string hw.memsize\ndf -h /Volumes/Projects"),
    ("Install model runtime (global)", "Ollama 0.40.7 via Homebrew. Started with flash attention and an 8-bit KV cache to reduce memory.",
     "brew install ollama\nOLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 ollama serve"),
    ("Download models", "Embedding model first (small), then the generation model.",
     "ollama pull bge-m3\nollama pull qwen3:8b"),
    ("Diagnose source outage", "bdlaws DNS resolved but TCP connections timed out on IPv4 and HTTP, while other sites loaded. Wayback availability API returned snapshots.",
     "curl -m 20 https://bdlaws.minlaw.gov.bd/   # timeout\ncurl 'https://archive.org/wayback/available?url=bdlaws.minlaw.gov.bd/act-details-367.html'"),
    ("Verify act identifiers", "Downloaded the alphabetical index (5,145 acts, gzip-compressed, UTF-16 pages), mapped titles to IDs, and found four wrong IDs in the old script.",
     ""),
    ("Build scraper", "scripts/ingest_bdlaws.py: Wayback fallback, encoding detection, row parsing, sub-section merging, both Bangla danda characters, amendment notes, provenance sidecar files.",
     "python3 -m venv .venv && .venv/bin/pip install requests beautifulsoup4\n.venv/bin/python scripts/ingest_bdlaws.py            # all acts\n.venv/bin/python scripts/ingest_bdlaws.py --refresh  # re-download"),
    ("Parser defects found and fixed", "(1) U+09F7 danda: RTI 8→37 sections, ICT 1→85. (2) Dropped continuation rows: CrPC §54 truncated; fixed by merging.",
     ""),
    ("Install retrieval and API dependencies", "numpy, rank_bm25, FastAPI, Uvicorn, httpx into the project virtual environment (not global).",
     ".venv/bin/pip install numpy rank_bm25 fastapi 'uvicorn[standard]' httpx"),
]


def esc(s):
    return html.escape(s, quote=False)


def decision_html(d):
    did, title, status, ctx, opts, dec, why, cons = d
    label = {"ok": "Adopted", "prov": "Provisional", "sup": "Superseded"}[status]
    rows = [("Context", ctx), ("Options", opts), ("Decision", dec), ("Rationale", why), ("Consequences", cons)]
    body = "".join(f"<dt>{k}</dt><dd>{esc(v)}</dd>" for k, v in rows)
    return (f'<div class="decision"><header><span class="id">{did}</span><span class="ttl">{esc(title)}</span>'
            f'<span class="pill {status}">{label}</span></header><dl class="body">{body}</dl></div>')


def corpus_rows():
    rows, n_sec = [], 0
    struct = ROOT / "corpus" / "structured"
    for f in sorted(struct.glob("*.json")):
        if f.name == "manifest.json":
            continue
        key = f.stem
        secs = json.loads(f.read_text(encoding="utf-8"))
        if not secs:
            continue
        n_sec += len(secs)
        src_file = ROOT / "corpus" / "raw" / f"{key}.source"
        src = src_file.read_text().strip() if src_file.exists() else "unrecorded"
        if src.startswith("wayback:"):
            ts = src.split(":")[1]
            src = f"Wayback {ts[:4]}-{ts[4:6]}-{ts[6:8]}"
        name = secs[0]["act_name"]
        lang = secs[0]["lang"].upper()
        cls = ' class="bn"' if lang == "BN" else ""
        rows.append(f'<tr><td{cls}>{esc(name)}</td><td class="n">{secs[0]["act_id"]}</td><td>{lang}</td>'
                    f'<td class="n">{len(secs)}</td><td>{esc(src)}</td><td>{esc(ACT_NOTES.get(key, ""))}</td></tr>')
    return "\n".join(rows), len(rows), n_sec


def commits():
    out = subprocess.run(["git", "-C", str(ROOT), "log", "--date=short", "--pretty=%h\t%ad\t%s", "-25"],
                         capture_output=True, text=True).stdout.strip().splitlines()
    return "\n".join(f'<tr><td class="mono">{h}</td><td>{d}</td><td>{esc(s)}</td></tr>'
                     for h, d, s in (l.split("\t", 2) for l in out))


def procedure():
    parts = []
    for i, (t, desc, cmd) in enumerate(PROCEDURE, 1):
        parts.append(f"<h3>A.{i} {esc(t)}</h3><p>{esc(desc)}</p>")
        if cmd:
            parts.append(f"<pre>{esc(cmd)}</pre>")
    return "\n".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / "Downloads" / "Adhikar_Local_RAG_Report.pdf"))
    args = ap.parse_args()

    rows, n_acts, n_sec = corpus_rows()
    review_file = HERE / "review_status.html"
    eval_file = HERE / "eval_results.html"
    head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    fills = {
        "FONTS": (ROOT / "node_modules" / "@expo-google-fonts").as_uri(),
        "STATUS": STATUS,
        "DATE": date.today().strftime("%d %B %Y"),
        "HEAD": head,
        "STATE_SUMMARY": esc(STATE_SUMMARY),
        "N_ACTS": str(n_acts),
        "N_SECTIONS": f"{n_sec:,}",
        "CORPUS_ROWS": rows,
        "DECISIONS": "\n".join(decision_html(d) for d in DECISIONS),
        "RISKS": "\n".join(f'<tr><td class="mono">{a}</td><td>{esc(b)}</td><td>{c}</td><td>{esc(d)}</td></tr>' for a, b, c, d in RISKS),
        "PROCEDURE": procedure(),
        "COMMITS": commits(),
        "REVIEW_STATUS": review_file.read_text(encoding="utf-8") if review_file.exists()
        else '<div class="callout ochre"><b class="t">Review status</b><p>Checks 1–3 applied during parsing (results above). Checks 4–6 in progress.</p></div>',
        "EVAL_RESULTS": eval_file.read_text(encoding="utf-8") if eval_file.exists()
        else '<div class="callout ochre"><b class="t">Results</b><p>Pending: benchmark runs after the generation model finishes downloading.</p></div>',
    }
    doc = (HERE / "report.html").read_text(encoding="utf-8")
    for k, v in fills.items():
        doc = doc.replace("{{" + k + "}}", v)
    rendered = HERE / "build" / "report.rendered.html"
    rendered.parent.mkdir(exist_ok=True)
    rendered.write_text(doc, encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    "--allow-file-access-from-files", "--virtual-time-budget=4000",
                    f"--print-to-pdf={args.out}", rendered.as_uri()], check=True, capture_output=True)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
