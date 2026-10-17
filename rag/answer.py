"""Question answering over retrieved statute text with Qwen3-8B (Ollama)."""
import json
import re

import httpx

from .retrieve import get_index

OLLAMA = "http://localhost:11434"
CHAT_MODEL = "qwen3:8b"
KEEP_ALIVE = "2h"
BANGLA = re.compile(r"[ঀ-৿]")
SOURCE_CHARS = 600
GEN_SOURCES = 3

EMERGENCY = re.compile(
    r"beating me|hitting me|torturing me|they are taking me|kidnap|abduct|want to kill|help me now|"
    r"মারছে|মারধর করছে|পেটাচ্ছে|নির্যাতন করছে|তুলে নিয়ে যাচ্ছে|অপহরণ|মেরে ফেলবে|বাঁচান|"
    r"marche|pitache|tule niye jacche|bachan|mere felbe",
    re.I,
)

SYSTEM = """You are Adhikar, a legal-information assistant for people in Bangladesh.
Rules you must follow:
- Use ONLY the numbered law excerpts provided. Never use outside knowledge of the law.
- After every sentence that states the law, cite the excerpt like [1] or [2][3].
- Stay close to the wording of the excerpts. Do not add conditions, time limits or exceptions that are not written there.
- Do not begin with "Yes" or "No" unless an excerpt says so directly. Describe only the situations the excerpts cover; never generalise beyond them.
- Do not repeat the same point in different words.
- If the excerpts do not answer the question, reply exactly: NOT_COVERED
- Give legal information, not advice about a specific case. Never tell the user to confess, plead or evade police.
- Be short and plain. Use this shape:
  one-sentence direct answer
  then at most 3 bullet points starting with "- " for the key rights or steps.
- Every line, including every bullet, must end with its citation such as [1].
- Reply in {lang}."""


def language_of(question):
    if BANGLA.search(question):
        return "bn"
    words = set(re.findall(r"[a-z]+", question.lower()))
    banglish = {"ami", "amake", "amar", "ki", "kivabe", "korbo", "korte", "pare", "parbe", "ache", "nai",
                "keno", "koto", "theke", "jonno", "dhore", "dhorse", "niye", "gese", "hobe", "kothay", "kar", "ke"}
    return "bn" if len(words & banglish) >= 2 else "en"


def is_emergency(question):
    return bool(EMERGENCY.search(question))


def _chat(messages, max_tokens, stream=False, client=None):
    body = {
        "model": CHAT_MODEL, "messages": messages, "stream": stream, "think": False, "keep_alive": KEEP_ALIVE,
        "options": {"temperature": 0.1, "num_predict": max_tokens, "num_ctx": 6144},
    }
    return body


async def to_bangla_query(question, client):
    """Most statutes after 1990 exist only in Bangla, so non-Bangla questions get a Bangla search line."""
    prompt = ("Rewrite this question about Bangladeshi law as one Bangla sentence in Bangla script, with correct "
              "spelling and formal legal words. The question may be English or romanised Bangla (Banglish).\n"
              "Examples:\n"
              "police thanay marle ki korbo? -> থানায় পুলিশ নির্যাতন করলে কী করব?\n"
              "joutuk chaile ki shasti? -> যৌতুক দাবি করলে শাস্তি কী?\n"
              "Can police search my house? -> পুলিশ কি আমার বাড়ি তল্লাশি করতে পারে?\n"
              "Output only the Bangla sentence.\n\nQuestion: " + question)
    res = await client.post(f"{OLLAMA}/api/chat", json=_chat([{"role": "user", "content": prompt}], 90), timeout=60)
    res.raise_for_status()
    return res.json()["message"]["content"].strip().splitlines()[0]


def build_messages(question, sources, lang):
    blocks = []
    for i, s in enumerate(sources[:GEN_SOURCES], 1):
        text = s["text"] if len(s["text"]) <= SOURCE_CHARS else s["text"][:SOURCE_CHARS] + " …"
        blocks.append(f"[{i}] {s['cite']} — {s['title']}\n{text}")
    user = "Law excerpts:\n\n" + "\n\n".join(blocks) + f"\n\nQuestion: {question}"
    language = "Bangla (বাংলা)" if lang == "bn" else "English"
    return [{"role": "system", "content": SYSTEM.format(lang=language)}, {"role": "user", "content": user}]


def check_citations(answer, n_sources):
    """An answer is valid only if it cites at least once and every citation points at a provided excerpt."""
    if "NOT_COVERED" in answer:
        return False, []
    cited = sorted({int(x) for x in re.findall(r"\[(\d+)\]", answer)})
    lines = [l for l in answer.splitlines() if l.strip()]
    every_line_cited = all(re.search(r"\[\d+\]", l) for l in lines)
    valid = bool(cited) and every_line_cited and all(1 <= c <= n_sources for c in cited)
    return valid, cited


async def stream_answer(question, async_client, sources, lang):
    """Yields text deltas from the model."""
    body = _chat(build_messages(question, sources, lang), 380, stream=True)
    async with async_client.stream("POST", f"{OLLAMA}/api/chat", json=body, timeout=180) as res:
        res.raise_for_status()
        async for line in res.aiter_lines():
            if not line:
                continue
            msg = json.loads(line)
            delta = msg.get("message", {}).get("content", "")
            if delta:
                yield delta
            if msg.get("done"):
                break
