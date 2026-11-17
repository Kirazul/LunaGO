import numpy as np
import pytest

from complaintlens.rag.knowledge import Chunk, Hit, KnowledgeBase
from complaintlens.rag.retrieval import (
    BM25Retriever,
    DenseRetriever,
    HybridRetriever,
    reciprocal_rank_fusion,
    search_with_summary,
)
from complaintlens.settings import get_settings


def chunk(cid: str) -> Chunk:
    return Chunk(cid, "en", cid.split("#")[0], "t", "h", "x")


def test_rrf_rewards_items_ranked_well_by_both_retrievers():
    a, b, c = chunk("A#1"), chunk("B#1"), chunk("C#1")
    fused = reciprocal_rank_fusion(
        [[Hit(a, 9), Hit(b, 5), Hit(c, 1)], [Hit(b, 0.9), Hit(c, 0.8), Hit(a, 0.1)]]
    )
    # b: 1/62 + 1/61 > a: 1/61 + 1/63 > c: 1/63 + 1/62
    assert [h.chunk.id for h in fused] == ["B#1", "A#1", "C#1"]


class KeywordEmbedder:
    """Deterministic toy embedder: one dimension per concept, so paraphrases share a vector."""

    model_name = "toy"
    concepts = (
        ("twice", "two payments", "deux fois", "deux paiements"),
        ("lost", "forgot", "oubli"),
    )

    def _vec(self, text: str) -> np.ndarray:
        t = text.lower()
        return np.array([1.0 if any(w in t for w in c) else 0.0 for c in self.concepts] + [0.01])

    def embed_documents(self, texts):
        return np.array([self._vec(t) for t in texts])

    embed_queries = embed_documents


@pytest.fixture(scope="module")
def kb():
    return KnowledgeBase.load(get_settings().help_center_dir)


def test_dense_retriever_finds_a_paraphrase_without_shared_words(kb):
    dense = DenseRetriever(kb, KeywordEmbedder())
    top = dense.search("my bank shows two payments", "en", k=1)[0]
    assert top.chunk.id == "HC-FARES#4"


def test_hybrid_returns_k_results_from_both_sources(kb):
    hybrid = HybridRetriever(BM25Retriever(kb), DenseRetriever(kb, KeywordEmbedder()))
    hits = hybrid.search("charged twice for my ride", "en", k=3)
    assert len(hits) == 3 and hits[0].chunk.id == "HC-FARES#4"


class ScriptedRetriever:
    """Returns a fixed ranking per language, to test how the two searches are combined."""

    name = "scripted"

    def __init__(self, rankings: dict[str, list[str]]) -> None:
        self.rankings = rankings

    def search(self, query: str, lang: str, k: int = 4) -> list[Hit]:
        ids = self.rankings[lang][:k]
        return [Hit(Chunk(i, lang, "A", "t", "h", "x"), 1.0 - n / 100) for n, i in enumerate(ids)]


def two_language_kb(ids: list[str]) -> KnowledgeBase:
    return KnowledgeBase([Chunk(i, lang, "A", "t", "h", "x") for i in ids for lang in ("en", "fr")])


def test_the_summary_search_decides_which_sections_the_reply_writer_gets():
    # Regression (found on 2026-11-17 with "j'ai été facturé deux fois pour ma course LG-40029.
    # Mon numéro : [PHONE_1]"): the summary search ranked the right section first, the search on
    # the customer's words (greeting, ride ID, placeholder) missed it, and fusing the two dropped
    # it behind sections that were mediocre in both lists.
    ids = [f"A#{n}" for n in range(1, 13)]
    retriever = ScriptedRetriever(
        {
            "fr": ["A#2", "A#3", "A#4", "A#5", "A#6", "A#7", "A#8", "A#9", "A#10", "A#11"],
            "en": ["A#1", "A#3", "A#4", "A#5", "A#6", "A#2", "A#7", "A#8", "A#9", "A#10"],
        }
    )
    hits = search_with_summary(retriever, two_language_kb(ids), "texte du client", "summary", "fr")
    assert [h.chunk.id for h in hits] == ["A#1", "A#3", "A#4", "A#5"]
    assert all(h.chunk.lang == "fr" for h in hits)  # same sections, in the customer's language


def test_without_a_summary_the_customers_words_are_searched():
    retriever = ScriptedRetriever({"fr": ["A#2", "A#3", "A#4", "A#5", "A#6"], "en": ["A#1"]})
    hits = search_with_summary(retriever, two_language_kb(["A#1"]), "texte du client", None, "fr")
    assert [h.chunk.id for h in hits] == ["A#2", "A#3", "A#4", "A#5"]


def test_sections_missing_in_the_customers_language_are_completed_from_their_words():
    sections = [("A#1", "en"), ("A#2", "en"), ("A#2", "fr"), ("A#3", "fr")]
    kb = KnowledgeBase([Chunk(i, lang, "A", "t", "h", "x") for i, lang in sections])
    retriever = ScriptedRetriever({"fr": ["A#3", "A#2"], "en": ["A#1", "A#2"]})
    hits = search_with_summary(retriever, kb, "texte du client", "summary", "fr")
    assert [h.chunk.id for h in hits] == ["A#2", "A#3"]  # A#1 has no French version
