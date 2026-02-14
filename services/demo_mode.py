"""
Demo mode for zero-cost operation
Returns realistic mock responses when AI APIs unavailable
"""

import os
import random
from typing import Dict, Any, List, Optional

# ============================================================================
# DEMO MODE INDICATOR
# ============================================================================

DEMO_INDICATOR = "🎮 DEMO MODE"
DEMO_HEADER = f"""
{DEMO_INDICATOR}
═══════════════════════════════════════════════════════════════
This is a demonstration response. To enable full AI functionality,
add your API keys to the environment variables:
- GROQ_API_KEY
- GEMINI_API_KEY (optional)
- OPENROUTER_API_KEY (optional)
- TAVILY_API_KEY (optional)
═══════════════════════════════════════════════════════════════

"""

# ============================================================================
# PLACEHOLDER PATTERNS
# ============================================================================

PLACEHOLDER_PATTERNS = [
    "your_",
    "placeholder",
    "demo",
    "test",
    "xxxx",
    "example",
    "sample",
    "fake",
    "mock",
]


def is_placeholder_value(value: Optional[str]) -> bool:
    """Check if a value is a placeholder or demo value"""
    if not value or len(value) < 5:
        return True

    value_lower = value.lower()
    return any(pattern in value_lower for pattern in PLACEHOLDER_PATTERNS)


# ============================================================================
# DEMO MODE DETECTION
# ============================================================================


class DemoModeChecker:
    """Checks if demo mode should be active based on environment"""

    @staticmethod
    def is_demo_mode() -> bool:
        """Check if demo mode should be active (no valid API keys)"""
        # Check if explicitly disabled
        if os.environ.get("FORCE_DEMO_MODE", "false").lower() == "true":
            return True

        if os.environ.get("DISABLE_DEMO_MODE", "false").lower() == "true":
            return False

        # Check for valid API keys
        groq_key = os.environ.get("GROQ_API_KEY", "")
        gemini_key = os.environ.get("GEMINI_API_KEY", "")
        openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")

        # If any key is valid (not placeholder), we're not in demo mode
        groq_valid = (
            groq_key and not is_placeholder_value(groq_key) and len(groq_key) > 20
        )
        gemini_valid = (
            gemini_key and not is_placeholder_value(gemini_key) and len(gemini_key) > 20
        )
        openrouter_valid = (
            openrouter_key
            and not is_placeholder_value(openrouter_key)
            and len(openrouter_key) > 20
        )

        # Demo mode if no valid keys found
        return not (groq_valid or gemini_valid or openrouter_valid)

    @staticmethod
    def get_available_providers() -> Dict[str, bool]:
        """Check which AI providers are available"""
        return {
            "groq": not is_placeholder_value(os.environ.get("GROQ_API_KEY", "")),
            "gemini": not is_placeholder_value(os.environ.get("GEMINI_API_KEY", "")),
            "openrouter": not is_placeholder_value(
                os.environ.get("OPENROUTER_API_KEY", "")
            ),
            "tavily": not is_placeholder_value(os.environ.get("TAVILY_API_KEY", "")),
        }


# ============================================================================
# DEMO RESPONSE GENERATORS
# ============================================================================


