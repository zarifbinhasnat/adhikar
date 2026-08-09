#!/usr/bin/env python3
"""Fetch acts from bdlaws.minlaw.gov.bd (live, or Wayback Machine copy) and parse into sections.

Usage:
  .venv/bin/python scripts/ingest_bdlaws.py                # all acts, via Wayback
  .venv/bin/python scripts/ingest_bdlaws.py --live         # try the live site first
  .venv/bin/python scripts/ingest_bdlaws.py --acts constitution_en crpc_en
"""
import argparse
import gzip
import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "corpus" / "raw"
STRUCT = ROOT / "corpus" / "structured"

LIVE = "https://bdlaws.minlaw.gov.bd/act-details-{id}.html"
WAYBACK = "http://web.archive.org/web/2026id_/http://bdlaws.minlaw.gov.bd/act-details-{id}.html"

# IDs verified against the bdlaws alphabetical index. Older acts exist in English, newer ones in Bangla.
ACTS = {
    "constitution_en": dict(id=367, lang="en", name="The Constitution of the People's Republic of Bangladesh", kind="constitution"),
    "constitution_bn": dict(id=957, lang="bn", name="গণপ্রজাতন্ত্রী বাংলাদেশের সংবিধান", kind="constitution"),
    "crpc_en": dict(id=75, lang="en", name="The Code of Criminal Procedure, 1898", kind="statute"),
    "crpc_amend_2026_en": dict(id=1640, lang="en", name="Code of Criminal Procedure (Amendment) Act, 2026", kind="statute"),
    "police_act_en": dict(id=12, lang="en", name="The Police Act, 1861", kind="statute"),
    "evidence_en": dict(id=24, lang="en", name="The Evidence Act, 1872", kind="statute"),
    "evidence_amend_2022_en": dict(id=1416, lang="en", name="Evidence (Amendment) Act, 2022", kind="statute"),
    "rti_bn": dict(id=1011, lang="bn", name="তথ্য অধিকার আইন, ২০০৯", kind="statute"),
    "ict_bn": dict(id=950, lang="bn", name="তথ্য ও যোগাযোগ প্রযুক্তি আইন, ২০০৬", kind="statute"),
    "legal_aid_bn": dict(id=834, lang="bn", name="আইনগত সহায়তা প্রদান আইন, ২০০০", kind="statute"),
    "legal_aid_amend_2026_bn": dict(id=1674, lang="bn", name="আইনগত সহায়তা প্রদান (সংশোধন) আইন, ২০২৬", kind="statute"),
    "women_children_bn": dict(id=835, lang="bn", name="নারী ও শিশু নির্যাতন দমন আইন, ২০০০", kind="statute"),
    "torture_custodial_bn": dict(id=1133, lang="bn", name="নির্যাতন এবং হেফাজতে মৃত্যু (নিবারণ) আইন, ২০১৩", kind="statute"),
    "dowry_bn": dict(id=1256, lang="bn", name="যৌতুক নিরোধ আইন, ২০১৮", kind="statute"),
    "cyber_suraksha_2026_bn": dict(id=1710, lang="bn", name="সাইবার সুরক্ষা আইন, ২০২৬", kind="statute"),
}

BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
LABEL_RE = re.compile(r"^\s*\[?\s*([0-9০-৯]+(?:[A-Za-zক-হ]{1,3})?(?:[-–][A-Za-z]+)?)\s*[\.।৷:|]")


def decode(b: bytes) -> str:
    if b[:2] == b"\x1f\x8b":
        b = gzip.decompress(b)
    if b[:2] in (b"\xff\xfe", b"\xfe\xff") or b"\x00" in b[:200]:
        return b.decode("utf-16", errors="ignore")
    return b.decode("utf-8", errors="ignore")


