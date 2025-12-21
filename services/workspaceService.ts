
import { supabase } from './supabaseClient';
import { Canvas } from '../types';

export async function fetchCanvases(): Promise<Canvas[]> {
  const { data, error } = await supabase
    .from('canvases')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching canvases:', error.message);
    return [];
  }

  // Perform in-flight data migration for canvases with an outdated schema.
  // This prevents crashes when loading data that was saved before new features were added.
  const migratedData = (data || []).map(canvas => {
    let migratedCanvas = { ...canvas };

    // Migrate 'content' from string/null to a valid array structure.
    if (!Array.isArray(migratedCanvas.content)) {
      const contentValue = typeof migratedCanvas.content === 'string' ? migratedCanvas.content : '';
      migratedCanvas.content = [{ type: 'text', content: contentValue }];
    }

    // Ensure all nullable array properties are initialized to prevent crashes.
    if (!Array.isArray(migratedCanvas.chat_history)) {
      migratedCanvas.chat_history = [];
    }
    if (!Array.isArray(migratedCanvas.task_log)) {
      migratedCanvas.task_log = [];
    }
    if (!Array.isArray(migratedCanvas.output_sources)) {
      migratedCanvas.output_sources = [];
    }
    if (migratedCanvas.terminal_output === undefined) {
      migratedCanvas.terminal_output = '';
    }
    if (migratedCanvas.parent_folder_id === undefined) {
      migratedCanvas.parent_folder_id = null;
    }

    return migratedCanvas;
  });

  return migratedData as Canvas[];
}

export async function createCanvas(name: string, content?: Canvas['content']): Promise<Canvas | null> {
  const initialContent = content || [{ type: 'text', content: '' }];
  const { data, error } = await supabase
    .from('canvases')
    .insert([{ name, content: initialContent, output: '', task_log: [], output_sources: [], chat_history: [], terminal_output: '' }])
    .select()
    .single();

  if (error) {
    console.error('Error creating canvas:', error.message);
    return null;
  }
  return data as Canvas;
}

export async function updateCanvas(id: string, updates: Partial<Omit<Canvas, 'id'>>): Promise<Canvas | null> {
  const { data, error } = await supabase
    .from('canvases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating canvas:', error.message);
    return null;
  }
  return data as Canvas;
}

export async function deleteCanvas(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('canvases')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting canvas:', error.message);
    // Add a more specific check for RLS-related errors
    if (error.message.includes("violates row-level security policy")) {
      console.error("Hint: This error is likely caused by missing or incorrect Row Level Security (RLS) policies on the 'canvases' table.");
    }
    return false;
  }
  return true;
}

export async function runCommand(command: string): Promise<{ output: string; error: string | null }> {
  console.log(`[WORKSPACE] Requesting real execution: ${command}`);

  try {
    const response = await fetch('http://localhost:3001/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { output: '', error: `Bridge returned ${response.status}: ${errorText}` };
    }

    const data = await response.json();
    return {
      output: data.output || '',
      error: data.error || null
    };
  } catch (error) {
    console.error('Error in real runCommand:', error);
    return {
      output: '',
      error: `[FAILED TO CONNECT TO BRIDGE] Eldoria's local bridge is not running. Please run "node services/bridge.js".`
    };
  }
}

// --- ACADEMIC HUB CLOUD METHODS ---

import { AcademicProject } from '../types';

export async function fetchAcademicProjects(): Promise<AcademicProject[]> {
  const { data, error } = await supabase
    .from('academic_projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching academic projects:', error.message);
    return [];
  }

  // Ensure robust data structure
  return (data || []).map(p => ({
    ...p,
    wizard_state: p.wizard_state || {},
    draft_content: p.draft_content || {},
    references: p.references || []
  })) as AcademicProject[];
}

export async function createAcademicProject(project: Omit<AcademicProject, 'id' | 'created_at'>): Promise<AcademicProject | null> {
  const { data, error } = await supabase
    .from('academic_projects')
    .insert([project])
    .select()
    .single();

  if (error) {
    console.error('Error creating academic project:', error.message);
    return null;
  }
  return data as AcademicProject;
}

export async function updateAcademicProject(id: string, updates: Partial<AcademicProject>): Promise<AcademicProject | null> {
  const { data, error } = await supabase
    .from('academic_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating academic project:', error.message);
    return null;
  }
  return data as AcademicProject;
}

export async function deleteAcademicProject(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('academic_projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting academic project:', error.message);
    return false;
  }
  return true;
}
