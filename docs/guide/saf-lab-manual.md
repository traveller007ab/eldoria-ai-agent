# SAF Lab: Engineering Workbench Manual 🔬

Welcome to the **Structurally Adaptive Framework (SAF) Lab**. This workbench allows you to deconstruct, simulate, and optimize complex systems—whether mechanical, software, or conceptual—using cascading logic and AI analysis.

---

## 🧠 The Philosophy: Why SAF?

Most engineering tools treat components as isolated boxes. SAF treats them as a **living nervous system**.

### Core Principles
1.  **Everything is Connected**: Changing a parameter in a core component (e.g., *Boiler Pressure*) propagates effects downstream (e.g., *Turbine Output* → *Grid Efficiency*).
2.  **Recursive Decomposition**: Systems are built of components, which can contain sub-systems. You can zoom in infinitely.
3.  **Live Validated Logic**: Formulas are evaluated in real-time with safety guards (NaN/Infinity protection).

---

## 🚀 The Guided Experience

New to SAF? Use the interactive onboarding path on the empty state screen:

### 1. Discover 📚
Click **"Open Library"** to browse pre-built engineering models (like the *Rankine Cycle*) or system prompts.
*   **Action**: Select a template to load it instantly.
*   **Tip**: Use the search bar to filter by tags like `#mechanical` or `#ai`.

### 2. Analysis 🔍
Once a blueprint is loaded, click **"Try Demo"** (or select a node) to open the **AI Explainer**.
*   **What it does**: It's a context-aware AI that knows the *exact* state of your system.
*   **Try this**: Ask "What happens if I increase efficiency by 10%?" logic.
*   **Pro Tip**: Click the **Pin** icon to keep the explainer open while you browse other nodes.

### 3. Synthesis 🛠️
Click **"Try Demo"** to open the **Output Panel**.
*   **Diagram**: View a live Mermaid.js flowchart of your system.
*   **Code**: Get production-ready TypeScript interfaces and calculation classes.
*   **Thesis**: Generate a formatted strategic brief or academic chapter based on your design.

---

## 🎛️ Workbench Workflow

### Importing Blueprints
1.  Click the **Import** button (top header).
2.  Paste a valid `<SAF_ISO>` JSON block.
3.  The system validates the schema and loads the graph.

### Editing Parameters
1.  Click any node in the **Node Graph** (center).
2.  The **Parameter Editor** (right panel) shows all adjustable inputs.
3.  **Sliders**: Drag to adjust values. The graph and outputs update instantly (approx. 16ms latency).
4.  **Formulas**: You can enter math expressions like `parent.pressure * 0.85` to create dynamic dependencies.

### Exporting
1.  Open the **Output Panel**.
2.  Select your export format (Code vs. Visual).
3.  Click **Export/Download** or **Print** (supports styled high-fidelity PDF printing).

---

## 💡 Pro Tips

*   **Search Highlight**: In the Prompt Library, search terms are highlighted in neon cyan for quick scanning.
*   **Focus Mode**: Expand the AI Explainer to full height (Maximize icon) for deep chat sessions. The Parameter Editor will hide automatically to give you space.
*   **Visualizing Flows**: Different connection styles represent different flows:
    *   🔴 **Red (Thick)**: Energy Flow
    *   🔵 **Blue (Dashed)**: Control Signal
    *   🟢 **Green (Solid)**: Material Flow
    *   🟡 **Orange (Dotted)**: Data/Information

---

*Eldoria SAF Lab v2.0 - Built for the Architects of Intelligence.*
