#!/usr/bin/env python3
"""
Phase 0: Knowledge base ingestion pipeline for Adhikar RAG system.
Scrapes acts from bdlaws.minlaw.gov.bd, parses into bilingual sections,
and outputs structured JSON ready for embedding and Supabase ingestion.

Usage:
  python3 ingest_acts.py --acts constitution crc evidence --lang both --output kb/
"""

import sys
import json
import re
import argparse
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
import hashlib

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Install dependencies: pip install requests beautifulsoup4 lxml")
    sys.exit(1)

# Registry of acts to ingest (p_code -> metadata)
ACTS_REGISTRY = {
    "constitution": {
        "p_code": "367",
        "name_en": "Constitution of the People's Republic of Bangladesh",
        "name_bn": "বাংলাদেশের সংবিধান",
        "year": 1972,
        "scope": "Fundamental Rights Articles 26–44",
        "priority": "P0",
    },
    "crc": {
        "p_code": "75",
        "name_en": "Code of Criminal Procedure, 1898",
        "name_bn": "ফৌজদারী কার্যপদ্ধতি সংহিতা, ১৮৯৮",
        "year": 1898,
        "scope": "Police stop, arrest, detention, trial procedures",
        "priority": "P0",
    },
    "evidence": {
        "p_code": "40",
        "name_en": "Indian Evidence Act, 1872 (as adopted in Bangladesh)",
        "name_bn": "ভারতীয় সাক্ষ্য আইন, ১৮৭২",
        "year": 1872,
        "scope": "Evidence admissibility, documentary evidence, digital records §65B",
        "priority": "P1",
    },
    "ict": {
        "p_code": "273",
        "name_en": "Information and Communication Technology Act, 2006",
        "name_bn": "তথ্য ও যোগাযোগ প্রযুক্তি আইন, ২০০৬",
        "year": 2006,
        "scope": "Digital evidence, consent for recording §63",
        "priority": "P1",
    },
    "police": {
        "p_code": "61",
        "name_en": "Police Act, 1861",
        "name_bn": "পুলিশ আইন, ১৮৬১",
        "year": 1861,
        "scope": "Police powers, stop and search, conduct",
        "priority": "P1",
    },
    "rti": {
        "p_code": "1011",
        "name_en": "Right to Information Act, 2009",
        "name_bn": "তথ্য অধিকার আইন, ২০০৯",
        "year": 2009,
        "scope": "RTI filing procedures, appeal, exemptions",
        "priority": "P1",
    },
}

BASE_URL = "https://bdlaws.minlaw.gov.bd/act-detail/type/law/id/{p_code}"


@dataclass
class Section:
    """A single section or clause from an act."""

    section_label: str  # "Article 27", "Section 33(1)", etc.
    section_num: str  # "27", "33", etc.
    section_text_en: str
    section_text_bn: Optional[str] = None
    subsection_text_en: Optional[str] = None  # Nested (1), (2), etc.
    subsection_text_bn: Optional[str] = None
    act_name_en: Optional[str] = None
    act_name_bn: Optional[str] = None
    act_year: Optional[int] = None
    act_priority: Optional[str] = None
    source_url: Optional[str] = None
    effective_date: Optional[str] = None
    last_verified: str = datetime.now().strftime("%d %b %Y")

    def to_chunk_text(self) -> str:
        """Generate the text block for embedding."""
        parts = []
        if self.section_label:
            parts.append(f"## {self.section_label}")
        if self.section_text_en:
            parts.append(self.section_text_en)
        if self.subsection_text_en:
            parts.append(self.subsection_text_en)
        return "\n\n".join(filter(None, parts))

    def to_metadata(self) -> Dict[str, Any]:
        """Return metadata for vector store."""
        return {
            "section_label": self.section_label,
            "section_num": self.section_num,
            "act_name_en": self.act_name_en,
            "act_name_bn": self.act_name_bn,
            "act_year": self.act_year,
            "source_url": self.source_url,
            "last_verified": self.last_verified,
            "chunk_hash": self.compute_hash(),
        }

    def compute_hash(self) -> str:
        """SHA256 of the combined section content."""
        content = f"{self.section_label}|{self.section_text_en}|{self.section_text_bn}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]


