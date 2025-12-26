# Frequently Asked Questions

Common questions about Eldoria AI IDE.

## General

### What is Eldoria?

Eldoria is an AI-powered Integrated Development Environment (IDE) designed for academic researchers, thesis writers, and engineering students. It combines multi-model AI assistance with specialized tools for academic work.

### Is Eldoria free?

The web app is free to use. You need to provide your own API keys for AI providers (Groq, Gemini, etc.). Desktop features and future premium tools may have associated costs.

### What AI models does Eldoria use?

- **Primary:** Groq (Llama 3.3 70B Versatile)
- **Fallback 1:** Google Gemini
- **Fallback 2:** OpenRouter (multiple models)

The system automatically falls back if one provider fails.

---

## AI & Chat

### Why is the AI not responding?

1. **Check API keys** — Go to Settings and verify your keys are correct
2. **Check internet connection** — AI requires online access
3. **Check status bar** — Look for "Sync Offline" or bridge errors
4. **Try another provider** — Edit config to use Gemini instead of Groq

### What is EmeraldMind?

EmeraldMind is Eldoria's persistent memory system. It remembers context across sessions, so the AI can reference previous conversations and your project history.

### What is SAF (Strategic Analysis Framework)?

SAF is a meta-system engineering framework for:
- **Deconstructing** systems into components
- **Mapping** dependencies between parts
- **Identifying** modification points
- **Calculating** cascading effects

It's especially useful for engineering analysis and complex system design.

### Can AI access the internet?

Yes! When you ask questions requiring current information, the AI uses:
- **Tavily Search** for web queries
- **Google Search** (via Gemini) for grounded responses

Results include source citations you can click to verify.

---

## Editor & Canvas

### How do I create a new canvas?

1. Click the **Layout** icon in the sidebar
2. Click **+ New Canvas** in the middle panel
3. Start typing!

### Can I add images and formulas?

Yes! Use the toolbar buttons:
- **🖼️ Image** — Upload images
- **∫ Formula** — LaTeX/KaTeX math expressions

### What's the difference between Chat and Generate?

| Feature | Chat | Generate |
|---------|------|----------|
| Purpose | Conversation, Q&A | Content creation |
| Input | Your message | Canvas content |
| Output | Chat response | Document output |
| Context | Chat history | Memory + Project index |

### How do I export my work?

- **Copy/Paste** — Select and copy content
- **Academic Hub** — Use Thesis Generator for DOCX export
- **Defense Deck** — Export as PPTX (coming soon)

---

## Academic Hub

### What is the Thesis Wizard?

A step-by-step tool for structuring your thesis:
1. **Basics** — Title, department, supervisor
2. **Chapters** — Define your chapter structure
3. **Timeline** — Set milestones and deadlines
4. **Generate** — AI-assisted writing per chapter

### How does Autonomous Researcher work?

1. Enter your research topic
2. AI searches the web for relevant sources
3. Summarizes findings with citations
4. Saves sources to your project

### What does Integrity Guardian check?

- **Originality** — Compares against web content
- **Citation format** — Validates reference style
- **Word count** — Tracks chapter lengths
- **Compliance** — Checks against academic standards

---

## Technical

### What is the Python Bridge?

The bridge is a local Python server that enables:
- Terminal command execution
- File system access
- Local document generation
- Thesis vault storage

It runs on `localhost:8000` and uses FastAPI.

### What is Phoenix Protocol?

An auto-restart feature for the Python Bridge. If it crashes:
1. System detects the failure
2. Automatically spawns a new instance
3. Restores connections within seconds

### Can I run Eldoria offline?

Partially. The PWA caches the interface for offline access, but AI features require an internet connection. Local file operations work if the Python Bridge is running.

### Where is my data stored?

- **Canvases** — Supabase cloud database
- **Memories** — Local IndexedDB + Supabase
- **Thesis Vault** — Local SQLite (via Python Bridge)
- **Settings** — Browser localStorage

---

## Troubleshooting

### "Bridge Offline" error

The Python Bridge isn't running or can't be reached.

**Fix:**
```bash
cd eldoria-ai-agent
pip install -r requirements.txt
python services/bridge.py
```

### "Failed to call a function" error

The AI model had trouble with tool execution.

**Fix:** Eldoria automatically retries in text-only mode. If it persists:
1. Simplify your prompt
2. Try a different AI provider
3. Check API key validity

### Chat shows blank messages

Usually caused by invalid API response.

**Fix:**
1. Verify API keys in Settings
2. Check browser console for errors
3. Clear browser cache and reload

### Prompt Library not opening

**Fix:**
1. Click the 📖 BookOpen icon in sidebar
2. If stuck, refresh the page
3. Check for JavaScript errors in console
