"""
AI-Assisted Journaling Engine.
Transforms rough gameplay notes into polished narrative entries.
"""

from typing import Optional, List
from pydantic import BaseModel
from ada.utils.llm_client import LLMClient


class JournalEntry(BaseModel):
    """A polished journal entry."""
    title: str
    content: str
    session_number: Optional[int] = None
    characters: List[str] = []
    locations: List[str] = []
    key_events: List[str] = []


class JournalEngine:
    """
    AI-assisted journaling system that transforms rough gameplay notes
    into polished narrative entries in the style of a fantasy adventure chronicle.
    """
    
    MAX_EVENTS_IN_SUMMARY = 10
    
    SYSTEM_PROMPT = """You are a skilled fantasy chronicler and storyteller specializing in D&D campaign journals.
Your task is to transform rough gameplay notes into engaging, polished narrative entries.

Guidelines:
- Write in an immersive, narrative style that captures the adventure's atmosphere
- Maintain consistency with D&D fantasy settings and tone
- Include character names, locations, and key events clearly
- Use vivid descriptions while staying true to the events described
- Structure entries with clear beginning, middle, and end
- Keep the original facts and events intact while enhancing the narrative
- Write in past tense, as if recounting the adventure

Format the output as a polished journal entry with a title."""

    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize the journal engine.
        
        Args:
            llm_client: Optional LLM client (creates default if not provided)
        """
        self.llm_client = llm_client or LLMClient()
    
    def polish_entry(
        self,
        rough_notes: str,
        session_number: Optional[int] = None,
        additional_context: Optional[str] = None
    ) -> JournalEntry:
        """
        Transform rough gameplay notes into a polished narrative entry.
        
        Args:
            rough_notes: Raw notes from the gameplay session
            session_number: Optional session number for tracking
            additional_context: Optional additional context to help with narrative
            
        Returns:
            Polished JournalEntry with structured narrative content
            
        Example:
            >>> engine = JournalEngine()
            >>> notes = "Party fought goblins. Found treasure. Went to town."
            >>> entry = engine.polish_entry(notes, session_number=1)
        """
        prompt = self._build_prompt(rough_notes, session_number, additional_context)
        
        response = self.llm_client.generate_completion(
            prompt=prompt,
            system_message=self.SYSTEM_PROMPT,
            temperature=0.7,  # Higher temperature for creative narrative
            max_tokens=1500
        )
        
        # Extract structured information
        entry_data = self._parse_response(response, session_number)
        
        return JournalEntry(**entry_data)
    
    def _build_prompt(
        self,
        rough_notes: str,
        session_number: Optional[int],
        additional_context: Optional[str]
    ) -> str:
        """Build the LLM prompt from rough notes."""
        prompt_parts = []
        
        if session_number:
            prompt_parts.append(f"Session {session_number}")
        
        prompt_parts.append("Transform these gameplay notes into a polished journal entry:\n")
        prompt_parts.append(rough_notes)
        
        if additional_context:
            prompt_parts.append(f"\nAdditional context: {additional_context}")
        
        prompt_parts.append("\nProvide:")
        prompt_parts.append("1. A compelling title for the entry")
        prompt_parts.append("2. A polished narrative that expands on the notes")
        prompt_parts.append("3. List key characters mentioned (after the narrative)")
        prompt_parts.append("4. List locations visited (after characters)")
        prompt_parts.append("5. List major events (after locations)")
        prompt_parts.append("\nFormat: Title, then narrative, then lists.")
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, response: str, session_number: Optional[int]) -> dict:
        """
        Parse the LLM response into structured journal entry data.
        
        Args:
            response: Raw response from LLM
            session_number: Optional session number
            
        Returns:
            Dictionary with parsed entry data
        """
        lines = response.strip().split("\n")
        
        # Extract title (first non-empty line)
        title = ""
        content_lines = []
        characters = []
        locations = []
        key_events = []
        
        current_section = "title"
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check for section markers
            lower_line = line.lower()
            if "character" in lower_line and ":" in line:
                current_section = "characters"
                continue
            elif "location" in lower_line and ":" in line:
                current_section = "locations"
                continue
            elif ("event" in lower_line or "key moment" in lower_line) and ":" in line:
                current_section = "events"
                continue
            
            # Process based on current section
            if current_section == "title" and not title:
                # Remove common title markers
                title = line.replace("Title:", "").replace("**", "").replace("#", "").strip()
                current_section = "content"
            elif current_section == "content":
                # Check if we're hitting a list section
                if line.startswith("-") or line.startswith("•") or line.startswith("*"):
                    # Might be start of lists, check context
                    try:
                        line_index = lines.index(line + "\n")
                        if line_index > 0 and any(keyword in lines[line_index - 1].lower() 
                              for keyword in ["character", "location", "event"]):
                            current_section = "characters"
                    except ValueError:
                        # Line not found with newline, continue processing as content
                        pass
                content_lines.append(line)
            elif current_section == "characters":
                if line.startswith("-") or line.startswith("•") or line.startswith("*"):
                    characters.append(line.lstrip("-•* ").strip())
                elif line and not any(keyword in lower_line for keyword in ["location", "event"]):
                    characters.append(line)
            elif current_section == "locations":
                if line.startswith("-") or line.startswith("•") or line.startswith("*"):
                    locations.append(line.lstrip("-•* ").strip())
                elif line and "event" not in lower_line:
                    locations.append(line)
            elif current_section == "events":
                if line.startswith("-") or line.startswith("•") or line.startswith("*"):
                    key_events.append(line.lstrip("-•* ").strip())
                else:
                    key_events.append(line)
        
        # Fallback: if no structured data found, treat entire response as content
        if not title:
            title = f"Session {session_number}" if session_number else "Adventure Log"
        
        if not content_lines:
            content_lines = [response]
        
        content = "\n\n".join(content_lines).strip()
        
        return {
            "title": title,
            "content": content,
            "session_number": session_number,
            "characters": characters,
            "locations": locations,
            "key_events": key_events,
        }
    
    def summarize_campaign(self, entries: List[JournalEntry]) -> str:
        """
        Generate a campaign summary from multiple journal entries.
        
        Args:
            entries: List of journal entries to summarize
            
        Returns:
            Campaign summary text
        """
        if not entries:
            return "No entries to summarize."
        
        # Combine all entry information
        combined_info = []
        combined_info.append(f"Campaign spanning {len(entries)} sessions:\n")
        
        all_characters = set()
        all_locations = set()
        all_events = []
        
        for entry in entries:
            all_characters.update(entry.characters)
            all_locations.update(entry.locations)
            all_events.extend(entry.key_events)
            combined_info.append(f"Session {entry.session_number}: {entry.title}")
        
        prompt = f"""Summarize this D&D campaign based on the following information:

{chr(10).join(combined_info)}

Main Characters: {', '.join(all_characters) if all_characters else 'Unknown'}
Locations: {', '.join(all_locations) if all_locations else 'Unknown'}

Major Events:
{chr(10).join(f'- {event}' for event in all_events[:self.MAX_EVENTS_IN_SUMMARY])}

Provide a concise campaign summary (2-3 paragraphs) highlighting the main story arc."""
        
        response = self.llm_client.generate_completion(
            prompt=prompt,
            system_message=self.SYSTEM_PROMPT,
            temperature=0.7,
            max_tokens=800
        )
        
        return response
