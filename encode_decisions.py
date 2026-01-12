#!/usr/bin/env python3
"""
Encode all character creation decisions using sentence transformers.

For each decision in decisions_flavor_template.json:
1. Combine title + description + flavor_text
2. Generate embeddings using sentence-transformers (MiniLM)
3. Save embeddings to decision_embeddings.json

The embeddings can be used for cosine similarity matching against user prompts.
"""

import json
from pathlib import Path
from typing import Dict, List
from sentence_transformers import SentenceTransformer

def load_decisions(json_path: Path) -> Dict:
    """Load decisions from JSON file."""
    print(f"Loading decisions from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_text_for_embedding(decision_id: str, decision_data: Dict) -> str:
    """
    Build text representation for embedding.
    Combines title, description, and flavor text.
    """
    title = decision_data.get('title', '')
    description = decision_data.get('description', '')
    flavor_text = decision_data.get('flavor_text', '')
    
    # Combine with newlines for better semantic separation
    parts = [title, description, flavor_text]
    text = '\n'.join(p.strip() for p in parts if p.strip())
    
    return text

def encode_all_decisions():
    """
    Load all decisions, generate embeddings, and save to file.
    """
    json_path = Path(__file__).parent / 'decisions_flavor_template.json'
    output_path = Path(__file__).parent / 'decision_embeddings.json'
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return
    
    # Load sentence transformer model
    print("Loading sentence transformer model (all-MiniLM-L6-v2)...")
    print("This will download the model on first run (~80MB)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Load decisions
    decisions = load_decisions(json_path)
    
    print(f"\nEncoding {len(decisions)} decisions...")
    
    # Build embeddings
    embeddings_data = {}
    
    for i, (decision_id, decision_data) in enumerate(decisions.items(), 1):
        # Build text for embedding
        text = build_text_for_embedding(decision_id, decision_data)
        
        # Skip if no content
        if not text.strip():
            print(f"Warning: Skipping {decision_id} (no content)")
            continue
        
        # Generate embedding
        embedding = model.encode(text, convert_to_tensor=False, normalize_embeddings=True)
        
        # Convert numpy array to list for JSON serialization
        embeddings_data[decision_id] = {
            'embedding': embedding.tolist(),
            'text_length': len(text)
        }
        
        # Progress update every 50 items
        if i % 50 == 0:
            print(f"  Encoded {i}/{len(decisions)} decisions...")
    
    # Save embeddings
    print(f"\nSaving embeddings to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(embeddings_data, f, indent=2)
    
    print(f"Done! Encoded {len(embeddings_data)} decisions.")
    print(f"Embedding dimensions: {len(list(embeddings_data.values())[0]['embedding'])}")
    print(f"Output file: {output_path}")

if __name__ == '__main__':
    encode_all_decisions()
