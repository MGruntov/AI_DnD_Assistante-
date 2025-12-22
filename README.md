# Natural Language D&D Character Sheet Assistant 
### Problem & Motivation
 Creating a character for a tabletop role-playing game (TTRPG), such as Dungeons & Dragons 5th Edition (D&D 5e) [1], is a highly creative but mechanically complex process. Players often have a vivid narrative concept—a half-elf ranger abandoned in the woods, a charming rogue with a tragic past—but struggle to translate this into valid, rule-compliant, and optimized character sheet mechanics (e.g., ability scores, class features, spells, equipment). This mechanical "heavy lifting" can deter new players and disrupt creative flow for veterans, forcing them to switch between storytelling and rulebook look-ups.
Our project, the AI D&D Assistant (ADA), addresses this by enabling users to describe their character concept in plain English and instantly generate a complete, valid character sheet, bridging the gap between narrative creativity and mechanical correctness.
### System Objectives
- Core Objective: Translate a short natural-language character concept into a complete and valid D&D 5e character sheet, including ability scores, skills, proficiencies, equipment, and spells.
 
- Secondary Objective: Provide an AI-assisted journaling feature that transforms rough notes about in-game events (e.g., “We fought a goblin ambush…”) into polished, concise first-person or third-person journal entries for the character sheet’s Notes section, sustaining a narrative-first workflow throughout play.
### Existing Technology and Theoretical Review
 Current tools either rely on structured, menu-driven workflows (e.g., D&D Beyond [2]) or generic LLM assistants that generate backstories or art but not consistently valid stat blocks. Tools like CharGen [3] automate stat generation but still require structured inputs rather than pure natural language. ADA instead focuses on Narrative-to-Mechanics Translation with minimal user structure, acting as a creativity support system by reducing cognitive load.
The design aligns with Human-AI Co-creation, where AI supports rather than replaces human creativity. The AI-produced sheet becomes a strong, rule-correct baseline that the player iteratively refines, promoting a sense of agency and collaborative synergy.
### Approach (Intelligence Design)
 The system’s “intelligence” is built around a specialized LLM orchestrated through a hybrid design.

- LLM-based Components: Role Configuration: The model is framed as an “Expert D&D 5e Rule Arbitrator” and “Narrative Translator.”


- Prompting Strategy: The model extracts core attributes (race, class, background, personality traits, key strengths) and assigns appropriate mechanics based on D&D 5e rules.


- Orchestration Logic: A deterministic validation layer checks race-based bonuses, starting equipment, proficiency bonus, saving throws, and other common rule elements. Detected violations trigger an automatic self-correction loop before results reach the user.

- Algorithmic Components: Rule Database Integration: A database of D&D 5e mechanics (spells, equipment, proficiency tables) ensures mechanical accuracy.

- Template Generation: Output is placed into a fixed JSON or structured text template to guarantee completeness and consistency.

- Personalization/Search: Clustering or keyword matching may guide ambiguous class or spell assignments.


### Enabling Meaningful Human Interaction:
 The system reduces creative friction and encourages iterative collaboration. The user provides the narrative what, while the AI handles the mechanical how, allowing the player to act as editor and creative director over a solid, rule-correct baseline.

### References
Wizards of the Coast. (2014). Player’s handbook (5th ed.). Wizards of the Coast.
Wizards of the Coast. (n.d.). D&D Beyond. https://www.dndbeyond.com
CharGen. (n.d.). CharGen: D&D 5e character generator. https://char-gen.com/character

---

## Developer notes

### Backend (Cloudflare Worker)

- Gemini API key is provided via the Worker secret `GEMINI_API_KEY` (do not commit it).
- Optional debug toggle: set `ADA_DEBUG=1` (as a normal Worker variable) to include extra debug fields in some responses.
	- When enabled, AI endpoints include the currently selected Gemini model name (e.g. `models/gemini-2.5-flash`).

### AI-DM Step 8 (rolling checks) – early implementation

The backend now supports resolving an AI-requested check and continuing the story:

- `POST /api/ai-dm/resolve-check`
	- Body: `{ "username": string, "campaignId": string, "roll1"?: number, "roll2"?: number }`
	- Uses the current session's `pendingCheck` (DC/ability/skill/advantage) and the linked character sheet to compute totals.
	- Returns the roll result + a follow-up DM narration.
