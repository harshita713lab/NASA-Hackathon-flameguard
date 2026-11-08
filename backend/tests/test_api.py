import pytest

VALID_QUERY = "PMMA flame spread rate"


def test_health_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"]


def test_search_returns_synthesized_answer(client, store):
    response = client.post("/api/search", json={"query": VALID_QUERY, "top_k": 4})
    assert response.status_code == 200
    body = response.json()
    assert body["synthesized_answer"]
    assert body["raw_results"]
    for result in body["raw_results"]:
        assert set(result) >= {
            "text",
            "experiment",
            "fuel_state",
            "source",
            "pillar",
            "environments",
            "citation",
        }
        assert isinstance(result["environments"], list)


def test_search_prefers_curated_records(client, store):
    response = client.post("/api/search", json={"query": VALID_QUERY})
    body = response.json()
    assert body["raw_results"][0]["experiment"] == "BASS-II"
    assert body["raw_results"][0]["fuel_state"] == "Solid"
    assert body["raw_results"][0]["pillar"] == "Prevention"


def test_search_filters_by_mission(client, store):
    response = client.post(
        "/api/search",
        json={"query": "oxygen flammability material", "mission": "Lunar Base", "top_k": 5},
    )
    assert response.status_code == 200
    for result in response.json()["raw_results"]:
        assert "Lunar Base" in result["environments"]


def test_search_filters_by_fuel_state(client, store):
    response = client.post(
        "/api/search",
        json={"query": "flame spread and suppression", "fuel_filter": "Solid", "top_k": 6},
    )
    assert response.status_code == 200
    results = response.json()["raw_results"]
    assert results
    assert {result["fuel_state"] for result in results} == {"Solid"}


def test_search_filters_by_safety_pillar(client, store):
    response = client.post(
        "/api/search",
        json={"query": "suppression inert gas extinguishment", "pillar": "Suppression", "top_k": 5},
    )
    assert response.status_code == 200
    results = response.json()["raw_results"]
    assert results
    assert {result["pillar"] for result in results} == {"Suppression"}


def test_search_accepts_all_as_open_filter(client, store):
    response = client.post(
        "/api/search",
        json={
            "query": "oxygen flame",
            "fuel_filter": "All",
            "mission": "All",
            "pillar": "All",
            "top_k": 4,
        },
    )
    assert response.status_code == 200
    assert response.json()["raw_results"]


def test_search_merges_pinecone_results_when_curated_is_empty(client, store, make_doc):
    store.documents = [
        make_doc(
            "Vector passage about flame spread in the ISS cabin.",
            experiment="BASS-II",
            fuel_state="Solid",
            source="vector.pdf",
            pillar="Prevention",
            environments=["ISS"],
            citation="vector citation",
        ),
        make_doc(
            "Second vector passage about smoke detection.",
            experiment="SAME",
            fuel_state="Mixed",
            source="vector2.pdf",
            pillar="Detection",
            environments=["ISS"],
        ),
    ]

    response = client.post("/api/search", json={"query": "zqxv wplk", "top_k": 4})
    assert response.status_code == 200
    results = response.json()["raw_results"]
    assert [result["experiment"] for result in results] == ["BASS-II", "SAME"]
    assert results[0]["citation"] == "vector citation"


def test_search_deduplicates_identical_passages(client, store, make_doc):
    from app.curated import CURATED_DOCUMENTS

    top_text = CURATED_DOCUMENTS[0]["text"]
    store.documents = [
        make_doc(top_text, experiment="BASS-II", fuel_state="Solid", source="dup.pdf", environments=["ISS"])
    ]

    response = client.post("/api/search", json={"query": VALID_QUERY, "top_k": 5})
    results = response.json()["raw_results"]
    keys = [" ".join(result["text"].lower().split())[:120] for result in results]
    assert len(keys) == len(set(keys))


def test_search_rewrites_figure_paths(client, store, make_doc, api_module):
    store.documents = [
        make_doc(
            "See figure data/images/plot.png for the spread curve.",
            experiment="BASS-II",
            fuel_state="Solid",
            source="figure.pdf",
            environments=["ISS"],
        )
    ]

    response = client.post("/api/search", json={"query": "zqxv wplk", "top_k": 4})
    text = response.json()["raw_results"][0]["text"]
    assert "data/images/" not in text
    assert f"{api_module.PUBLIC_BASE_URL}/static_images/plot.png" in text


def test_search_excludes_pinecone_docs_with_wrong_environment(client, store, make_doc):
    store.documents = [
        make_doc(
            "Mars habitat ventilation passage.",
            experiment="Mars Base",
            fuel_state="Mixed",
            source="mars.pdf",
            environments=["Mars"],
        )
    ]

    response = client.post(
        "/api/search",
        json={"query": "zqxv wplk", "mission": "Lunar Base", "top_k": 4},
    )
    assert response.status_code == 200
    assert response.json()["raw_results"] == []


def test_search_survives_pinecone_failure(client, store):
    store.fail = True
    response = client.post("/api/search", json={"query": VALID_QUERY, "top_k": 4})
    assert response.status_code == 200
    assert response.json()["raw_results"]


def test_search_survives_unavailable_vector_store(client, api_module, monkeypatch):
    monkeypatch.setattr(api_module, "vectorstore", None)
    response = client.post("/api/search", json={"query": VALID_QUERY, "top_k": 4})
    assert response.status_code == 200
    assert response.json()["raw_results"]


@pytest.mark.parametrize("payload", [
    {"query": "abcd"},
    {"query": "     "},
    {"query": ""},
    {},
])
def test_search_rejects_short_queries(client, store, payload):
    assert client.post("/api/search", json=payload).status_code == 422


def test_search_rejects_unknown_mission(client, store):
    response = client.post("/api/search", json={"query": VALID_QUERY, "mission": "Mars"})
    assert response.status_code == 422


def test_search_rejects_unknown_fuel(client, store):
    response = client.post("/api/search", json={"query": VALID_QUERY, "fuel_filter": "Gas"})
    assert response.status_code == 422


def test_search_rejects_unknown_pillar(client, store):
    response = client.post("/api/search", json={"query": VALID_QUERY, "pillar": "Mitigation"})
    assert response.status_code == 422


@pytest.mark.parametrize("top_k", [0, 11, -3])
def test_search_rejects_out_of_range_top_k(client, store, top_k):
    response = client.post("/api/search", json={"query": VALID_QUERY, "top_k": top_k})
    assert response.status_code == 422


def test_search_sanitizes_whitespace(client, store):
    response = client.post("/api/search", json={"query": "  flame    spread   in   microgravity  "})
    assert response.status_code == 200
    assert response.json()["raw_results"]
