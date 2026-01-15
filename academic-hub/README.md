# Academic Hub

Academic Hub is Eldoria's comprehensive thesis writing and research management system, designed specifically for Rivers State University (RSU) students and researchers.

## Features

### Citation Management
- **Multi-Style Support**: APA 7th Edition, IEEE, Harvard, MLA, and Chicago
- **Reference Manager**: Full CRUD operations for references
- **Import/Export**: BibTeX, RIS, and CSV formats
- **Real-Time Validation**: Instant citation format checking

### APA Compliance
- Comprehensive APA 7th Edition validator
- In-text citation validation
- Reference list formatting checks
- Heading and structure validation
- Punctuation and grammar suggestions

### RSU Compliance
- Level-specific requirements (500/600/700/800/Postgraduate)
- Word count validation
- Chapter structure checks
- Reference quantity requirements
- Academic formatting standards

### Thesis Preview
- Live document preview
- Chapter-by-chapter view
- Word and page count statistics
- Export-ready formatting

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Railway backend (for AI agents)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start both frontend and backend
npm run start
```

### Environment Variables

Create a `.env` file:

```env
VITE_WS_URL=ws://localhost:8000/ws
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
academic-hub/
├── components/
│   ├── Agentic/           # AI Agent dashboard
│   ├── Common/            # Shared UI components
│   ├── ReferenceManager/  # Reference management
│   └── Wizard/            # Project setup wizard
├── services/
│   ├── apaValidator.ts    # APA 7th Edition validation
│   ├── citationEngine.ts  # Citation formatting
│   ├── rsuValidator.ts    # RSU compliance
│   └── academicService.ts # Academic utilities
├── hooks/
│   ├── useAPAValidation.ts
│   ├── useCitationValidation.ts
│   └── useAgentWebSocket.ts
└── types.ts               # TypeScript definitions
```

## Usage

### Managing References

1. Navigate to the **References** tab in Agentic Dashboard
2. Click **Add Reference** to create a new entry
3. Import BibTeX/RIS files or manually add references
4. Export your reference list in required format

### Validating APA Format

1. Open the **Compliance Sidebar**
2. Switch to the **APA** tab
3. View your APA compliance score
4. Review and fix identified issues

### Checking RSU Compliance

1. Open the **Compliance Sidebar**
2. Switch to the **RSU** tab
3. Select your course level (500/600/700/800/Postgraduate)
4. Review RSU-specific requirements and issues

### Previewing Your Thesis

1. Go to the **Preview** tab in Agentic Dashboard
2. View full document or chapter-by-chapter
3. Check word count and page estimates
4. Export preview for external review

## Configuration

### RSU Requirements by Level

| Level    | Min Words | Max Words | Min References |
|----------|-----------|-----------|----------------|
| 500      | 10,000    | 15,000    | 15             |
| 600      | 12,000    | 18,000    | 20             |
| 700      | 15,000    | 25,000    | 25             |
| 800      | 20,000    | 40,000    | 30             |
| Postgraduate | 25,000 | 50,000 | 40          |

### Citation Styles

- **APA 7th Edition**: Standard academic citation
- **IEEE**: Engineering and technical writing
- **Harvard**: Social sciences format
- **MLA**: Humanities and literature
- **Chicago**: Historical and general research

## API Integration

### WebSocket Commands

```typescript
// Start a research task
sendCommand('start_task', { agent: 'literature', query: '...' })

// Pause all agents
sendCommand('pause_all', {})

// Resume all agents
sendCommand('resume_all', {})
```

### REST Endpoints

- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `POST /api/export` - Export thesis to DOCX/PDF

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create a GitHub issue
- Contact: support@eldoria.io

---

Built with care for RSU students and researchers.
