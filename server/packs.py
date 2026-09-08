"""Offline law packs built from the verbatim statute corpus in corpus/structured/."""
import hashlib
import json
from functools import lru_cache
from pathlib import Path

CORPUS = Path(__file__).resolve().parent.parent / "corpus" / "structured"
RAW = CORPUS.parent / "raw"

# act_key -> section labels to include (None = whole act)
PACKS = [
    dict(
        id="arrest-detention",
        title_en="Arrest & detention",
        title_bn="গ্রেপ্তার ও আটক",
        desc_en="Constitutional arrest safeguards, the 2026 CrPC arrest procedure, and the Torture and Custodial Death Act.",
        desc_bn="গ্রেপ্তার সম্পর্কে সাংবিধানিক রক্ষাকবচ, ২০২৬ সালের সংশোধিত ফৌজদারী কার্যবিধির গ্রেপ্তার-পদ্ধতি এবং নির্যাতন ও হেফাজতে মৃত্যু (নিবারণ) আইন।",
        acts={
            "constitution_bn": ["31", "32", "33", "35"],
            "constitution_en": ["31", "32", "33", "35"],
            "crpc_en": ["46", "46A", "46B", "46C", "46D", "46E", "54", "54A", "60", "61", "167"],
            "torture_custodial_bn": None,
        },
    ),
    dict(
        id="fundamental-rights",
        title_en="Fundamental rights (Constitution Part III)",
        title_bn="মৌলিক অধিকার (সংবিধানের তৃতীয় ভাগ)",
        desc_en="Articles 26–47A of the Constitution in official Bangla and English.",
        desc_bn="সংবিধানের অনুচ্ছেদ ২৬–৪৭ক, সরকারি বাংলা ও ইংরেজি পাঠ।",
        acts={"constitution_bn": "PART3", "constitution_en": "PART3"},
    ),
    dict(
        id="rti",
        title_en="Right to Information Act 2009",
        title_bn="তথ্য অধিকার আইন, ২০০৯",
        desc_en="Full Act: how to request information, deadlines, appeals and complaints.",
        desc_bn="পূর্ণ আইন: তথ্যের অনুরোধ, সময়সীমা, আপিল ও অভিযোগ।",
        acts={"rti_bn": None},
    ),
    dict(
        id="legal-aid",
        title_en="Legal Aid Act 2000",
        title_bn="আইনগত সহায়তা প্রদান আইন, ২০০০",
        desc_en="Full Act: who can get free legal aid and how.",
        desc_bn="পূর্ণ আইন: কে এবং কীভাবে বিনামূল্যে আইনগত সহায়তা পাবেন।",
        acts={"legal_aid_bn": None},
    ),
    dict(
        id="women-children",
        title_en="Women & Children Repression Prevention Act 2000",
        title_bn="নারী ও শিশু নির্যাতন দমন আইন, ২০০০",
        desc_en="Full Act as published on bdlaws.",
        desc_bn="bdlaws-এ প্রকাশিত পূর্ণ আইন।",
        acts={"women_children_bn": None},
    ),
    dict(
        id="digital-evidence",
        title_en="Digital evidence",
        title_bn="ডিজিটাল সাক্ষ্য",
        desc_en="Evidence Act §§65A–65B with the 2022 amendment, and the ICT Act 2006.",
        desc_bn="সাক্ষ্য আইনের ধারা ৬৫ক–৬৫খ (২০২২ সালের সংশোধনীসহ) এবং তথ্য ও যোগাযোগ প্রযুক্তি আইন, ২০০৬।",
        acts={"evidence_en": ["65A", "65B"], "evidence_amend_2022_en": None, "ict_bn": None},
    ),
]

PART3 = {str(n) for n in range(26, 48)} | {"47A", "47ক"}


def _act(key, wanted):
    sections = json.loads((CORPUS / f"{key}.json").read_text(encoding="utf-8"))
    if wanted == "PART3":
        sections = [s for s in sections if s["section_label"] in PART3]
    elif wanted is not None:
        order = {label: i for i, label in enumerate(wanted)}
        sections = sorted((s for s in sections if s["section_label"] in order), key=lambda s: order[s["section_label"]])
    source = RAW / f"{key}.source"
    first = sections[0]
    return {
        "key": key,
        "name": first["act_name"],
        "lang": first["lang"],
        "source_url": first["source_url"],
        "snapshot": source.read_text().strip() if source.exists() else "unrecorded",
        "sections": [
            {k: s[k] for k in ("section_label", "title", "text", "amendments", "repealed")} for s in sections
        ],
    }


@lru_cache(maxsize=None)
def build(pack_id):
    spec = next(p for p in PACKS if p["id"] == pack_id)
    body = {k: spec[k] for k in ("id", "title_en", "title_bn", "desc_en", "desc_bn")}
    body["acts"] = [_act(key, wanted) for key, wanted in spec["acts"].items()]
    data = json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return data, hashlib.sha256(data).hexdigest()


def index():
    out = []
    for spec in PACKS:
        data, digest = build(spec["id"])
        body = json.loads(data)
        out.append({
            **{k: spec[k] for k in ("id", "title_en", "title_bn", "desc_en", "desc_bn")},
            "bytes": len(data),
            "sha256": digest,
            "sections": sum(len(a["sections"]) for a in body["acts"]),
            "version": digest[:12],
        })
    return out
