"""Draw a random sample of prompt-injection attacks written by other people (held-out test).

Source: LLMail-Inject (Microsoft, 2025; MIT licence; https://huggingface.co/datasets/microsoft/
llmail-inject-challenge), the submissions of a public challenge in which 839 participants tried to
make an email assistant obey instructions hidden in an email. We did not write them and they
target another system, which is the point: they show how our detector's list of phrases
generalises to wording we did not think of.

SAMPLE rows are drawn at fixed random positions (seed 0) of the Phase 1 submissions, through the
Hugging Face dataset viewer API (no download of the 370,000 rows). Each row is assigned to a
split by its TEAM, so that one team's style is never on both sides:
- "dev": may be read to improve the detector;
- "test": never read; only its counts are reported (ml/scripts/eval_injection.py).

Idempotent: an existing file is kept. Usage:
    uv run python ml/scripts/fetch_injection_thirdparty.py
"""

from __future__ import annotations

import hashlib
import json
import random
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

OUT = Path("eval/injection_thirdparty.jsonl")
API = "https://datasets-server.huggingface.co/rows"
DATASET = {"dataset": "microsoft/llmail-inject-challenge", "config": "default", "split": "Phase1"}
SAMPLE = 700
SEED = 0


def page(client: httpx.Client, offset: int) -> dict | None:
    """One row of the dataset with its metadata; None if the viewer keeps refusing."""
    for attempt in range(8):
        try:
            response = client.get(API, params={**DATASET, "offset": offset, "length": 1})
            if response.status_code == 200:
                return response.json()
        except (httpx.HTTPError, ValueError):
            pass
        time.sleep(2 + 3 * attempt)  # rate limit or a cold viewer: wait and try again
    return None


def fetch(client: httpx.Client, offset: int) -> dict | None:
    data = page(client, offset)
    return data["rows"][0]["row"] if data and data["rows"] else None


def split_of(team: str) -> str:
    """Stable split by team: about half of the teams on each side."""
    return "dev" if int(hashlib.sha256(team.encode()).hexdigest(), 16) % 2 == 0 else "test"


def main() -> None:
    if OUT.exists() and OUT.stat().st_size > 0:
        print(f"kept {OUT}")
        return
    with httpx.Client(timeout=60, headers={"User-Agent": "research-script"}) as client:
        first = page(client, 0)
        if first is None:
            raise SystemExit("the dataset viewer is not answering: try again later")
        total = first["num_rows_total"]
        offsets = sorted(random.Random(SEED).sample(range(total), SAMPLE))
        with ThreadPoolExecutor(max_workers=4) as pool:
            rows = list(pool.map(lambda offset: fetch(client, offset), offsets))
    kept, seen = [], set()
    for offset, row in zip(offsets, rows, strict=True):
        if row is None:
            continue
        text = f"{row['subject']}\n\n{row['body']}".strip()
        if not text or text in seen:  # identical resubmissions count once
            continue
        seen.add(text)
        kept.append(
            {
                "id": row["RowKey"],
                "offset": offset,
                "team": row["team_id"],
                "split": split_of(row["team_id"]),
                "scenario": row["scenario"],
                "text": text,
            }
        )
    OUT.write_text(
        "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in kept), encoding="utf-8"
    )
    by_split = {s: sum(1 for item in kept if item["split"] == s) for s in ("dev", "test")}
    teams = len({item["team"] for item in kept})
    print(f"wrote {OUT}: {len(kept)} attacks from {teams} teams, {by_split} (of {total:,} rows)")


if __name__ == "__main__":
    main()
