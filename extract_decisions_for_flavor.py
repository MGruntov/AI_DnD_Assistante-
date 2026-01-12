#!/usr/bin/env python3
"""
Extract all decisions from character_decision_tree.json and create a JSON
with structure: {decision_id: {description, relevant_rules, flavor_text}}

Also uses BM25-based retriever (retriever.py) to find relevant SRD rules for each decision.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any

def build_search_query(decision_id: str, title: str, description: str) -> str:
    """
    Build a search query from decision ID, title, and description.
    Splits the ID by underscores and combines with the title and description.
    """
    # Split decision ID by underscores to get keywords
    id_parts = decision_id.replace('_', ' ').lower().split()
    
    # Combine ID parts with title and description
    query_parts = id_parts + [title.lower(), description.lower()]
    query = ' '.join(query_parts).strip()
    
    return query

def retrieve_relevant_rules(query: str, retriever) -> List[Dict[str, Any]]:
    """
    Use BM25 retriever to find relevant SRD rule blocks.
    Returns a list of {title, path, url, score, text} objects with full text.
    """
    try:
        results = retriever.retrieve(query, k=3)  # Get top 3 results
        
        # Format results for storage
        formatted = []
        for result in results:
            # Get path as list
            path = result.get('path', [])
            path_str = ' > '.join(path) if isinstance(path, list) else str(path)
            
            formatted.append({
                'title': result.get('title', ''),
                'path': path_str,
                'url': result.get('url', ''),
                'score': round(result.get('score', 0.0), 2),
                'text': result.get('text', '')
            })
        
        return formatted
    except Exception as e:
        print(f"Warning: Failed to retrieve rules for query '{query}': {e}", file=sys.stderr)
        return []

def extract_decisions():
    """Extract decisions from tree and augment with SRD rule retrieval."""
    tree_path = Path(__file__).parent / 'character_decision_tree.json'
    
    if not tree_path.exists():
        print(f"Error: {tree_path} not found")
        return
    
    # Try to load retriever if toc_entries.json exists
    retriever = None
    toc_path = Path(__file__).parent / 'toc_entries.json'
    
    if toc_path.exists():
        try:
            from retriever import SRDRetriever
            print(f"Loading SRD retriever from {toc_path}...")
            retriever = SRDRetriever(str(toc_path))
            print("Retriever loaded successfully.")
        except ImportError as e:
            print(f"Warning: Could not import SRDRetriever: {e}", file=sys.stderr)
            print("Continuing without SRD rule retrieval...", file=sys.stderr)
        except Exception as e:
            print(f"Warning: Failed to initialize retriever: {e}", file=sys.stderr)
            print("Continuing without SRD rule retrieval...", file=sys.stderr)
    else:
        print(f"Info: {toc_path} not found. Skipping SRD rule retrieval.", file=sys.stderr)
    
    with open(tree_path, 'r') as f:
        data = json.load(f)
    
    # Handle both array and object with 'decisions' key
    decisions = data if isinstance(data, list) else data.get('decisions', [])
    
    flavor_structure = {}
    processed = 0
    
    for decision in decisions:
        decision_id = decision.get('id', 'unknown')
        title = decision.get('title', '')
        description = decision.get('description', '')
        # Retrieve SRD rules if retriever is available
        srd_rules = []
        if retriever:
            search_query = build_search_query(decision_id, title, description)
            srd_rules = retrieve_relevant_rules(search_query, retriever)
            if srd_rules:
                print(f"  {decision_id}: Found {len(srd_rules)} relevant SRD rules")
        
        # Create the decision entry
        flavor_structure[decision_id] = {
            'title': title,
            'description': description,
            'srd_rules': srd_rules,
            'flavor_text': ''  # Empty, to be filled in
        }
        
        processed += 1
        if processed % 50 == 0:
            print(f"Processed {processed}/{len(decisions)} decisions...", file=sys.stderr)
    
    # Save to JSON
    output_path = Path(__file__).parent / 'decisions_flavor_template.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(flavor_structure, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtracted {len(flavor_structure)} decisions to {output_path}")
    if retriever:
        print(f"Populated {len([d for d in flavor_structure.values() if d.get('srd_rules')])} decisions with SRD rules")
    print(f"Total decisions: {len(flavor_structure)}")

if __name__ == '__main__':
    extract_decisions()
