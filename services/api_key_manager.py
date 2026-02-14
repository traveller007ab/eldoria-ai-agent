"""
API Key Management Service
Handles validation, testing, and secure updates of AI provider API keys
"""

import os
import re
import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import requests


class KeyStatus(Enum):
    """Status of an API key"""

    VALID = "valid"
    INVALID = "invalid"
    PLACEHOLDER = "placeholder"
    MISSING = "missing"
    UNKNOWN = "unknown"


@dataclass
class KeyValidationResult:
    """Result of API key validation"""

    provider: str
    status: KeyStatus
    message: str
    last_validated: datetime
    can_make_requests: bool
    details: Optional[Dict] = None


class APIKeyManager:
    """Manages AI provider API keys"""

    # Environment variable names
    ENV_VARS = {
        "groq": "GROQ_API_KEY",
        "gemini": "GEMINI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "tavily": "TAVILY_API_KEY",
    }

    # Placeholder patterns
    PLACEHOLDER_PATTERNS = [
        r"your_\w+_key_here",
        r"placeholder",
        r"demo",
        r"test",
        r"xxxx",
        r"example",
        r"sample",
        r"fake",
        r"mock",
        r"sk-xxxxx",
        r"gsk-xxxxx",
    ]

    def __init__(self):
        self.validation_cache: Dict[str, KeyValidationResult] = {}
        self.cache_ttl_seconds = 300  # 5 minutes

    def get_key(self, provider: str) -> Optional[str]:
        """Get API key for a provider"""
        env_var = self.ENV_VARS.get(provider.lower())
        if not env_var:
            return None
        return os.environ.get(env_var)

    def is_placeholder(self, key: Optional[str]) -> bool:
        """Check if a key is a placeholder"""
        if not key or len(key) < 10:
            return True

        key_lower = key.lower()

        # Check against placeholder patterns
        for pattern in self.PLACEHOLDER_PATTERNS:
            if re.search(pattern, key_lower):
                return True

        # Check if it's obviously fake
        if key_lower in ["none", "null", "undefined", "", " "]:
            return True

        return False

    def validate_key_format(self, provider: str, key: str) -> Tuple[bool, str]:
        """
        Validate key format without making API calls
        Returns: (is_valid, message)
        """
        provider = provider.lower()

        if not key:
            return False, "Key is empty"

        if self.is_placeholder(key):
            return False, "Key appears to be a placeholder"

        # Provider-specific format validation
        if provider == "groq":
            # Groq keys start with "gsk_" and are ~51 characters
            if not key.startswith("gsk_"):
                return False, "Groq keys should start with 'gsk_'"
            if len(key) < 40:
                return False, "Groq key appears too short"

        elif provider == "gemini":
            # Gemini keys are typically ~39 characters
            if len(key) < 30:
                return False, "Gemini key appears too short"

        elif provider == "openrouter":
            # OpenRouter keys start with "sk-or-"
            if not key.startswith("sk-or-"):
                return False, "OpenRouter keys should start with 'sk-or-'"

        elif provider == "tavily":
            # Tavily keys start with "tvly-"
            if not key.startswith("tvly-"):
                return False, "Tavily keys should start with 'tvly-'"

        return True, "Key format appears valid"

    async def test_key_live(self, provider: str, key: str) -> KeyValidationResult:
        """
        Test if a key works by making a live API call
        This actually validates the key works
        """
        provider = provider.lower()

        # Check cache first
        cache_key = f"{provider}:{hash(key)}"
        if cache_key in self.validation_cache:
            cached = self.validation_cache[cache_key]
            # Check if cache is still valid
            if (
                datetime.now() - cached.last_validated
            ).seconds < self.cache_ttl_seconds:
                return cached

        try:
            if provider == "groq":
                result = await self._test_groq_key(key)
            elif provider == "gemini":
                result = await self._test_gemini_key(key)
            elif provider == "openrouter":
                result = await self._test_openrouter_key(key)
            elif provider == "tavily":
                result = await self._test_tavily_key(key)
            else:
                result = KeyValidationResult(
                    provider=provider,
                    status=KeyStatus.UNKNOWN,
                    message=f"Unknown provider: {provider}",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

            # Cache the result
            self.validation_cache[cache_key] = result
            return result

        except Exception as e:
            return KeyValidationResult(
                provider=provider,
                status=KeyStatus.INVALID,
                message=f"Test failed: {str(e)}",
                last_validated=datetime.now(),
                can_make_requests=False,
            )

    async def _test_groq_key(self, key: str) -> KeyValidationResult:
        """Test Groq API key"""
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": "Hi"}],
                    "max_tokens": 5,
                },
                timeout=10,
            )

            if response.status_code == 200:
                return KeyValidationResult(
                    provider="groq",
                    status=KeyStatus.VALID,
                    message="Key is valid and working",
                    last_validated=datetime.now(),
                    can_make_requests=True,
                    details={
                        "response_time_ms": response.elapsed.total_seconds() * 1000
                    },
                )
            elif response.status_code == 401:
                return KeyValidationResult(
                    provider="groq",
                    status=KeyStatus.INVALID,
                    message="Invalid API key (401 Unauthorized)",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )
            else:
                return KeyValidationResult(
                    provider="groq",
                    status=KeyStatus.UNKNOWN,
                    message=f"Unexpected response: {response.status_code}",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

        except requests.Timeout:
            return KeyValidationResult(
                provider="groq",
                status=KeyStatus.UNKNOWN,
                message="Request timed out (network issue)",
                last_validated=datetime.now(),
                can_make_requests=False,
            )
        except Exception as e:
            return KeyValidationResult(
                provider="groq",
                status=KeyStatus.INVALID,
                message=f"Error: {str(e)}",
                last_validated=datetime.now(),
                can_make_requests=False,
            )

    async def _test_gemini_key(self, key: str) -> KeyValidationResult:
        """Test Gemini API key"""
        try:
            # Test with a simple request
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": "Hi"}]}],
                    "generationConfig": {"maxOutputTokens": 5},
                },
                timeout=10,
            )

            if response.status_code == 200:
                return KeyValidationResult(
                    provider="gemini",
                    status=KeyStatus.VALID,
                    message="Key is valid and working",
                    last_validated=datetime.now(),
                    can_make_requests=True,
                )
            elif response.status_code == 400 and "API key not valid" in response.text:
                return KeyValidationResult(
                    provider="gemini",
                    status=KeyStatus.INVALID,
                    message="Invalid API key",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )
            else:
                return KeyValidationResult(
                    provider="gemini",
                    status=KeyStatus.UNKNOWN,
                    message=f"Unexpected response: {response.status_code}",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

        except Exception as e:
            return KeyValidationResult(
                provider="gemini",
                status=KeyStatus.INVALID,
                message=f"Error: {str(e)}",
                last_validated=datetime.now(),
                can_make_requests=False,
            )

    async def _test_openrouter_key(self, key: str) -> KeyValidationResult:
        """Test OpenRouter API key"""
        try:
            response = requests.get(
                "https://openrouter.ai/api/v1/auth/key",
                headers={"Authorization": f"Bearer {key}"},
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                return KeyValidationResult(
                    provider="openrouter",
                    status=KeyStatus.VALID,
                    message="Key is valid and working",
                    last_validated=datetime.now(),
                    can_make_requests=True,
                    details={
                        "label": data.get("data", {}).get("label"),
                        "limit": data.get("data", {}).get("limit"),
                    },
                )
            elif response.status_code == 401:
                return KeyValidationResult(
                    provider="openrouter",
                    status=KeyStatus.INVALID,
                    message="Invalid API key",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )
            else:
                return KeyValidationResult(
                    provider="openrouter",
                    status=KeyStatus.UNKNOWN,
                    message=f"Unexpected response: {response.status_code}",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

        except Exception as e:
            return KeyValidationResult(
                provider="openrouter",
                status=KeyStatus.INVALID,
                message=f"Error: {str(e)}",
                last_validated=datetime.now(),
                can_make_requests=False,
            )

    async def _test_tavily_key(self, key: str) -> KeyValidationResult:
        """Test Tavily API key"""
        try:
            response = requests.post(
                "https://api.tavily.com/search",
                headers={"Content-Type": "application/json"},
                json={"api_key": key, "query": "test", "max_results": 1},
                timeout=10,
            )

            if response.status_code == 200:
                return KeyValidationResult(
                    provider="tavily",
                    status=KeyStatus.VALID,
                    message="Key is valid and working",
                    last_validated=datetime.now(),
                    can_make_requests=True,
                )
            elif response.status_code == 401 or "Invalid API key" in response.text:
                return KeyValidationResult(
                    provider="tavily",
                    status=KeyStatus.INVALID,
                    message="Invalid API key",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )
            else:
                return KeyValidationResult(
                    provider="tavily",
                    status=KeyStatus.UNKNOWN,
                    message=f"Unexpected response: {response.status_code}",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

        except Exception as e:
            return KeyValidationResult(
                provider="tavily",
                status=KeyStatus.INVALID,
                message=f"Error: {str(e)}",
                last_validated=datetime.now(),
                can_make_requests=False,
            )

    def get_all_keys_status(self) -> Dict[str, Dict]:
        """Get status of all API keys (without live testing)"""
        status = {}

        for provider, env_var in self.ENV_VARS.items():
            key = os.environ.get(env_var)

            if not key:
                status[provider] = {
                    "status": "missing",
                    "message": f"{env_var} not set",
                    "can_make_requests": False,
                }
            elif self.is_placeholder(key):
                status[provider] = {
                    "status": "placeholder",
                    "message": "Key appears to be a placeholder",
                    "can_make_requests": False,
                }
            else:
                is_valid_format, message = self.validate_key_format(provider, key)
                if is_valid_format:
                    status[provider] = {
                        "status": "present",
                        "message": "Key is present and format is valid (not tested)",
                        "can_make_requests": True,
                    }
                else:
                    status[provider] = {
                        "status": "invalid_format",
                        "message": message,
                        "can_make_requests": False,
                    }

        return status

    async def validate_all_keys_live(self) -> Dict[str, KeyValidationResult]:
        """Test all configured keys with live API calls"""
        results = {}

        for provider in self.ENV_VARS.keys():
            key = self.get_key(provider)
            if key and not self.is_placeholder(key):
                results[provider] = await self.test_key_live(provider, key)
            else:
                results[provider] = KeyValidationResult(
                    provider=provider,
                    status=KeyStatus.MISSING if not key else KeyStatus.PLACEHOLDER,
                    message="Key not configured" if not key else "Key is a placeholder",
                    last_validated=datetime.now(),
                    can_make_requests=False,
                )

        return results

    def clear_cache(self):
        """Clear validation cache"""
        self.validation_cache.clear()


# Global instance
api_key_manager = APIKeyManager()

__all__ = ["APIKeyManager", "api_key_manager", "KeyStatus", "KeyValidationResult"]
