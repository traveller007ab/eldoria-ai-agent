import { useState, useEffect, useCallback } from 'react';
import { academicApi } from '../services/apiClient';
import { WizardState } from '../academic-hub/components/Wizard';

interface UseProjectOptions {
  autoLoad?: boolean;
}

interface UseProjectReturn {
  project: any | null;
  wizardState: WizardState | null;
  compliance: any | null;
  references: any[];
  loading: boolean;
  error: string | null;
  createProject: (data: { name: string; format?: string }) => Promise<string>;
  updateProject: (id: string, data: Partial<any>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  loadWizardState: (projectId: string) => Promise<void>;
  advanceStep: (projectId: string, direction: number) => Promise<void>;
  updateDraft: (projectId: string, section: string, content: string) => Promise<void>;
  loadCompliance: (projectId: string) => Promise<void>;
  loadReferences: (projectId: string) => Promise<void>;
  addReference: (projectId: string, reference: any) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProject(options: UseProjectOptions = {}): UseProjectReturn {
  const { autoLoad = false } = options;
  
  const [project, setProject] = useState<any | null>(null);
  const [wizardState, setWizardState] = useState<WizardState | null>(null);
  const [compliance, setCompliance] = useState<any | null>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWizardState = useCallback(async (projectId: string) => {
    try {
      const state = await academicApi.getWizardState(projectId);
      setWizardState(state);
    } catch (e) {
      setError('Failed to load wizard state');
    }
  }, []);

  const advanceStep = useCallback(async (projectId: string, direction: number) => {
    try {
      await academicApi.advanceWizardStep(projectId, direction);
      await loadWizardState(projectId);
    } catch (e) {
      setError('Failed to advance wizard step');
    }
  }, [loadWizardState]);

  const updateDraft = useCallback(async (projectId: string, section: string, content: string) => {
    try {
      await academicApi.updateDraftSection(projectId, section, content);
    } catch (e) {
      setError('Failed to update draft');
    }
  }, []);

  const loadCompliance = useCallback(async (projectId: string) => {
    try {
      const report = await academicApi.getComplianceReport(projectId);
      setCompliance(report);
    } catch (e) {
      setError('Failed to load compliance report');
    }
  }, []);

  const loadReferences = useCallback(async (projectId: string) => {
    try {
      const refs = await academicApi.getReferences(projectId);
      setReferences(refs);
    } catch (e) {
      setError('Failed to load references');
    }
  }, []);

  const addReference = useCallback(async (projectId: string, reference: any) => {
    try {
      const newRef = await academicApi.addReference(projectId, reference);
      setReferences(prev => [...prev, newRef]);
    } catch (e) {
      setError('Failed to add reference');
    }
  }, []);

  const createProject = useCallback(async (data: { name: string; format?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const project = await academicApi.createProject(data);
      setProject(project);
      return project.id;
    } catch (e) {
      setError('Failed to create project');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<any>) => {
    try {
      const updated = await academicApi.updateProject(id, data);
      setProject(updated);
    } catch (e) {
      setError('Failed to update project');
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await academicApi.deleteProject(id);
      setProject(null);
    } catch (e) {
      setError('Failed to delete project');
    }
  }, []);

  const refresh = useCallback(async () => {
    if (project?.id) {
      const p = await academicApi.getProject(project.id);
      setProject(p);
      await loadWizardState(project.id);
      await loadCompliance(project.id);
      await loadReferences(project.id);
    }
  }, [project?.id, loadWizardState, loadCompliance, loadReferences]);

  useEffect(() => {
    if (autoLoad && project?.id) {
      loadWizardState(project.id);
      loadCompliance(project.id);
      loadReferences(project.id);
    }
  }, [autoLoad, project?.id, loadWizardState, loadCompliance, loadReferences]);

  return {
    project,
    wizardState,
    compliance,
    references,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    loadWizardState,
    advanceStep,
    updateDraft,
    loadCompliance,
    loadReferences,
    addReference,
    refresh,
  };
}

export default useProject;
