"""
LLM Client for interfacing with language models.
Supports OpenAI API and other compatible endpoints.
"""

import os
import json
from typing import Optional, Dict, Any
from openai import OpenAI


class LLMClient:
    """Client for interacting with language models."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4",
        base_url: Optional[str] = None
    ):
        """
        Initialize LLM client.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4)
            base_url: Optional base URL for API endpoint
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        
        if not self.api_key:
            # For testing without API key, create a mock client
            self.client = None
        else:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url=base_url
            )
    
    def generate_completion(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        response_format: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Generate a completion from the LLM.
        
        Args:
            prompt: User prompt
            system_message: Optional system message
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            response_format: Optional response format (e.g., {"type": "json_object"})
            
        Returns:
            Generated text response
        """
        if not self.client:
            # Return mock response for testing
            return self._mock_response(prompt, response_format)
        
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})
        
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        
        if max_tokens:
            kwargs["max_tokens"] = max_tokens
        if response_format:
            kwargs["response_format"] = response_format
        
        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""
    
    def _mock_response(self, prompt: str, response_format: Optional[Dict[str, str]] = None) -> str:
        """
        Generate a mock response for testing without API key.
        
        Args:
            prompt: User prompt
            response_format: Optional response format
            
        Returns:
            Mock response
        """
        # Simple mock responses based on prompt content
        if response_format and response_format.get("type") == "json_object":
            if "character" in prompt.lower():
                return json.dumps({
                    "name": "Mock Character",
                    "race": "Human",
                    "class": "Fighter",
                    "level": 1,
                    "ability_scores": {
                        "strength": 16,
                        "dexterity": 14,
                        "constitution": 15,
                        "intelligence": 10,
                        "wisdom": 12,
                        "charisma": 8
                    }
                })
            return "{}"
        
        return "Mock LLM response for testing purposes."
