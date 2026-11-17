"""Stage runner.

A *stage* is a function ``(ctx) -> StageResult`` that reads and writes a shared context dict:
each stage reads what earlier stages left there (``ctx["text"]``, ``ctx["language"]``...) and adds
its own results. ``run_stages`` times each stage and turns crashes into ``status="error"``
results: one failing stage must never lose the customer's message. The resulting list of
``StageResult`` is the trace the console shows (plan §10.1, "Ticket X-ray").

The six stages, in order (``service.STAGES``): normalize, pii_masking, language, understand,
link, respond. To add one, write the function, name it with ``@stage("...")`` and add it to
that list.
"""

from __future__ import annotations

import time
from collections.abc import Callable, Iterable
from typing import Any

from complaintlens.schemas import StageResult

Context = dict[str, Any]
Stage = Callable[[Context], StageResult]


def stage(name: str) -> Callable[[Stage], Stage]:
    """Name a stage: ``@stage("language")``. The name is the one the stage puts in its result;
    ``run_stages`` needs it too, to report a stage that crashed before returning a result."""

    def mark(fn: Stage) -> Stage:
        fn.stage_name = name  # type: ignore[attr-defined]
        return fn

    return mark


def run_stages(
    stages: Iterable[Stage],
    ctx: Context,
    on_stage: Callable[[StageResult], None] | None = None,
) -> list[StageResult]:
    """Run stages in order, recording a timed result for each; call ``on_stage`` after each one."""
    trace: list[StageResult] = []
    for step in stages:
        start = time.perf_counter()
        try:
            result = step(ctx)
        except Exception as exc:
            result = StageResult(
                name=getattr(step, "stage_name", step.__name__),
                status="error",
                note=f"{type(exc).__name__}: {exc}",
            )
        result.ms = round((time.perf_counter() - start) * 1000, 2)
        trace.append(result)
        if on_stage:
            on_stage(result)
    ctx["trace"] = trace
    return trace
