export interface EmeraldMind {
  description: string;
  capabilities: string[];
  data_types: string[];
  architecture: {
    short_term_memory: string;
    long_term_memory: string;
    versioning: string;
    indexing: string;
  };
  interfaces: {
    frontend: string[];
    backend: string[];
  };
}

export interface SAF {
  description: string;
  capabilities: string[];
  data_types: string[];
  architecture: {
    engine_core: string;
    math_engine: string;
    logic_engine: string;
    visualization: string;
    integration: string;
  };
  interfaces: {
    frontend: string[];
    backend: string[];
  };
}

export interface EldoriaCore {
  system: "Eldoria.io";
  core: {
    EmeraldMind: EmeraldMind;
    SAF: SAF;
  };
  vision: string;
}

export interface Attachment {
  name: string;
  path: string;
  content?: string;
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  attachments?: Attachment[];
  prompt_suggestion?: {
    schema_id: string;
    variables: Record<string, string>;
    reasoning: string;
  };
}

export interface Source {
  title: string;
  uri: string;
}

export interface TextPart {
  type: 'text';
  content: string;
}

export interface ImagePart {
  type: 'image';
  content: string; // base64 data URI
  mimeType: string;
}

export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: string;
  journal?: string;
  link?: string;
  snippet?: string;
  formattedApa?: string;
}

export interface FilePart {
  type: 'file';
  name: string;
  path: string;
  size?: number;
}

export interface FolderPart {
  type: 'folder';
  name: string;
  path: string;
}

export type CanvasPart = TextPart | ImagePart | FilePart | FolderPart;

export type TaskLogEntryType = 'plan' | 'thought' | 'tool_code' | 'tool_result' | 'error';

export interface TaskLogEntry {
  type: TaskLogEntryType;
  content: string;
  toolName?: string;
}


export interface Canvas {
  id: string;
  created_at: string;
  name: string;
  content: CanvasPart[];
  output: string;
  chat_history: ChatMessage[] | null;
  task_log: TaskLogEntry[] | null;
  output_sources: Source[] | null;
  terminal_output: string | null;
  parent_folder_id: string | null;
  insights: string[] | null;
  insight_metadata: Record<string, any>[] | null;
  saf_blueprint?: any; // Stores the visual block architecture JSON
  reasoning_depth?: 'surface' | 'structured' | 'deep'; // Analysis depth indicator
  reasoning_tree?: object; // Optional structured reasoning metadata
}

export interface Folder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

export interface Memory {
  id: string;
  content: string;
}

export type SAFStatus = 'idle' | 'planning' | 'thinking' | 'executing_tool' | 'responding';
export type MemoryStatus = 'idle' | 'context_retrieval' | 'indexing' | 'memory_formation';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type InlineAction = 'refactor' | 'explain' | 'continue';

// --- ACADEMIC HUB TYPES ---

export interface AcademicWizardState {
  step: number;
  basics: {
    title: string;
    author: string;
    regNumber: string;
    year: string;
  };
  objectives: {
    aim: string;
    specificObjectives: string[];
  };
  scope: {
    scopeOfWork: string;
    significance: string;
    limitations: string;
  };
  literature: {
    keywords: string[];
    searchQueries: string[];
  };
  methodology: {
    materials: string[];
    methods: string;
    costs: string;
    results_data: string;
  };
  finishing: {
    dedication: string;
    acknowledgements: string;
    preface: string;
  };
  compliance: {
    plagiarismChecked: boolean;
    wordCountValid: boolean;
    abstractReady: boolean;
  };
  generationConfig: {
    targetPageCount: number;
    depth: 'standard' | 'deep' | 'exhaustive';
  };
}

export interface AcademicResource {
  id: string;
  name: string;
  type: 'note' | 'file' | 'link';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface AcademicProject {
  id: string;
  name: string;
  format: string; // e.g., 'RSU_MECH_ENG'
  modelId?: string; // Reference to the AcademicModel used
  created_at: string;
  wizard_state: AcademicWizardState;
  draft_content: Record<string, string>; // Chapter -> Markdown
  references: Reference[];
  resources: (string | AcademicResource)[]; // List of file paths or rich resource objects
  extractedEquations?: ExtractedEquation[]; // Genesis Engine extracted physics
}

// Genesis Engine: Extracted Physics Equations
export interface ExtractedEquation {
  id: string;
  name: string;
  expression: string; // e.g., "P_out = P_in - k * m^2"
  variables: string[];
  source?: string; // e.g., "research_paper.pdf"
  extractedAt?: string; // ISO timestamp
}