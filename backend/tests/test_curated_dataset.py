import json
from pathlib import Path

import pytest

from app.curated import CURATED_PATH, PILLAR_NAMES, load_curated_documents

ALLOWED_FUEL = {"Solid", "Liquid", "Mixed"}
ALLOWED_ENVIRONMENTS = {"ISS", "Lunar Base", "Spacesuit EVA"}
REQUIRED_FIELDS = (
    "id",
    "experiment",
    "fuel_state",
    "environments",
    "source",
    "text",
    "keywords",
)


@pytest.fixture(scope="module")
def dataset():
    with CURATED_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


@pytest.fixture(scope="module")
def documents(dataset):
    return dataset["documents"]


def test_dataset_file_is_valid_json(dataset):
    assert isinstance(dataset, dict)
    assert isinstance(dataset["documents"], list)
    assert dataset["version"]


def test_dataset_has_expected_size(documents):
    assert len(documents) == 17


def test_document_ids_are_unique(documents):
    ids = [doc["id"] for doc in documents]
    assert len(ids) == len(set(ids))


def test_every_document_has_required_fields(documents):
    for doc in documents:
        for field in REQUIRED_FIELDS:
            assert field in doc, f"{doc.get('id')} is missing {field}"
            assert doc[field], f"{doc.get('id')} has an empty {field}"


def test_fuel_states_are_supported(documents):
    for doc in documents:
        assert doc["fuel_state"] in ALLOWED_FUEL, doc["id"]


def test_environments_are_supported(documents):
    for doc in documents:
        assert isinstance(doc["environments"], list)
        assert doc["environments"], doc["id"]
        for environment in doc["environments"]:
            assert environment in ALLOWED_ENVIRONMENTS, doc["id"]


def test_pillars_are_valid_when_present(documents):
    for doc in documents:
        if doc.get("pillar") is not None:
            assert doc["pillar"] in PILLAR_NAMES, doc["id"]


def test_sources_and_citations_are_present(documents):
    for doc in documents:
        assert len(doc["source"]) > 3, doc["id"]
        assert doc.get("citation"), doc["id"]


def test_every_mission_environment_is_covered(documents):
    covered = {env for doc in documents for env in doc["environments"]}
    assert ALLOWED_ENVIRONMENTS.issubset(covered)


def test_every_safety_pillar_is_covered(documents):
    covered = {doc.get("pillar") for doc in documents}
    assert set(PILLAR_NAMES).issubset(covered)


def test_every_fuel_state_is_covered(documents):
    covered = {doc["fuel_state"] for doc in documents}
    assert ALLOWED_FUEL.issubset(covered)


@pytest.mark.parametrize(
    "needle",
    [
        "2.2 mm/s",
        "1 cm/s",
        "3.5 cm/s",
        "16 percent",
        "Saffire",
        "40 x 100 cm",
        "FLEX-2",
        "CO2",
        "SAME",
        "30-34 percent",
        "10.2 psi",
        "100 percent oxygen",
        "4.3 psi",
        "14.7 psi",
    ],
)
def test_key_scientific_figures_are_present(documents, needle):
    corpus = " ".join(doc["text"] for doc in documents)
    assert needle in corpus


def test_every_curated_text_is_substantive(documents):
    for doc in documents:
        assert len(doc["text"]) >= 120, doc["id"]
        assert len(doc["keywords"]) >= 5, doc["id"]


def test_load_curated_documents_reads_the_default_dataset():
    assert len(load_curated_documents()) == 17


def test_load_curated_documents_handles_missing_file(tmp_path):
    assert load_curated_documents(tmp_path / "missing.json") == []


def test_load_curated_documents_handles_corrupt_file(tmp_path):
    broken = tmp_path / "broken.json"
    broken.write_text("{not valid json", encoding="utf-8")
    assert load_curated_documents(broken) == []


def test_load_curated_documents_handles_missing_documents_key(tmp_path):
    empty = tmp_path / "empty.json"
    empty.write_text("{}", encoding="utf-8")
    assert load_curated_documents(empty) == []


def test_load_curated_documents_supports_custom_path(tmp_path):
    payload = {
        "version": "test",
        "documents": [
            {
                "id": "only",
                "experiment": "Test",
                "fuel_state": "Solid",
                "environments": ["ISS"],
                "source": "unit test",
                "text": "x" * 150,
                "keywords": ["a", "b", "c", "d", "e"],
            }
        ],
    }
    path = Path(tmp_path) / "custom.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    loaded = load_curated_documents(path)
    assert [doc["id"] for doc in loaded] == ["only"]
