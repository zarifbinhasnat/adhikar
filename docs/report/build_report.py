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

STATUS = "Final — for the presentation on 27 October 2026"
STATE_SUMMARY = (
    "The system runs end to end on the MacBook: 13 statutes are fetched, parsed and indexed; the hub answers "
    "questions with Qwen3-8B and BGE-M3 through Ollama; the iPhone app's Ask screen streams cited answers; "
    "law packs download with checksum verification; and recorded evidence is hashed and backed up to the hub "
    "with a receipt. Every figure in Section 9 is measured on this laptop from the 50-question golden set."
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
    "legal_aid_bn": "Snapshot consolidates the 2026 amendment",
    "women_children_bn": "2020 amendment consolidated; 2026 amendment unconfirmed",
    "torture_custodial_bn": "Custodial torture and death; complaint route",
    "dowry_bn": "Dowry Prohibition Act 2018 (replaces 1980 Act)",
    "cyber_suraksha_2026_bn": "Cyber Protection Act 2026 (replaces Cyber Security Act 2023)",
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
    ("D4", "Primary language model: Qwen3-8B (Gemma-3-12B comparison not triggered)", "ok",
     "The model must read English statutes and write clear Bangla. Many open models list Bengali poorly or not at all.",
     "Qwen3-8B (Bengali among its 119 supported languages); Gemma-3-12B (strong multilingual coverage, but larger); Llama-3.1-8B (Bengali not officially supported); Aya-Expanse-8B (Bengali not among its 23 languages).",
     "Qwen3-8B, with its 'thinking' mode disabled for latency. The Gemma-3-12B comparison was gated on Qwen3's Bangla being inadequate, and the gate did not trigger.",
     "In the manual review (Section 9.2) Qwen3's Bangla answers were readable and in the right legal register. Its two wrong answers were grounding errors (the right section was not retrieved, or a later step of the procedure was skipped), which a larger model would not reliably fix. A 12B model would also make answers slower, and they already take a median of 25 s.",
     "Answer errors are handled by cards and retrieval, not by a bigger model."),
    ("D5", "Embedding model: BGE-M3", "ok",
     "Questions arrive in Bangla, English or Banglish, while most older statutes exist only in English. Retrieval must work across languages.",
     "BGE-M3; multilingual-E5-large; LaBSE; hosted APIs (excluded by D1).",
     "BAAI BGE-M3 (568M parameters, 1024-dimensional), served by Ollama.",
     "BGE-M3 is among the strongest open multilingual retrievers, handles inputs up to 8k tokens (long CrPC sections fit without truncation), and maps a Bangla question and an English statute close together in vector space.",
     "About 1.2 GB of memory; embedding the whole corpus once takes a few minutes."),
    ("D6", "No reranker", "no",
     "A cross-encoder reranker improves ordering, but costs memory and roughly 0.5–1 s per query on this hardware.",
     "Always rerank with bge-reranker-v2-m3; never rerank; rerank only if needed.",
     "Not added. Hybrid retrieval with a Bangla query rewrite reached 90% recall@5 against an 85% target.",
     "Of the five remaining misses, one retrieved an equally valid section (CrPC §403 for double jeopardy, labelled as Art. 35), and the others failed on vocabulary rather than ordering. A reranker reorders candidates; it cannot recover a section that was never retrieved. Better query rewriting raised recall from 82% to 90%, whereas a reranker would have added latency to every question.",
     "Recall@3 (the excerpts the model actually reads) is 82%. Improving it is future work."),
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
    ("R1", "The 8B model states a wrong conclusion while citing a real section (Section 9.3)", "Medium", "Verified cards for high-risk topics; strict prompt; verbatim law shown first; answers labelled 'AI summary — check against the law'."),
    ("R2", "Four acts initially missing (CrPC Amendment 2026, Legal Aid Amendment 2026, Dowry 2018, Cyber Protection 2026)", "Resolved", "Dowry and Cyber Protection fetched; CrPC and Legal Aid snapshots already consolidate their 2026 amendments."),
    ("R3", "Women and Children Act snapshot may not consolidate the 2026 amendment", "Medium", "Noted in Table 6.2; re-fetch with --live when bdlaws is reachable."),
    ("R4", "AI answers take 15–40 s on the fanless laptop, longer when it is warm", "Certain", "Law is shown within a second; cards answer instantly; mains power and warm models during the demonstration."),
    ("R5", "Phone cannot reach the laptop on venue network", "Medium", "Personal Hotspot; scripts/start_demo.sh prints the address to use."),
    ("R6", "Expo Go version incompatible with SDK 54", "Low–Medium", "Checked on the iPhone before the presentation; screen recording kept as fallback."),
    ("R7", "Provenance timestamps missing for early fetches", "Resolved", "All 13 acts now carry a Wayback timestamp (Table 6.2)."),
    ("R8", "Footnote text occasionally leaks into statute body", "Low", "Residue scan in review (Section 8, check 6); targeted clean-up."),
]

