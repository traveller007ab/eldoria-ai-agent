# Editor Panel

The Editor Panel is the heart of Eldoria — a powerful multi-part canvas system for creating rich documents.

## Overview

The editor uses a **"Canvas"** metaphor. Each canvas can contain multiple **parts**:

- 📝 **Text** — Rich markdown content
- 🖼️ **Images** — Uploaded or generated visuals
- ∫ **Formulas** — LaTeX/KaTeX mathematical expressions

## Creating Content

### Text Parts

Click anywhere in the editor and start typing. Markdown is supported:

```markdown
# Heading 1
## Heading 2

**Bold** and *italic* text

- Bullet lists
- Like this

1. Numbered lists
2. Work too

> Blockquotes for emphasis

`inline code` and code blocks
```

### Adding Images

1. Click the **Image** icon in the toolbar
2. Upload from your device, or
3. Use AI to generate (coming soon)

### Mathematical Formulas

1. Click the **∫ Formula** button
2. Enter LaTeX syntax:
   ```latex
   E = mc^2
   \frac{d}{dx}(x^n) = nx^{n-1}
   \int_0^1 x^2 dx = \frac{1}{3}
   ```
3. Preview renders in real-time

## Generate Button

The **⚡ Generate** button is your AI power tool.

### How It Works

1. Add content to your canvas (prompt, notes, outline)
2. Click **⚡ Generate**
3. AI processes your content with context from:
   - EmeraldMind memory
   - Project index
   - SAF framework
4. Output appears in the right panel

### Tips for Better Generation

- Be specific in your prompts
- Include examples of desired output
- Use Prompt Library templates for structured results

## Publish to Hub

Send your canvas content directly to the Academic Hub:

1. Click **🎯 Publish** button
2. Content is added to your thesis project
3. Appears in the appropriate chapter

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | `Ctrl/Cmd + S` |
| New Part | `Ctrl/Cmd + Enter` |
| Bold | `Ctrl/Cmd + B` |
| Italic | `Ctrl/Cmd + I` |
| Generate | `Ctrl/Cmd + G` |
