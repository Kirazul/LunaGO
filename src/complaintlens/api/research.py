"""The console's research pages (signed in): Insights, Annotate and the knowledge base.

- Insights: daily volume, detected incidents and problem clusters of the real Uber stream, and
  the report's headline numbers, each traced to the results file that produced it.
- Knowledge base: LunaGo's policies (company/help_center/), the private sources the AI's replies
  quote; customers never see them as pages.
- Annotate: the gold sets. Labels are saved under the signed-in account, so two team members
  labelling the pilot set give the inter-annotator agreement.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import col, func, select

from complaintlens import annotation
from complaintlens.api.state import state
from complaintlens.auth import CurrentUser, current_user
from complaintlens.settings import ROOT
from complaintlens.store import AnnotationItem, new_session

router = APIRouter(prefix="/api", tags=["research"], dependencies=[Depends(current_user)])


GOLD_DIR = ROOT / "eval" / "gold"


class AnnotateIn(BaseModel):
    item_id: str
    labels: annotation.Labels


class NewItemIn(BaseModel):
    text: str = Field(min_length=2, max_length=2000)
    lang: str = Field(pattern="^(en|fr)$")


@router.get("/annotate/next")
def annotate_next(user: CurrentUser, set: str = "pilot") -> dict[str, Any]:
    if set not in annotation.SETS:
        raise HTTPException(400, f"set must be one of {annotation.SETS}")
    with new_session() as s:
        item = annotation.next_item(s, user.username, set)
        return {
            "item": item.model_dump() if item else None,
            "progress": annotation.progress(s),
        }


@router.post("/annotate")
def annotate_save(payload: AnnotateIn, user: CurrentUser) -> dict[str, Any]:
    with new_session() as s:
        if s.get(AnnotationItem, payload.item_id) is None:
            raise HTTPException(404, "item not found")
        annotation.save(s, payload.item_id, user.username, payload.labels)
        return {"saved": True, "progress": annotation.progress(s)}


@router.post("/annotate/items", status_code=201)
def annotate_add_item(payload: NewItemIn) -> dict[str, Any]:
    """Author a gold message (used for the French set: no licensed French data exists)."""
    with new_session() as s:
        prefix = f"{payload.lang}-authored-"
        count = s.exec(
            select(func.count())
            .select_from(AnnotationItem)
            .where(col(AnnotationItem.id).startswith(prefix))
        ).one()
        item = AnnotationItem(
            id=f"{prefix}{count + 1:04d}",
            set=f"gold_{payload.lang}",
            lang=payload.lang,
            text=payload.text.strip(),
            meta={"source": "authored by the team (fictional, no personal data)"},
        )
        s.add(item)
        s.commit()
        return item.model_dump()


@router.get("/annotate/agreement")
def annotate_agreement(set: str = "pilot") -> dict[str, Any]:
    with new_session() as s:
        return annotation.agreement(s, set)


RESULTS_DIR = ROOT / "reports" / "results"
# The prompt-injection test, with and without the protections (ml/scripts/eval_injection.py).
INJECTION_RESULTS = ("injection_attacks.json", "injection_attacks_no_defence.json")


def _result(name: str) -> dict[str, Any]:
    path = RESULTS_DIR / name
    if not path.exists():
        raise HTTPException(404, f"{name} not generated yet")
    return json.loads(path.read_text(encoding="utf-8"))


@router.get("/insights")
def insights() -> dict[str, Any]:
    return _result("insights_uber.json")


@router.get("/experiments")
def experiments() -> list[dict[str, Any]]:
    """Headline numbers of the report, each with the results file that produced it. Written for
    the console's Insights page, so in plain words: `question` is the part of the system."""
    rows: list[dict[str, Any]] = []

    def add(question: str, claim: str, value: str, source: str) -> None:
        rows.append({"question": question, "claim": claim, "value": value, "source": source})

    if (RESULTS_DIR / "baseline_complaints2019.json").exists():
        b = _result("baseline_complaints2019.json")
        best = b["task_a_complaint_vs_not"]["models"]["tfidf_word+char_lr"]
        sev = b["task_b_severity_on_complaints"]["models"]["tfidf_word+char_lr"]
        add(
            "Recognising complaints",
            "Telling complaints from other messages: score out of 100 (best published simple "
            "method: 79.0)",
            f"{best['macro_f1_mean'] * 100:.1f} ± {best['macro_f1_std'] * 100:.1f}",
            "baseline_complaints2019.json",
        )
        add(
            "Recognising complaints",
            "Rating how strongly a complaint is worded, 4 levels: score out of 100 (published "
            "simple method: 43.5)",
            f"{sev['macro_f1_mean'] * 100:.1f} ± {sev['macro_f1_std'] * 100:.1f}",
            "baseline_complaints2019.json",
        )
    if (RESULTS_DIR / "gate_complaints2019.json").exists():
        g = _result("gate_complaints2019.json")["methods"]["gate_alpha_0.1"]
        add(
            "Sending without a person",
            "Share of messages that can be handled automatically with at most 10% errors, "
            "guaranteed by a statistical test",
            f"{g['automation_rate_mean'] * 100:.1f}% "
            f"(limit exceeded {g['violations_of_alpha']} times)",
            "gate_complaints2019.json",
        )
    if (RESULTS_DIR / "retrieval_helpcenter.json").exists():
        r = _result("retrieval_helpcenter.json")["retrievers"]
        dense = next(v for k, v in r.items() if k.startswith("dense"))
        add(
            "Finding the right policy",
            "How high the right policy section is ranked (1 = always first): search by meaning "
            "vs. search by keywords",
            f"{dense['mrr@10']} vs. {r['bm25']['mrr@10']}",
            "retrieval_helpcenter.json",
        )
    if (RESULTS_DIR / "retrieval_summary_int8.json").exists():
        v = _result("retrieval_summary_int8.json")["variants"]
        add(
            "Finding the right policy",
            "How often the right policy section is among the 4 given to the reply writer: "
            "search with the message's summary vs. the customer's own words",
            f"{v['dense_summary']['recall@4']:.2f} vs. {v['dense_text']['recall@4']:.2f}",
            "retrieval_summary_int8.json",
        )
    if all((RESULTS_DIR / f).exists() for f in INJECTION_RESULTS):
        with_defence, without = (_result(f)["attack_succeeded"] for f in INJECTION_RESULTS)
        add(
            "Resisting manipulation",
            "Messages that try to give orders to the AI and got an obeying reply sent "
            "automatically: with vs. without the protections",
            f"{with_defence['count']} of {with_defence['of']} vs. "
            f"{without['count']} of {without['of']}",
            INJECTION_RESULTS[0],
        )
    if (RESULTS_DIR / "trends_uber.json").exists():
        t = _result("trends_uber.json")
        z = t["methods"]["zscore"]["injection_recall_test"]["20"]["mean"]
        c = t["methods"]["count_threshold"]["injection_recall_test"]["20"]["mean"]
        delay = t["real_event_hourly"]["delay_hours"]
        add(
            "Spotting sudden problems",
            "Share of sudden problems detected when 20 messages about one are added to a day: "
            "our detector vs. a fixed alarm level",
            f"{z:.2f} vs. {c:.2f}",
            "trends_uber.json",
        )
        add(
            "Spotting sudden problems",
            "Time before the alert on the real app outage of 14 November 2017",
            "within the same hour" if delay == 0 else f"{delay} h",
            "trends_uber.json",
        )
    if (RESULTS_DIR / "rootcause_simulation.json").exists():
        rc = next(
            c
            for c in _result("rootcause_simulation.json")["conditions"]
            if c["incident_size"] == 50 and c["purity"] == 0.5
        )
        add(
            "Finding the cause",
            "How often the planted cause of an incident of 50 tickets is found: our method vs. "
            "naming the most common value",
            f"{rc['precision_at_k_ours']:.2f} vs. {rc['precision_at_k_most_frequent']:.2f}",
            "rootcause_simulation.json",
        )
    return rows


@router.get("/knowledge")
def knowledge(lang: str = "en") -> list[dict[str, Any]]:
    """The policy sections the replies cite, by article (for the console's citation pop-ups)."""
    lang = lang if lang in ("en", "fr") else "en"
    articles: dict[str, dict[str, Any]] = {}
    for c in state.processor.kb.chunks:
        if c.lang != lang:
            continue
        art = articles.setdefault(
            c.article_id, {"id": c.article_id, "title": c.title, "sections": []}
        )
        art["sections"].append({"id": c.id, "heading": c.heading, "text": c.text})
    return list(articles.values())