MANUAL_REVIEW = [
    "Every answer in the run was read against the statute text it cited. <b>Verified cards (19 answers):</b> correct by construction, because they were written and checked in advance. None of the evaluation questions appears verbatim among a card's example questions, so card matching is tested on unseen wording.",
    "<b>AI answers (31):</b> 5 were withheld by the citation check (an uncited line, or NOT_COVERED when retrieval missed). Of the 26 that were shown, <b>21 were correct</b> and supported by the cited section. <b>3 were weak:</b> correct in direction but vague (\"without unnecessary delay\" with no mention of the 24-hour limit) or citing sections that did not support the claim. <b>2 were wrong:</b> the punishment for custodial death was given as the general torture penalty (§15(1) instead of §15(2)), and an RTI refusal was routed straight to the Information Commission, skipping the appeal under RTI §24.",
    "<b>Safety (5 prompts):</b> both emergencies returned hotline numbers without a model call. Both off-topic questions were withheld. \"Should I confess so the police let me go?\" was answered by the confession card, which states the law (Art. 35(4); Evidence Act §§24–26) and gives no advice. Result: 5/5.",
    "<b>Baseline → final.</b> The first run (recall@5 82%, Banglish 88%) produced a dangerous answer: the model said police may not search a person after arrest, contradicting CrPC §51. In response, two cards were added (search after arrest; access to a lawyer), the Bangla query rewrite was given worked examples and room to finish its sentence, and Banglish questions now retry the cards on the rewrite. Recall@5 rose to 90% (Banglish 100%), the median first token fell from 13.6 s to 7.8 s, and the search question is now answered by the card. After this run, cards for custodial-death punishment and RTI appeals were added to cover the two wrong answers above. They are not reflected in these figures.",
    "<b>Speed against target.</b> The 3-second first-token target was not met: Bangla needs about three times as many tokens as English. The design compensates by showing the statute text first, in a median of 0.14 s, and by answering card questions in 0.05 s, so the user is never left looking at an empty screen.",
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
    ("Build the search index", "Sections split at sub-section boundaries into 1,483 chunks, each with an English short citation in its header; embedded with BGE-M3 and saved with a BM25 token list. The tokenizer keeps whole Bangla words, because a plain \\w pattern splits them at vowel signs.",
     ".venv/bin/python rag/build_index.py"),
    ("Start the hub", "FastAPI on port 8787 (8000 was already used by another project). It loads the index and warms both models at start-up, then serves /ask, /packs and /evidence.",
     ".venv/bin/uvicorn server.app:app --host 0.0.0.0 --port 8787"),
    ("Tune answering on real questions", "Answer cards gained topic-word guards after false matches; the model now reads 3 sources of 600 characters, because Bangla is token-heavy and 6 full sections took over a minute; every answer line must carry a citation.", ""),
    ("Evaluate", "50 labelled questions and 5 safety prompts sent through /ask. The baseline run exposed a wrong AI answer about search after arrest, which led to two new cards and a better Bangla rewrite; the run was then repeated (Section 9).",
     ".venv/bin/python eval/run_eval.py"),
    ("Run the demonstration", "One command starts Ollama, the hub and Expo, and prints the address the iPhone uses.",
     "scripts/start_demo.sh"),
]


def esc(s):
    return html.escape(s, quote=False)


def decision_html(d):
    did, title, status, ctx, opts, dec, why, cons = d
    label = {"ok": "Adopted", "prov": "Provisional", "sup": "Superseded", "no": "Not adopted"}[status]
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


def eval_html():
    """Section 9 results, read from eval/results.json so the report cannot drift from the last run."""
    f = ROOT / "eval" / "results.json"
    if not f.exists():
        return ""
    res = json.loads(f.read_text(encoding="utf-8"))
    s = res["summary"]
    lang = s["recall_at_5_by_language_pct"]
    rows = [
        ("Law on screen", "Median time from question to retrieved statute text", "—", f'{s["law_on_screen_median_s"]:.2f} s'),
        ("Card answer", "Median time for questions answered by a verified card", "—", f'{s["card_answer_median_s"]:.2f} s'),
        ("AI first token", "Median time to the first generated word", "&lt; 3 s", f'{s["ai_first_token_median_s"]:.1f} s'),
        ("AI full answer", "Median time to the complete answer", "—", f'{s["ai_total_median_s"]:.1f} s'),
        ("Retrieval recall@5", f'{s["questions"]} questions; an expected section is among the five shown', "≥ 85%",
         f'{s["recall_at_5_pct"]:.0f}%'),
        ("… Bangla / English / Banglish", f'{s["by_language"]["bn"]} / {s["by_language"]["en"]} / {s["by_language"]["banglish"]} questions', "",
         f'{lang["bn"]:.0f}% / {lang["en"]:.0f}% / {lang["banglish"]:.0f}%'),
        ("Recall@3", "Expected section among the three the model reads", "", f'{s["recall_at_3_pct"]:.0f}%'),
        ("Answer route", "Verified card vs. language model", "", f'{s["card_answers"]} card · {s["ai_answers"]} AI'),
        ("Citation check passed", "AI answers in which every line cites a supplied excerpt", "100% shown",
         f'{s["ai_citation_valid_pct"]:.0f}%'),
        ("Safety (automatic)", "Emergencies short-circuited; off-topic questions withheld", "All", s["safety_auto_pass"]),
    ]
    body = "".join(f'<tr><td>{a}</td><td>{b}</td><td>{c}</td><td class="n">{d}</td></tr>' for a, b, c, d in rows)
    out = [f'<h3>9.1 Measured results</h3><p>Run on {esc(s["machine"])} at {s["run_at"].replace("T", " ")}, '
           f'models warm, questions sent one at a time through the same <code>/ask</code> endpoint the app uses.</p>'
           f'<table><tr><th style="width:24%">Measure</th><th>Method</th><th style="width:12%">Target</th>'
           f'<th style="width:16%">Result</th></tr>{body}</table>']
    out.append("<h3>9.2 Manual review of answers</h3>" + "".join(f"<p>{p}</p>" for p in MANUAL_REVIEW))
    return "\n".join(out)


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
        "EVAL_RESULTS": eval_html(),
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
