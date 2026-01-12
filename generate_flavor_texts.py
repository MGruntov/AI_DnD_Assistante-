#!/usr/bin/env python3
"""
Generate flavor text for D&D character creation decisions using Google Gemini API.

For each decision in decisions_flavor_template.json:
1. Build a detailed prompt with the decision context and rules
2. Call Gemini to generate evocative flavor text
3. Update the flavor_text field
4. Save the enhanced JSON
"""

import json
import sys
import time
from pathlib import Path
from typing import Dict, Any

from google.genai import Client
import os

# Configure Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = Client(api_key=GEMINI_API_KEY)

MODEL = "gemini-2.0-flash-lite"  # Unlimited RPD for batch processing

def build_flavor_prompt(decision_id: str, decision_data: Dict[str, Any]) -> str:
    """
    Build a detailed prompt for Gemini to generate flavor text.
    
    Includes:
    a. Explanation of what a decision is
    b. The full decision entry with rules (truncated for token efficiency)
    c. Instructions for evocative, multi-perspective flavor generation
    """
    
    title = decision_data.get('title', '')
    description = decision_data.get('description', '')
    srd_rules = decision_data.get('srd_rules', [])
    
    # Format SRD rules for readability in prompt (truncated for efficiency)
    rules_text = ""
    if srd_rules:
        rules_text = "Relevant D&D 5e Rules:\n"
        # Limit to first 2 rules, 250 chars each, total max 600 chars for rules
        for i, rule in enumerate(srd_rules[:2], 1):
            rule_title = rule.get('title', 'Unknown')
            rule_path = rule.get('path', '')
            rule_text = rule.get('text', '')[:250]  # Reduced from 500 to 250 chars
            rules_text += f"\n{i}. {rule_title} ({rule_path})\n{rule_text}\n"
    
    prompt = f"""You are a creative D&D character writer crafting evocative flavor text.

CONTEXT: What is a Decision?
A decision is a meaningful choice a player makes during D&D character creation. It represents an aspect of their character's identity—class choice, ability score allocation, skill proficiency, spell selection, etc.

DECISION TO FLAVOR:
- ID: {decision_id}
- Title: {title}
- Description: {description}

RULES CONTEXT (automated retrieval - may not be fully relevant):
Note: The rules below are retrieved via automated keyword matching and serve as context only.
They may not be directly relevant to this decision. The title is the only guaranteed accurate identifier.

{rules_text}

TASK: Generate Flavor Text
Write evocative flavor text that describes a character who has made this decision. The text should:

1. **Capture Essence, Not Mechanics**: Describe the *feeling* and *identity* of having made this choice, not the mechanical rules themselves.

2. **Multiple Valid Interpretations (Horizontal Expansion)**: The same trait can manifest in radically different ways depending on character archetype and worldview. Present multiple valid interpretations:
   - Example: High Charisma could be seduction and charm, OR intimidation and dominance, OR diplomatic persuasion and leadership.
   - Example: Rage could be primal fury, OR disciplined control channeled into power, OR righteous indignation.
   - Use "or" or "and sometimes" to show how the same decision branches into different character archetypes.
   - Do NOT try to capture all possible interpretations—pick 2-3 that feel most vivid and contrasting.
   
3. **Depth at Any Level**: Whether this is a basic choice or advanced:
   - Higher levels of a class should deepen the interpretation (e.g., level 5 fighter has more honed, confident versions of the same trait as level 1)
   - Higher ability scores should intensify the manifestation and breadth of expression
   - But the core should remain: multiple valid ways the trait can be embodied

4. **Avoid Official Copying**: Do NOT copy D&D 5e rulebook text or spell descriptions. Create original flavor that is thematically aligned but distinct.

5. **Tone**: Poetic, immersive, first-person or omniscient perspective. 1-3 sentences, vivid and memorable.

Example (NOT to be copied, just style reference):
- For "Choose Strength +2": "Muscles ripple beneath armor worn smooth by countless campaigns. When you move, stone trembles. Enemies see not a person, but an advancing wall of raw power."
- For "Rage": "When rage takes hold, the world narrows to red. Control dissolves; only instinct remains. You are the storm, unleashed."

Now, generate original flavor text for the decision above:"""
    
    return prompt

