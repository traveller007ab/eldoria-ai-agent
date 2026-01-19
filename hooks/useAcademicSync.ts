import { useCallback, useRef } from 'react';
import { AcademicProject, Canvas } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import { WorkspaceAction, WorkspaceState } from '../context/WorkspaceContext';

interface UseAcademicSyncProps {
    state: WorkspaceState;
    dispatch: React.Dispatch<WorkspaceAction>;
    activeCanvas: Canvas | undefined;
}

export const useAcademicSync = ({ state, dispatch, activeCanvas }: UseAcademicSyncProps) => {
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);

    const addAcademicProject = useCallback(async (project: AcademicProject) => {
        dispatch({ type: 'ADD_ACADEMIC_PROJECT', payload: project });
        await WorkspaceService.createAcademicProject(project);
    }, [dispatch]);

    const updateAcademicProject = useCallback((project: AcademicProject) => {
        dispatch({ type: 'UPDATE_ACADEMIC_PROJECT', payload: project });

        // Debounced cloud update
        if (updateTimeout.current) clearTimeout(updateTimeout.current);
        updateTimeout.current = setTimeout(() => {
            WorkspaceService.updateAcademicProject(project.id, project);
        }, 1000);
    }, [dispatch]);

    const deleteAcademicProject = useCallback(async (id: string) => {
        dispatch({ type: 'DELETE_ACADEMIC_PROJECT', payload: id });
        await WorkspaceService.deleteAcademicProject(id);
    }, [dispatch]);

    const publishToAcademicHub = useCallback(async (projectId?: string, fileName?: string, content?: string) => {
        // Use the active canvas OUTPUT (generated content), not input
        if (!activeCanvas) {
            console.warn('No active canvas to publish');
            return;
        }

        // Use the OUTPUT from the canvas (what was generated), not the input
        const outputContent = content || activeCanvas.output || '';

        if (!outputContent.trim()) {
            console.warn('No output content to publish. Generate content first.');
            return;
        }

        // If we have academic projects, add to the most recent one or create a new resource
        if (state.academicProjects.length > 0) {
            const targetProject = projectId
                ? state.academicProjects.find(p => p.id === projectId)
                : state.academicProjects[state.academicProjects.length - 1];

            if (targetProject) {
                const updatedProject = {
                    ...targetProject,
                    resources: [
                        ...(targetProject.resources || []),
                        {
                            id: Date.now().toString(),
                            name: fileName || `${activeCanvas.name} - Output` || 'Generated Content',
                            type: 'note' as const,
                            content: outputContent,
                            created_at: new Date().toISOString()
                        }
                    ]
                };
                dispatch({ type: 'UPDATE_ACADEMIC_PROJECT', payload: updatedProject });
                await WorkspaceService.updateAcademicProject(updatedProject.id, updatedProject);
                console.log('Published OUTPUT to Academic Hub:', updatedProject.name);
            }
        } else {
            console.warn('No academic projects found. Create a project in Academic Hub first.');
        }
    }, [activeCanvas, state.academicProjects, dispatch]);

    return {
        addAcademicProject,
        updateAcademicProject,
        deleteAcademicProject,
        publishToAcademicHub
    };
};
