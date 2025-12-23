
import { supabase } from './supabaseClient';
import { Canvas } from '../types';
import { bridgeClient } from './bridgeClient';

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
  console.log(`[WORKSPACE] Requesting unified execution: ${command}`);
  return await bridgeClient.executeCommand(command);
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

export async function publishToAcademicHub(projectId: string, fileName: string, content: string): Promise<boolean> {
  console.log(`[WORKSPACE] Publishing ${fileName} to Project ${projectId}`);

  // 1. Save file locally in projects/Academic-Resources
  const folderPath = `Academic-Resources/${projectId}`;
  await runCommand(`mkdir -p "${folderPath}"`); // mkdir -p for safety

  // Use echo or type to create file? echo is safer on bridge
  const command = `echo "${content.replace(/"/g, '\\"')}" > "${folderPath}/${fileName}"`;
  await runCommand(command);

  return true;
}