class DemoResponder:
    """Generates realistic demo responses for all AI endpoints"""

    @staticmethod
    def chat_response(
        messages: List[Dict[str, str]], stream: bool = False
    ) -> Dict[str, Any]:
        """Generate demo chat response"""
        last_message = ""
        if messages and len(messages) > 0:
            last_message = messages[-1].get("content", "")[:100]

        responses = [
            f"""{DEMO_HEADER}
I'd be happy to help with that! In demo mode, I can show you how the chat interface works, 
but I can't access real AI models. Your message was: "{last_message}..."

To get real AI responses, please configure your API keys in Railway environment variables.""",
            f"""{DEMO_HEADER}
This is a simulated AI response for testing purposes. 

Your input: "{last_message}..."

In production mode, this would be processed by Groq/Gemini AI models and return a helpful response.

**Next Steps:**
1. Get API keys from https://console.groq.com
2. Add GROQ_API_KEY to Railway environment
3. Restart the bridge service""",
            f"""{DEMO_HEADER}
🤖 Demo Assistant says: I received your message about "{last_message}..."

**Demo Mode Features Working:**
✅ Chat interface
✅ Message history
✅ Streaming responses (simulated)
✅ Multi-turn conversations

**To Enable Real AI:**
Add GROQ_API_KEY to your Railway deployment environment variables.""",
        ]

        content = random.choice(responses)

        return {
            "id": f"demo-{random.randint(1000, 9999)}",
            "object": "chat.completion",
            "created": int(os.time()) if hasattr(os, "time") else 0,
            "model": "demo-mode",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": content},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": len(str(messages)),
                "completion_tokens": len(content),
                "total_tokens": len(str(messages)) + len(content),
            },
            "demo_mode": True,
            "demo_indicator": DEMO_INDICATOR,
        }

    @staticmethod
    def stream_chat_response(messages: List[Dict[str, str]]):
        """Generate streaming demo response"""
        import json

        response = DemoResponder.chat_response(messages)
        content = response["choices"][0]["message"]["content"]

        # Split content into chunks for streaming simulation
        words = content.split()
        chunk_size = max(1, len(words) // 10)

        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size])
            data = {
                "id": response["id"],
                "object": "chat.completion.chunk",
                "created": response["created"],
                "model": "demo-mode",
                "choices": [
                    {
                        "index": 0,
                        "delta": {"content": chunk + " "},
                        "finish_reason": None,
                    }
                ],
                "demo_mode": True,
            }
            yield f"data: {json.dumps(data)}\n\n"

        # End marker
        yield "data: [DONE]\n\n"

    @staticmethod
    def thesis_chapter(
        chapter_name: str, topic: str, section_type: str = "content"
    ) -> str:
        """Generate demo thesis chapter content"""

        lorem_paragraph = """Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do 
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure 
dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit 
anim id est laborum."""

        return f"""{DEMO_HEADER}
# {chapter_name}

## 1.0 Introduction to {topic}

This chapter provides a comprehensive overview of {topic} within the context of the research 
objectives. The study aims to investigate key aspects and contribute to the existing body of 
knowledge.

{lorem_paragraph}

### 1.1 Background of the Study

The research background demonstrates the significance of {topic} in contemporary academic 
and practical contexts. Previous studies have shown varying approaches to addressing similar 
challenges.

{lorem_paragraph}

### 1.2 Problem Statement

Despite extensive research in {topic}, several gaps remain in the current literature. 
This study addresses these gaps through systematic investigation and analysis.

### 1.3 Research Objectives

The primary objectives of this research are:

1. To analyze the current state of {topic}
2. To identify key factors influencing outcomes
3. To develop a framework for practical application
4. To validate findings through empirical testing

## 2.0 Literature Review

### 2.1 Theoretical Framework

The theoretical foundation of this study draws from established principles in {topic}.
Various theoretical perspectives provide insight into the research problem.

{lorem_paragraph}

### 2.2 Empirical Studies

Recent empirical investigations have explored various dimensions of {topic}. 
Table 2.1 summarizes key findings from selected studies.

**Table 2.1: Summary of Related Studies**

| Author(s) | Year | Key Findings | Methodology |
|-----------|------|--------------|-------------|
| Smith et al. | 2020 | Significant positive correlation | Quantitative |
| Johnson | 2021 | Mixed results with limitations | Qualitative |
| Williams | 2022 | Novel framework proposed | Mixed methods |

## 3.0 Methodology

### 3.1 Research Design

This study employs a mixed-methods approach combining qualitative and quantitative 
techniques to address the research questions comprehensively.

### 3.2 Data Collection

Data was collected through [methods would be described here in production].

{lorem_paragraph}

## 4.0 Results and Discussion

### 4.1 Findings

The analysis reveals several important patterns related to {topic}.

{lorem_paragraph}

### 4.2 Discussion

These findings align with previous research while offering new insights into {topic}.

## 5.0 Conclusion

This chapter has examined {topic} through systematic analysis. The findings contribute 
to theoretical understanding and practical applications in the field.

---

**Demo Statistics:**
- Word Count: ~1,200 (would be 3,000-8,000 in production)
- Sections: 5 (would be 8-15 in production)  
- References: 3 demo citations (would be 20-50 in production)
- AI Provider: DEMO MODE (no API cost)

**To Generate Real Thesis Chapters:**
Configure GROQ_API_KEY in Railway environment variables.
"""

    @staticmethod
    def research_results(query: str, num_results: int = 5) -> Dict[str, Any]:
        """Generate demo research results"""

        demo_results = [
            {
                "title": f"A Comprehensive Study of {query.title()}: Current Trends and Future Directions",
                "url": "https://arxiv.org/abs/demo-001",
                "content": f"This paper examines {query} through systematic analysis of current literature...",
                "score": 0.95,
                "published_date": "2024-01-15",
                "source": "arXiv",
            },
            {
                "title": f"Novel Approaches to {query.title()}: A Meta-Analysis",
                "url": "https://pubmed.ncbi.nlm.nih.gov/demo-002",
                "content": f"Recent advances in {query} have shown promising results in multiple domains...",
                "score": 0.92,
                "published_date": "2023-11-20",
                "source": "PubMed",
            },
            {
                "title": f"The Impact of {query.title()} on Modern Engineering Practices",
                "url": "https://ieeexplore.ieee.org/demo-003",
                "content": f"This study investigates the practical applications of {query} in industry...",
                "score": 0.89,
                "published_date": "2024-03-10",
                "source": "IEEE",
            },
            {
                "title": f"{query.title()}: Theoretical Foundations and Practical Implications",
                "url": "https://dl.acm.org/doi/demo-004",
                "content": f"A thorough examination of the theoretical underpinnings of {query}...",
                "score": 0.87,
                "published_date": "2023-09-05",
                "source": "ACM",
            },
            {
                "title": f"Recent Advances in {query.title()}: A Systematic Review",
                "url": "https://www.sciencedirect.com/demo-005",
                "content": f"This systematic review synthesizes findings from 50+ studies on {query}...",
                "score": 0.85,
                "published_date": "2024-02-28",
                "source": "ScienceDirect",
            },
        ]

        return {
            "query": query,
            "results": demo_results[:num_results],
            "total_results": len(demo_results),
            "search_time": 0.5,
            "demo_mode": True,
            "demo_indicator": DEMO_INDICATOR,
            "message": "To search real academic sources, configure TAVILY_API_KEY",
        }

    @staticmethod
    def physics_analysis(blueprint: Dict[str, Any]) -> Dict[str, Any]:
        """Generate demo physics analysis"""

        components = blueprint.get("components", [])
        num_components = len(components)

        # Extract component types for demo
        component_types = set()
        for comp in components:
            comp_type = comp.get("type", "unknown")
            component_types.add(comp_type)

        return {
            "analysis": f"""{DEMO_HEADER}
## Physics Analysis Results (Demo)

**Blueprint Overview:**
- Total Components: {num_components}
- Component Types: {", ".join(component_types) if component_types else "Not specified"}
- Physics Domain: Fluid Dynamics & Thermodynamics (simulated)

**Identified Physical Principles:**

1. **Conservation of Mass**
   - Detected mass flow balances across {num_components} components
   - Inflow = Outflow verified (simulated)

2. **Bernoulli's Principle**
   - Applicable to fluid flow components
   - Pressure-velocity relationship: P + ½ρv² + ρgh = constant

3. **First Law of Thermodynamics**
   - Energy conservation across thermal components
   - ΔU = Q - W relationship

**Equations Extracted:**

```
(1) Continuity Equation:     A₁v₁ = A₂v₂
(2) Bernoulli Equation:      P₁/ρg + v₁²/2g + z₁ = P₂/ρg + v₂²/2g + z₂
(3) Energy Balance:          ΣQ̇ - ΣẆ = ΣṁΔh
```

**Demo Limitations:**
This is a simulated analysis. In production mode with AI enabled, the system would:
- Extract actual equations from your blueprint specification
- Validate dimensional consistency
- Suggest missing physics considerations
- Provide derivation references

**Next Steps:**
Configure GROQ_API_KEY to enable AI-powered physics analysis.
""",
            "equations": [
                {
                    "name": "Continuity Equation",
                    "formula": "A₁v₁ = A₂v₂",
                    "domain": "fluid",
                    "confidence": 0.9,
                },
                {
                    "name": "Bernoulli's Equation",
                    "formula": "P + ½ρv² + ρgh = constant",
                    "domain": "fluid",
                    "confidence": 0.85,
                },
                {
                    "name": "Energy Balance",
                    "formula": "ΔU = Q - W",
                    "domain": "thermal",
                    "confidence": 0.8,
                },
            ],
            "components_analyzed": num_components,
            "demo_mode": True,
            "demo_indicator": DEMO_INDICATOR,
        }

    @staticmethod
    def citation_search(query: str) -> Dict[str, Any]:
        """Generate demo citation search results"""

        return {
            "query": query,
            "citations": [
                {
                    "title": f"Understanding {query.title()}: A Comprehensive Review",
                    "authors": ["Smith, J.", "Johnson, A.", "Williams, R."],
                    "year": 2024,
                    "journal": "Journal of Engineering Research",
                    "volume": "45",
                    "issue": "3",
                    "pages": "120-145",
                    "doi": "10.1000/demo.001",
                    "format": {
                        "apa": f"Smith, J., Johnson, A., & Williams, R. (2024). Understanding {query}: A comprehensive review. Journal of Engineering Research, 45(3), 120-145. https://doi.org/10.1000/demo.001",
                        "ieee": f'[1] J. Smith, A. Johnson, and R. Williams, "Understanding {query}: A comprehensive review," Journal of Engineering Research, vol. 45, no. 3, pp. 120-145, 2024.',
                        "harvard": f"Smith, J., Johnson, A. and Williams, R., 2024. 'Understanding {query}: A comprehensive review', Journal of Engineering Research, 45(3), pp.120-145.",
                    },
                },
                {
                    "title": f"Recent Advances in {query.title()}",
                    "authors": ["Brown, M.", "Davis, K."],
                    "year": 2023,
                    "journal": "International Conference on Engineering",
                    "pages": "45-52",
                    "doi": "10.1000/demo.002",
                    "format": {
                        "apa": f"Brown, M., & Davis, K. (2023). Recent advances in {query}. International Conference on Engineering, 45-52. https://doi.org/10.1000/demo.002",
                        "ieee": f'[2] M. Brown and K. Davis, "Recent advances in {query}," in Proc. Int. Conf. Engineering, 2023, pp. 45-52.',
                        "harvard": f"Brown, M. and Davis, K., 2023. 'Recent advances in {query}', International Conference on Engineering, pp.45-52.",
                    },
                },
            ],
            "demo_mode": True,
            "demo_indicator": DEMO_INDICATOR,
            "message": "Configure TAVILY_API_KEY to search real academic citations",
        }


# ============================================================================
# QUICK CHECK FUNCTION
# ============================================================================


def check_demo_mode() -> bool:
    """Quick check if demo mode is active"""
    return DemoModeChecker.is_demo_mode()


def get_provider_status() -> Dict[str, bool]:
    """Get status of all AI providers"""
    return DemoModeChecker.get_available_providers()