class ActIngester:
    """Fetches and parses acts from bdlaws.minlaw.gov.bd."""

    def __init__(self, rate_limit: float = 2.0):
        """rate_limit: seconds to wait between requests."""
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Adhikar-KB-Ingester/1.0 (legal-research)"
        })

    def fetch_act(self, p_code: str) -> Optional[str]:
        """Fetch the HTML page for an act."""
        url = BASE_URL.format(p_code=p_code)
        try:
            print(f"  Fetching {url}...")
            resp = self.session.get(url, timeout=10)
            resp.raise_for_status()
            time.sleep(self.rate_limit)
            return resp.text
        except Exception as e:
            print(f"  ❌ Error fetching {url}: {e}")
            return None

    def parse_sections(self, html: str, act_meta: Dict[str, Any]) -> List[Section]:
        """
        Parse the HTML content into Section objects.
        This is a heuristic parser; bdlaws uses varied HTML structures.
        """
        soup = BeautifulSoup(html, "lxml")
        sections = []

        # Try to find the main content div
        content = soup.find("div", class_=re.compile(r"content|body|main"))
        if not content:
            content = soup.body or soup

        # Look for section headers (Article X, Section Y, etc.)
        # Pattern: "Article 27", "Section 33(1)", "Clause (a)", etc.
        section_pattern = re.compile(
            r"^(Article|Section|Sub-section|Clause|Subsection)\s+(\d+(?:\(\d+\))?)",
            re.IGNORECASE
        )

        current_section = None
        for elem in content.find_all(["h2", "h3", "h4", "p", "div"]):
            text = elem.get_text(strip=True)

            # Check if this is a section header
            match = section_pattern.match(text)
            if match:
                # Save previous section if exists
                if current_section:
                    sections.append(current_section)

                section_label = text.split("\n")[0][:80]  # Truncate
                section_num = match.group(2)
                current_section = Section(
                    section_label=section_label,
                    section_num=section_num,
                    section_text_en=text,
                    act_name_en=act_meta["name_en"],
                    act_name_bn=act_meta["name_bn"],
                    act_year=act_meta["year"],
                    act_priority=act_meta.get("priority", "P2"),
                    source_url=BASE_URL.format(p_code=act_meta["p_code"]),
                )
            elif current_section and text and len(text) > 20:
                # Accumulate body text
                if not current_section.section_text_en:
                    current_section.section_text_en = text
                else:
                    # Append to subsection or body
                    if not current_section.subsection_text_en:
                        current_section.subsection_text_en = text
                    else:
                        # Keep only first subsection
                        pass

        # Don't forget the last section
        if current_section:
            sections.append(current_section)

        return sections

    def ingest_act(self, act_key: str) -> List[Section]:
        """Ingest a single act by key (e.g., 'constitution')."""
        if act_key not in ACTS_REGISTRY:
            print(f"❌ Unknown act: {act_key}")
            return []

        meta = ACTS_REGISTRY[act_key]
        print(f"\n📄 Ingesting {meta['name_en']} (P{meta['p_code']})...")

        html = self.fetch_act(meta["p_code"])
        if not html:
            return []

        sections = self.parse_sections(html, meta)
        print(f"  ✓ Parsed {len(sections)} sections")
        return sections


class KBWriter:
    """Writes parsed sections to JSON files and embedding-ready formats."""

    def __init__(self, output_dir: str = "kb"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_sections_jsonl(self, sections: List[Section], act_key: str):
        """Write sections as JSONL (one JSON object per line) for embedding."""
        output_file = self.output_dir / f"{act_key}_sections.jsonl"
        with open(output_file, "w", encoding="utf-8") as f:
            for section in sections:
                record = {
                    "id": section.compute_hash(),
                    "text": section.to_chunk_text(),
                    "metadata": section.to_metadata(),
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        print(f"  ✓ Wrote {len(sections)} sections to {output_file}")

    def write_combined_json(self, sections: List[Section], act_key: str):
        """Write sections as a single JSON array (for manual review)."""
        output_file = self.output_dir / f"{act_key}_sections.json"
        records = [
            {
                "id": s.compute_hash(),
                "section_label": s.section_label,
                "section_text_en": s.section_text_en,
                "section_text_bn": s.section_text_bn,
                "metadata": s.to_metadata(),
            }
            for s in sections
        ]
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Wrote combined JSON to {output_file}")

    def write_manifest(self, manifest: Dict[str, Any]):
        """Write an ingestion manifest for record-keeping."""
        manifest_file = self.output_dir / "manifest.json"
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Wrote manifest to {manifest_file}")


def main():
    parser = argparse.ArgumentParser(
        description="Ingest acts from bdlaws.minlaw.gov.bd into structured KB format"
    )
    parser.add_argument(
        "--acts",
        nargs="+",
        default=["constitution", "crc"],
        choices=list(ACTS_REGISTRY.keys()),
        help="Which acts to ingest (default: constitution crc)"
    )
    parser.add_argument(
        "--output",
        default="kb",
        help="Output directory for KB files (default: kb/)"
    )
    parser.add_argument(
        "--rate-limit",
        type=float,
        default=2.0,
        help="Seconds between requests (default: 2.0)"
    )

    args = parser.parse_args()

    print("🚀 Adhikar RAG Phase 0: Knowledge Base Ingestion\n")
    print(f"Target acts: {', '.join(args.acts)}")
    print(f"Output dir: {args.output}\n")

    ingester = ActIngester(rate_limit=args.rate_limit)
    writer = KBWriter(output_dir=args.output)

    manifest = {
        "created_at": datetime.now().isoformat(),
        "acts_ingested": {},
    }

    all_sections = {}
    for act_key in args.acts:
        sections = ingester.ingest_act(act_key)
        if sections:
            act_meta = ACTS_REGISTRY[act_key]
            writer.write_sections_jsonl(sections, act_key)
            writer.write_combined_json(sections, act_key)
            all_sections[act_key] = sections
            manifest["acts_ingested"][act_key] = {
                "act_name": act_meta["name_en"],
                "section_count": len(sections),
                "p_code": act_meta["p_code"],
                "priority": act_meta["priority"],
            }

    writer.write_manifest(manifest)

    print(f"\n✅ Ingestion complete!")
    print(f"  Total acts: {len(all_sections)}")
    print(f"  Total sections: {sum(len(s) for s in all_sections.values())}")
    print(f"  Output: {args.output}/")


if __name__ == "__main__":
    main()
