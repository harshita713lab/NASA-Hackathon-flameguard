import pytest

from app.curated import (
    CURATED_DOCUMENTS,
    find_curated_hits,
    matches_filters,
    normalize_fuel,
    normalize_mission,
    normalize_pillar,
    query_tokens,
    result_key,
    tokenize,
)


def _doc(doc_id, text="", keywords=None, fuel="Solid", pillar=None, environments=None, experiment="Test"):
    return {
        "id": doc_id,
        "experiment": experiment,
        "fuel_state": fuel,
        "pillar": pillar,
        "environments": environments or ["ISS"],
        "source": "unit test",
        "text": text,
        "keywords": keywords or [],
    }


@pytest.mark.parametrize("value", [None, "", "  ", "All", "all", "Any", "None"])
def test_normalize_fuel_treats_open_values_as_none(value):
    assert normalize_fuel(value) is None


def test_normalize_fuel_trims_known_values():
    assert normalize_fuel("Solid") == "Solid"
    assert normalize_fuel("  Liquid  ") == "Liquid"


@pytest.mark.parametrize(
    "value,expected",
    [
        ("ISS", "ISS"),
        ("iss", "ISS"),
        ("space station", "ISS"),
        ("lunar", "Lunar Base"),
        ("Lunar Base", "Lunar Base"),
        ("eva", "Spacesuit EVA"),
        ("Spacesuit EVA", "Spacesuit EVA"),
        ("Mars", "Mars"),
        ("All", None),
        ("", None),
        (None, None),
    ],
)
def test_normalize_mission(value, expected):
    assert normalize_mission(value) == expected


@pytest.mark.parametrize(
    "value,expected",
    [
        ("Prevention", "Prevention"),
        ("prevention", "Prevention"),
        ("DETECTION", "Detection"),
        ("suppression", "Suppression"),
        ("ALL", None),
        ("Other", "Other"),
        (None, None),
    ],
)
def test_normalize_pillar(value, expected):
    assert normalize_pillar(value) == expected


def test_tokenize_lowercases_and_keeps_decimals():
    tokens = tokenize("Flame spread 2.2 mm/s at 16% O2")
    assert "2.2" in tokens
    assert "flame" in tokens
    assert "o2" in tokens


def test_query_tokens_expands_aliases_and_drops_stopwords():
    tokens = query_tokens("How does O2 pressure affect the fire")
    assert "o2" in tokens
    assert "oxygen" in tokens
    assert "pressure" in tokens
    assert "psi" in tokens
    assert "fire" in tokens
    assert "flame" in tokens
    assert "the" not in tokens
    assert "how" not in tokens


def test_query_tokens_returns_empty_for_stopwords_only():
    assert query_tokens("what is the of") == set()


def test_matches_filters_accepts_matching_documents():
    doc = _doc("x", fuel="Solid", pillar="Prevention", environments=["ISS", "Lunar Base"])
    assert matches_filters(doc, "Solid", "Lunar Base", "Prevention")


def test_matches_filters_rejects_wrong_fuel():
    doc = _doc("x", fuel="Liquid")
    assert not matches_filters(doc, "Solid", None, None)


def test_matches_filters_rejects_missing_environment():
    doc = _doc("x", environments=["ISS"])
    assert not matches_filters(doc, None, "Lunar Base", None)


def test_matches_filters_rejects_wrong_pillar():
    doc = _doc("x", pillar="Detection")
    assert not matches_filters(doc, None, None, "Suppression")


def test_matches_filters_accepts_unlabelled_pillar():
    doc = _doc("x", pillar=None)
    assert matches_filters(doc, None, None, None)


def test_find_curated_hits_returns_empty_for_blank_query():
    assert find_curated_hits(CURATED_DOCUMENTS, "the of and") == []


def test_find_curated_hits_ranks_keyword_matches_above_body_matches():
    documents = [
        _doc("body", text="pmma is discussed here"),
        _doc("keyword", keywords=["pmma"]),
    ]
    hits = find_curated_hits(documents, "pmma")
    assert [doc["id"] for doc in hits] == ["keyword", "body"]


def test_find_curated_hits_breaks_score_ties_by_id():
    documents = [_doc("c", keywords=["pmma"]), _doc("a", keywords=["pmma"]), _doc("b", keywords=["pmma"])]
    hits = find_curated_hits(documents, "pmma")
    assert [doc["id"] for doc in hits] == ["a", "b", "c"]


def test_find_curated_hits_prefers_bass2_for_flame_spread_query():
    hits = find_curated_hits(CURATED_DOCUMENTS, "PMMA flame spread rate", top_k=4)
    ids = [doc["id"] for doc in hits]
    assert hits[0]["experiment"] == "BASS-II"
    assert hits[0]["id"] in {"bass2-thick-pmma-slabs", "bass2-thin-pmma-steady-spread"}
    assert "bass2-thin-pmma-steady-spread" in ids
    assert len(hits) <= 12


def test_find_curated_hits_filters_by_fuel():
    hits = find_curated_hits(CURATED_DOCUMENTS, "flame oxygen suppression", fuel_filter="Liquid", top_k=10)
    assert hits
    assert {doc["fuel_state"] for doc in hits} == {"Liquid"}


def test_find_curated_hits_filters_by_mission():
    hits = find_curated_hits(CURATED_DOCUMENTS, "oxygen flammability material", mission="Lunar Base", top_k=10)
    assert hits
    assert all("Lunar Base" in doc["environments"] for doc in hits)


def test_find_curated_hits_filters_by_pillar():
    hits = find_curated_hits(CURATED_DOCUMENTS, "suppression inert gas", pillar="Suppression", top_k=10)
    assert hits
    assert {doc["pillar"] for doc in hits} == {"Suppression"}


def test_find_curated_hits_respects_top_k_window():
    one = find_curated_hits(CURATED_DOCUMENTS, "oxygen flame", top_k=1)
    ten = find_curated_hits(CURATED_DOCUMENTS, "oxygen flame", top_k=10)
    assert 0 < len(one) <= 8
    assert len(ten) <= 30
    assert len(one) <= len(ten)


def test_result_key_normalises_and_truncates():
    key = result_key("  The FLAME   Spreads  " + "x" * 200)
    assert key.startswith("the flame spreads")
    assert len(key) == 120
    assert result_key(None) == ""
