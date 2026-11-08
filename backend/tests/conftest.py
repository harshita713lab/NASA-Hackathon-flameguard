"""Shared pytest fixtures.

The API module initialises HuggingFace embeddings, Pinecone and Groq at import
time. Tests install lightweight stand-ins for those three providers so the suite
runs offline, is deterministic, and never touches a live index or model.
"""

import os
import sys
import types
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Keep the optional Gemini fallback disabled during tests.
os.environ.pop("GEMINI_API_KEY", None)

from langchain_core.messages import AIMessage  # noqa: E402


class FakeEmbeddings:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs


class FakeDocument:
    def __init__(self, page_content: str, metadata: dict | None = None):
        self.page_content = page_content
        self.metadata = metadata or {}


class FakeVectorStore:
    """Configurable Pinecone stand-in shared by the whole test session."""

    documents: list[FakeDocument] = []
    fail = False
    queries: list[str] = []

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    @classmethod
    def reset(cls) -> None:
        cls.documents = []
        cls.fail = False
        cls.queries = []

    def similarity_search(self, query: str, k: int = 4, **kwargs):
        type(self).queries.append(query)
        if type(self).fail:
            raise RuntimeError("pinecone unavailable")
        return list(type(self).documents[:k])


class FakeChatGroq:
    """Callable so ``ChatPromptTemplate | llm`` still builds a runnable chain."""

    response_text = "Stub synthesis grounded in the retrieved PSI passages."

    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def with_fallback(self, others):
        return self

    def __call__(self, payload):
        return AIMessage(content=type(self).response_text)


def _install_stub(name: str, **attrs) -> None:
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module


_install_stub("langchain_huggingface", HuggingFaceEmbeddings=FakeEmbeddings)
_install_stub("langchain_pinecone", PineconeVectorStore=FakeVectorStore)
_install_stub("langchain_groq", ChatGroq=FakeChatGroq)

# Imported after the stubs are registered so app.main picks up the fakes.
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def api_module():
    import app.main as main_module

    main_module.limiter.enabled = False
    return main_module


@pytest.fixture()
def store(api_module, monkeypatch):
    FakeVectorStore.reset()
    FakeChatGroq.response_text = "Stub synthesis grounded in the retrieved PSI passages."
    monkeypatch.setattr(api_module, "vectorstore", FakeVectorStore())
    return FakeVectorStore


@pytest.fixture()
def client(api_module):
    with TestClient(api_module.app) as test_client:
        yield test_client


@pytest.fixture()
def make_doc():
    def _make(page_content: str, **metadata) -> FakeDocument:
        return FakeDocument(page_content, metadata)

    return _make