def fetch(act_id: int, live: bool, retries: int = 3):
    urls = ([LIVE] if live else []) + [WAYBACK]
    for tmpl in urls:
        url = tmpl.format(id=act_id)
        timeout = 15 if tmpl is LIVE else 240
        for attempt in range(retries if tmpl is WAYBACK else 1):
            try:
                r = requests.get(url, timeout=timeout, headers={"User-Agent": "adhikar-corpus-builder/0.1"})
                r.raise_for_status()
                html = decode(r.content)
                if "txt-head" not in html:
                    raise ValueError("no sections in response")
                snap = re.search(r"/web/(\d{14})", r.url)
                return html, ("live" if tmpl is LIVE else f"wayback:{snap.group(1) if snap else 'unknown'}"), url
            except Exception as e:
                print(f"  [{act_id}] {url[:60]}... attempt {attempt + 1} failed: {e}", file=sys.stderr)
                time.sleep(3)
    raise RuntimeError(f"could not fetch act {act_id}")


def clean(node) -> str:
    for t in node.select("span.footnote, sup"):
        t.decompose()
    text = node.get_text("\n")
    text = re.sub(r"[ \t ‌‍]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return "\n".join(line.strip() for line in text.split("\n")).strip()


def parse(html: str, key: str, meta: dict, source: str, url: str):
    soup = BeautifulSoup(html, "html.parser")
    out, part = [], ""
    for row in soup.select("div.row.lineremoves"):
        head_group = row.select_one("div.act-part-group")
        if head_group:
            part = clean(head_group).replace("\n", " — ")
        title_el, body_el = row.select_one("div.txt-head"), row.select_one("div.txt-details")
        if not body_el:
            continue
        notes = [fn["title"].strip() for fn in body_el.select("span.footnote[title]")]
        title, body = (clean(title_el) if title_el else ""), clean(body_el)
        m = LABEL_RE.match(body)
        if not m:
            # bdlaws splits a section's later sub-sections into their own rows
            if out and body and not head_group:
                out[-1]["text"] += "\n" + body
                out[-1]["amendments"] += notes
            continue
        if len(body) < 12:
            continue
        label = m.group(1).translate(BN_DIGITS)
        repealed = bool(re.search(r"\[(?:Repealed|রহিত)", body[:80])) or "রহিত" in body[:40]
        out.append(
            dict(
                id=f"{key}-s{label}",
                act_key=key,
                act_id=meta["id"],
                act_name=meta["name"],
                kind=meta["kind"],
                lang=meta["lang"],
                part=part,
                section_label=label,
                title=title,
                text=body,
                repealed=repealed,
                amendments=notes,
                source_url=LIVE.format(id=meta["id"]),
                fetched_from=source,
                fetched_on=date.today().isoformat(),
            )
        )
    return out


def run(key: str, live: bool, refresh: bool = False):
    meta = ACTS[key]
    RAW.mkdir(parents=True, exist_ok=True)
    cached, provenance = RAW / f"{key}.html", RAW / f"{key}.source"
    if cached.exists() and not refresh:
        html, url = cached.read_text(encoding="utf-8"), ""
        source = provenance.read_text().strip() if provenance.exists() else "unknown"
    else:
        html, source, url = fetch(meta["id"], live)
        cached.write_text(html, encoding="utf-8")
        provenance.write_text(source)
    secs = parse(html, key, meta, source, url)
    STRUCT.mkdir(parents=True, exist_ok=True)
    (STRUCT / f"{key}.json").write_text(json.dumps(secs, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{key}: {len(secs)} sections ({source})")
    return key, len(secs), source


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--acts", nargs="*", default=list(ACTS))
    ap.add_argument("--live", action="store_true")
    ap.add_argument("--refresh", action="store_true", help="re-download even if cached")
    args = ap.parse_args()
    def safe(k):
        try:
            return run(k, args.live, args.refresh)
        except Exception as e:
            print(f"FAILED {k}: {e}", file=sys.stderr)
            return None

    with ThreadPoolExecutor(max_workers=4) as ex:
        res = [r for r in ex.map(safe, args.acts) if r]
    manifest = {k: dict(sections=n, source=s, **{f: ACTS[k][f] for f in ("id", "lang", "name")}) for k, n, s in res}
    (STRUCT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
