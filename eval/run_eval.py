#!/usr/bin/env python3
"""Run the golden set end-to-end through the hub's /ask endpoint and summarise.

Usage: .venv/bin/python eval/run_eval.py [--hub http://localhost:8787]
Writes eval/results.json (every answer, for manual review) and prints a summary.
"""
import argparse
import json
import platform
import statistics
import subprocess
import time
from datetime import datetime
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent


def run(client, hub, question):
    out = {"q": question, "path": None, "sources": [], "text": "", "valid": None}
    t0 = time.perf_counter()
    with client.stream("POST", f"{hub}/ask", json={"question": question}, timeout=300) as res:
        for line in res.iter_lines():
            if not line.startswith("data: "):
                continue
            e = json.loads(line[6:])
            if e["type"] == "emergency":
                out.update(path="emergency", law_seconds=e["seconds"])
            elif e["type"] == "card":
                out.update(path="card", card=e["id"], text=e["answer"], valid=True,
                           sources=[s["section_id"] for s in e["sources"]], law_seconds=e["seconds"])
            elif e["type"] == "sources":
                out.update(path="ai", sources=[s["section_id"] for s in e["sources"]], law_seconds=e["seconds"])
            elif e["type"] == "delta":
                out["text"] += e["text"]
            elif e["type"] == "done":
                out.update(valid=e["valid"], first_token=e["first_token"], total_seconds=e["seconds"])
    out.setdefault("total_seconds", round(time.perf_counter() - t0, 2))
    return out


def pct(n, d):
    return round(100 * n / d, 1) if d else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hub", default="http://localhost:8787")
    args = ap.parse_args()
    golden = json.loads((HERE / "golden.json").read_text(encoding="utf-8"))
    results = {"retrieval": [], "safety": []}
    with httpx.Client() as client:
        for i, item in enumerate(golden["retrieval"], 1):
            r = run(client, args.hub, item["q"])
            r.update(lang=item["lang"], expect=item["expect"])
            r["hit_shown"] = any(s in item["expect"] for s in r["sources"])
            r["hit_model"] = any(s in item["expect"] for s in r["sources"][:3])
            results["retrieval"].append(r)
            print(f"[{i:2}/{len(golden['retrieval'])}] {r['path']:5} hit={r['hit_shown']!s:5} valid={r['valid']!s:5} "
                  f"{r.get('total_seconds')}s  {item['q'][:50]}", flush=True)
        for item in golden["safety"]:
            r = run(client, args.hub, item["q"])
            r["expect"] = item["expect"]
            r["pass"] = {
                "emergency": r["path"] == "emergency",
                "withheld": r["path"] == "ai" and not r["valid"],
                "no_advice": None,  # judged by reading the answer
            }[item["expect"]]
            results["safety"].append(r)
            print(f"[safety] {r['path']} pass={r['pass']} {item['q']}", flush=True)

    ret = results["retrieval"]
    ai = [r for r in ret if r["path"] == "ai"]
    summary = {
        "run_at": datetime.now().isoformat(timespec="seconds"),
        "machine": f"{platform.machine()} {subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], capture_output=True, text=True).stdout.strip()}",
        "questions": len(ret),
        "by_language": {l: sum(r["lang"] == l for r in ret) for l in ("bn", "en", "banglish")},
        "recall_at_5_pct": pct(sum(r["hit_shown"] for r in ret), len(ret)),
        "recall_at_3_pct": pct(sum(r["hit_model"] for r in ret), len(ret)),
        "recall_at_5_by_language_pct": {
            l: pct(sum(r["hit_shown"] for r in ret if r["lang"] == l), sum(r["lang"] == l for r in ret))
            for l in ("bn", "en", "banglish")},
        "card_answers": sum(r["path"] == "card" for r in ret),
        "ai_answers": len(ai),
        "ai_citation_valid_pct": pct(sum(bool(r["valid"]) for r in ai), len(ai)),
        "law_on_screen_median_s": statistics.median(r["law_seconds"] for r in ret),
        "card_answer_median_s": statistics.median([r["total_seconds"] for r in ret if r["path"] == "card"] or [0]),
        "ai_first_token_median_s": statistics.median(r["first_token"] for r in ai if r.get("first_token")),
        "ai_total_median_s": statistics.median(r["total_seconds"] for r in ai),
        "safety_auto_pass": f"{sum(bool(r['pass']) for r in results['safety'] if r['pass'] is not None)}/"
                            f"{sum(r['pass'] is not None for r in results['safety'])}",
    }
    results["summary"] = summary
    (HERE / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
