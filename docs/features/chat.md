# Chat Interface

The Chat Panel is your conversational AI assistant — think JARVIS, but for academic work.

## Overview

The chat interface lets you:
- Ask questions about your content
- Request edits and improvements
- Get research assistance
- Execute tools (search, commands, analysis)

## Starting a Conversation

1. Type your message in the input field
2. Press `Enter` or click Send
3. AI responds with context from:
   - Your current canvas
   - EmeraldMind memories
   - Project index
   - SAF framework

## Message Types

### User Messages
Your questions and instructions. Be specific for best results.

### AI Responses
May include:
- **Text** — Direct answers
- **Source Citations** — Clickable pills showing references
- **Tool Calls** — Expandable logs showing AI actions

### Task Log
Click to expand and see:
- What tools the AI used
- Search queries performed
- Commands executed
- Reasoning steps

## Tool Calling

The AI can use built-in tools:

| Tool | Function |
|------|----------|
| `web_search` | Search the internet via Tavily |
| `create_new_canvas_with_content` | Generate new canvases |
| `run_command` | Execute terminal commands |
| `deconstruct_system` | SAF system analysis |
| `suggest_prompt` | Recommend prompt templates |

### Example Prompts

**Research:**
> "Search for recent papers on heat transfer optimization in power plants"

**Analysis:**
> "Deconstruct the Rankine Cycle and suggest efficiency improvements"

**Commands:**
> "List all Python files in the project"

**Writing:**
> "Help me improve this paragraph for academic tone"

## Tips for Better Responses

1. **Be Specific** — "Explain X in context of Y" vs. "Explain X"
2. **Provide Context** — Reference your canvas content
3. **Use Examples** — Show the format you want
4. **Ask Follow-ups** — Build on previous responses

## Multi-Model Fallback

If the primary AI (Groq) fails:
1. System tries Gemini
2. Then tries OpenRouter
3. Shows error only if all fail

You'll see status changes in the Status Bar during this process.
