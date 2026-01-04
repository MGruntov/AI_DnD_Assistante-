"""
BM25-based RAG retriever for SRD JSON pages.

- Input: JSON list of entries with fields:
  { title, url, path, full_path, text }

- Retrieval: BM25 ranking (TF-IDF weighted keyword search)
"""

import json
from pathlib import Path
from typing import List
from rank_bm25 import BM25Okapi

from llama_index.core import Document


# -------------------------
# Config
# -------------------------

TOP_K = 5


# -------------------------
# Load documents
# -------------------------

def load_documents(json_path: str) -> List[Document]:
    with open(json_path, "r", encoding="utf-8") as f:
        entries = json.load(f)

    docs: List[Document] = []

    for e in entries:
        # Combine title, contents list, and text for indexing
        parts = [e['title']]
        if e.get('contents'):
            parts.append(" ".join(e['contents']))
        parts.append(e['text'])
        text = "\n\n".join(parts).strip()

        metadata = {
            "url": e["url"],
            "path": e.get("full_path", []),
            "section": e.get("full_path", [None])[0],
            "title": e["title"],
        }
        
        # Add contents field if present
        if e.get("contents"):
            metadata["contents"] = e["contents"]

        docs.append(
            Document(
                text=text,
                metadata=metadata,
            )
        )

    return docs


# -------------------------
# Build retriever
# -------------------------

def build_retriever(documents: List[Document]) -> BM25Okapi:
    """Build BM25 retriever from documents."""
    # Tokenize documents for BM25
    corpus = []
    for doc in documents:
        # Combine title and text, tokenize by whitespace
        text = (doc.metadata.get("title", "") + " " + doc.text).lower()
        tokens = text.split()
        corpus.append(tokens)
    
    return BM25Okapi(corpus)


# -------------------------
# Public API
# -------------------------

class SRDRetriever:
    def __init__(self, json_path: str):
        self.documents = load_documents(json_path)
        self.bm25 = build_retriever(self.documents)

    def retrieve(self, query: str, k: int = TOP_K):
        """Search documents using BM25 ranking."""
        # Tokenize query
        query_tokens = query.lower().split()
        
        # Get BM25 scores for all documents
        scores = self.bm25.get_scores(query_tokens)
        
        # Boost score for exact title matches (case-insensitive)
        query_lower = query.lower()
        for idx, doc in enumerate(self.documents):
            if doc.metadata.get("title", "").lower() == query_lower:
                scores[idx] = max(scores[idx], 100.0)  # Boost exact matches to top
        
        # Get top k results
        top_indices = sorted(
            range(len(scores)), 
            key=lambda i: scores[i], 
            reverse=True
        )[:k]
        
        results = []
        for idx in top_indices:
            doc = self.documents[idx]
            result_dict = {
                "title": doc.metadata.get("title"),
                "path": doc.metadata.get("path"),
                "url": doc.metadata.get("url"),
                "score": scores[idx],
                "text": doc.text,
            }
            # Add contents if available
            if doc.metadata.get("contents"):
                result_dict["contents"] = doc.metadata["contents"]
            
            results.append(result_dict)

        return results


# -------------------------
# CLI test
# -------------------------

if __name__ == "__main__":
    r = SRDRetriever("pages.json")

    q = "What does Darkvision do?"
    hits = r.retrieve(q)

    for h in hits:
        print("=" * 80)
        print("PATH:", " → ".join(h["path"]))
        print("URL:", h["url"])
        print(h["text"][:400])