def generate_flavor_for_decision(decision_id: str, decision_data: Dict[str, Any]) -> str:
    """
    Call Gemini API to generate flavor text for a single decision.
    Retries on 429 errors. Returns the generated flavor text, or empty string on error.
    """
    max_retries = 3
    retry_delay = 10  # seconds
    
    for attempt in range(max_retries):
        try:
            prompt = build_flavor_prompt(decision_id, decision_data)
            
            # Monitor prompt length
            prompt_length = len(prompt)
            print(f"    [Prompt: {prompt_length} chars]", file=sys.stderr)
            
            response = client.models.generate_content(
                model=MODEL,
                contents=prompt
            )
            
            if response.text:
                return response.text.strip()
            else:
                print(f"Warning: Empty response from Gemini for {decision_id}", file=sys.stderr)
                return ""
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                if attempt < max_retries - 1:
                    print(f"    [429 - Retry {attempt + 1}/{max_retries - 1}, waiting {retry_delay}s]", file=sys.stderr)
                    time.sleep(retry_delay)
                    continue
                else:
                    print(f"Error generating flavor for {decision_id}: {error_msg[:100]}", file=sys.stderr)
                    return ""
            else:
                print(f"Error generating flavor for {decision_id}: {error_msg[:100]}", file=sys.stderr)
                return ""
    
    return ""

def generate_all_flavor_texts():
    """
    Load decisions_flavor_template.json, generate flavor text for each decision,
    and save the updated JSON after every successful generation.
    Uses queue-based approach: skip decisions with existing flavor, retry on 429.
    """
    json_path = Path(__file__).parent / 'decisions_flavor_template.json'
    
    if not json_path.exists():
        print(f"Error: {json_path} not found")
        return
    
    print(f"Loading decisions from {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        decisions = json.load(f)
    
    # Count items that already have flavor text
    already_generated = sum(
        1 for decision_data in decisions.values()
        if decision_data.get('flavor_text', '').strip()
    )
    
    # Build queue of decisions that need flavor text
    queue = [
        (decision_id, decision_data)
        for decision_id, decision_data in decisions.items()
        if not decision_data.get('flavor_text', '').strip()
    ]
    
    total = len(decisions)
    to_generate = len(queue)
    generated_this_run = 0
    
    print(f"Found {total} decisions. {already_generated} already have flavor text. {to_generate} need generation.\n")
    
    while queue:
        decision_id, decision_data = queue.pop(0)
        processed = total - len(queue)
        total_generated = already_generated + generated_this_run
        
        # Show progress every 10 items
        if processed % 10 == 0:
            print(f"Progress: {processed}/{total} (total generated: {total_generated}, remaining: {len(queue)})", file=sys.stderr)
        
        # Generate flavor text (with retry on 429)
        flavor = generate_flavor_for_decision(decision_id, decision_data)
        
        if flavor:
            # Success: update and save
            decision_data['flavor_text'] = flavor
            decisions[decision_id] = decision_data
            generated_this_run += 1
            
            # Print flavor text to console for logging
            print(f"\n[{decision_id}]")
            print(flavor)
            
            # Save immediately after successful generation
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(decisions, f, indent=2, ensure_ascii=False)
            
            print(f"\n  [OK] Saved ({len(flavor)} chars)")
            
            # 20 second sleep to stay within rate limits
            time.sleep(20)
        else:
            # Failure: put back in queue for retry
            queue.append((decision_id, decision_data))
            print(f"  [RETRY LATER] Failed, re-queued ({len(queue)} in queue)", file=sys.stderr)
            # Brief pause before next attempt
            time.sleep(2)
    
    # Final summary
    print(f"\nCompleted!")
    print(f"Total decisions: {total}")
    print(f"Previously generated: {already_generated}")
    print(f"Generated this run: {generated_this_run}")
    print(f"Total flavor texts: {already_generated + generated_this_run}")
    print(f"Updated file: {json_path}")

if __name__ == '__main__':
    generate_all_flavor_texts()
