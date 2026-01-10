/**
 * Export Service
 * 
 * Multi-format thesis export with PDF, LaTeX, DOCX, and Markdown support.
 * Includes bridge download capability for offline use.
 */

import { AcademicProject } from '../types';
import { getBridgeUrl } from './bridgeClient';
import { ReferenceParser } from './ReferenceParser';
import { getModelById, DEFAULT_MODELS } from '../models/AcademicModels';

export type ExportFormat = 'pdf' | 'docx' | 'latex' | 'markdown' | 'html';

export interface ExportOptions {
    format: ExportFormat;
    includeTableOfContents?: boolean;
    includeReferences?: boolean;
    includeCoverPage?: boolean;
    citationStyle?: 'APA' | 'MLA' | 'IEEE' | 'Chicago' | 'Harvard';
    pageSize?: 'A4' | 'Letter';
    fontSize?: number;
    lineSpacing?: number;
}

export interface ExportResult {
    success: boolean;
    data?: Blob | string;
    filename: string;
    error?: string;
}

const DEFAULT_OPTIONS: ExportOptions = {
    format: 'pdf',
    includeTableOfContents: true,
    includeReferences: true,
    includeCoverPage: true,
    citationStyle: 'APA',
    pageSize: 'A4',
    fontSize: 12,
    lineSpacing: 2.0
};

class ExportServiceClass {
    private bridgeAvailable: boolean | null = null;

    /**
     * Check if bridge is available for advanced exports
     */
    async checkBridgeAvailability(): Promise<boolean> {
        if (this.bridgeAvailable !== null) {
            return this.bridgeAvailable;
        }

        try {
            const bridgeUrl = await getBridgeUrl();
            const response = await fetch(`${bridgeUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            this.bridgeAvailable = response.ok;
        } catch {
            this.bridgeAvailable = false;
        }
        return this.bridgeAvailable;
    }

    /**
     * Get bridge download URL
     */
    getBridgeDownloadUrl(): string {
        // Check if running in Electron or web
        const isElectron = typeof window !== 'undefined' && (window as any).electron;
        if (isElectron) {
            return 'file://release/eldoria-bridge-win.exe';
        }
        return '/downloads/eldoria-bridge-win.exe';
    }

    /**
     * Export thesis in the specified format
     */
    async export(project: AcademicProject, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const filename = this.generateFilename(project, opts.format);

        try {
            switch (opts.format) {
                case 'markdown':
                    return await this.exportMarkdown(project, opts, filename);
                case 'html':
                    return await this.exportHtml(project, opts, filename);
                case 'latex':
                    return await this.exportLatex(project, opts, filename);
                case 'pdf':
                    return await this.exportPdf(project, opts, filename);
                case 'docx':
                    return await this.exportDocx(project, opts, filename);
                default:
                    return { success: false, filename, error: 'Unsupported format' };
            }
        } catch (e: any) {
            return { success: false, filename, error: e.message || 'Export failed' };
        }
    }

    /**
     * Generate filename
     */
    private generateFilename(project: AcademicProject, format: ExportFormat): string {
        const title = project.wizard_state.basics.title || 'Thesis';
        const sanitized = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const date = new Date().toISOString().split('T')[0];
        const extension = format === 'latex' ? 'tex' : format;
        return `${sanitized}_${date}.${extension}`;
    }

    /**
     * Build thesis content as Markdown
     */
    private buildMarkdownContent(project: AcademicProject, options: ExportOptions): string {
        const wizard = project.wizard_state;
        const model = getModelById(project.modelId || project.format || '') || DEFAULT_MODELS['rsu-mech-eng'];
        const sections: string[] = [];

        // Cover Page
        if (options.includeCoverPage) {
            sections.push(`# ${wizard.basics.title || 'Untitled Thesis'}\n`);
            sections.push(`**Author:** ${wizard.basics.author || 'Unknown'}\n`);
            sections.push(`**Registration Number:** ${wizard.basics.regNumber || 'N/A'}\n`);
            sections.push(`**Institution:** ${model.institution}\n`);
            sections.push(`**Department:** ${model.department}\n`);
            sections.push(`**Year:** ${wizard.basics.year || new Date().getFullYear()}\n`);
            sections.push('\n---\n\n');
        }

        // Table of Contents
        if (options.includeTableOfContents) {
            sections.push('## Table of Contents\n\n');
            const draftContent = project.draft_content || {};
            Object.keys(draftContent).forEach((chapter, i) => {
                sections.push(`${i + 1}. [${chapter}](#${chapter.toLowerCase().replace(/\s+/g, '-')})\n`);
            });
            sections.push('\n---\n\n');
        }

        // Draft Content
        const draftContent = project.draft_content || {};
        Object.entries(draftContent).forEach(([chapter, content]) => {
            sections.push(`## ${chapter}\n\n`);
            sections.push(`${content || '*Content pending...*'}\n\n`);
        });

        // References
        if (options.includeReferences && project.references?.length) {
            sections.push('## References\n\n');
            project.references.forEach((ref, i) => {
                const parsed = ReferenceParser.parseSearchResult(ref);
                const formatted = ReferenceParser.format(parsed, options.citationStyle, i + 1);
                sections.push(`${i + 1}. ${formatted}\n\n`);
            });
        }

        return sections.join('');
    }

    /**
     * Export as Markdown
     */
    private async exportMarkdown(
        project: AcademicProject,
        options: ExportOptions,
        filename: string
    ): Promise<ExportResult> {
        const content = this.buildMarkdownContent(project, options);
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        return { success: true, data: blob, filename };
    }

    /**
     * Export as HTML
     */
    private async exportHtml(
        project: AcademicProject,
        options: ExportOptions,
        filename: string
    ): Promise<ExportResult> {
        const markdown = this.buildMarkdownContent(project, options);
        const model = getModelById(project.modelId || project.format || '') || DEFAULT_MODELS['rsu-mech-eng'];

        // Simple markdown to HTML conversion
        let html = markdown
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/---/g, '<hr/>');

        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.wizard_state.basics.title || 'Thesis'}</title>
  <style>
    body {
      font-family: '${model.formatting?.fontFamily || 'Times New Roman'}', serif;
      font-size: ${options.fontSize || 12}pt;
      line-height: ${options.lineSpacing || 2.0};
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 { font-size: 24pt; text-align: center; margin-bottom: 2rem; }
    h2 { font-size: 18pt; margin-top: 2rem; border-bottom: 1px solid #333; }
    h3 { font-size: 14pt; margin-top: 1.5rem; }
    p { text-align: justify; margin: 1rem 0; }
    hr { margin: 2rem 0; }
    @media print {
      body { margin: 0; padding: 1in; }
    }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;

        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        return { success: true, data: blob, filename: filename.replace('.html', '.html') };
    }

    /**
     * Export as LaTeX
     */
    private async exportLatex(
        project: AcademicProject,
        options: ExportOptions,
        filename: string
    ): Promise<ExportResult> {
        const wizard = project.wizard_state;
        const model = getModelById(project.modelId || project.format || '') || DEFAULT_MODELS['rsu-mech-eng'];
        const draftContent = project.draft_content || {};

        const sections: string[] = [];

        // Document preamble
        sections.push(`\\documentclass[${options.fontSize || 12}pt,${options.pageSize === 'Letter' ? 'letterpaper' : 'a4paper'}]{report}`);
        sections.push('\\usepackage[utf8]{inputenc}');
        sections.push('\\usepackage{times}');
        sections.push('\\usepackage{setspace}');
        sections.push(`\\${options.lineSpacing === 2.0 ? 'doublespacing' : 'onehalfspacing'}`);
        sections.push('\\usepackage[margin=1in]{geometry}');
        sections.push('\\usepackage{hyperref}');
        sections.push('');
        sections.push(`\\title{${this.escapeLatex(wizard.basics.title || 'Untitled Thesis')}}`);
        sections.push(`\\author{${this.escapeLatex(wizard.basics.author || 'Author')}}`);
        sections.push(`\\date{${wizard.basics.year || new Date().getFullYear()}}`);
        sections.push('');
        sections.push('\\begin{document}');
        sections.push('');

        // Cover page
        if (options.includeCoverPage) {
            sections.push('\\maketitle');
            sections.push('\\newpage');
        }

        // Table of Contents
        if (options.includeTableOfContents) {
            sections.push('\\tableofcontents');
            sections.push('\\newpage');
        }

        // Chapters
        Object.entries(draftContent).forEach(([chapter, content]) => {
            const chapterName = chapter.replace(/^Chapter \d+:\s*/, '');
            sections.push(`\\chapter{${this.escapeLatex(chapterName)}}`);
            sections.push('');
            sections.push(this.escapeLatex(String(content) || 'Content pending...'));
            sections.push('');
        });

        // References
        if (options.includeReferences && project.references?.length) {
            sections.push('\\chapter{References}');
            sections.push('\\begin{enumerate}');
            project.references.forEach((ref) => {
                const parsed = ReferenceParser.parseSearchResult(ref);
                const formatted = ReferenceParser.format(parsed, options.citationStyle);
                sections.push(`\\item ${this.escapeLatex(formatted)}`);
            });
            sections.push('\\end{enumerate}');
        }

        sections.push('\\end{document}');

        const content = sections.join('\n');
        const blob = new Blob([content], { type: 'application/x-latex;charset=utf-8' });
        return { success: true, data: blob, filename };
    }

    /**
     * Escape LaTeX special characters
     */
    private escapeLatex(text: string): string {
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/\{/g, '\\{')
            .replace(/\}/g, '\\}')
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}');
    }

    /**
     * Export as PDF (using html2pdf or browser print)
     */
    private async exportPdf(
        project: AcademicProject,
        options: ExportOptions,
        filename: string
    ): Promise<ExportResult> {
        // Check if Bridge is available for server-side PDF
        const bridgeAvailable = await this.checkBridgeAvailability();

        if (bridgeAvailable) {
            try {
                const bridgeUrl = await getBridgeUrl();
                const response = await fetch(`${bridgeUrl}/export/pdf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ project, options })
                });

                if (response.ok) {
                    const blob = await response.blob();
                    return { success: true, data: blob, filename };
                }
            } catch (e) {
                console.warn('Bridge PDF export failed, falling back to browser', e);
            }
        }

        // Fallback: Generate HTML and use browser print
        const htmlResult = await this.exportHtml(project, options, filename);
        if (!htmlResult.success || !htmlResult.data) {
            return { success: false, filename, error: 'HTML generation failed' };
        }

        // For browser-based PDF, we'll return HTML with print instructions
        // In a real app, we'd use html2pdf.js here
        const htmlContent = await (htmlResult.data as Blob).text();
        const pdfHtml = htmlContent.replace('</head>', `
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </head>`);

        const blob = new Blob([pdfHtml], { type: 'text/html;charset=utf-8' });
        return {
            success: true,
            data: blob,
            filename: filename.replace('.pdf', '_print.html'),
            error: 'PDF export requires Bridge. Opening print dialog instead.'
        };
    }

    /**
     * Export as DOCX (requires Bridge)
     */
    private async exportDocx(
        project: AcademicProject,
        options: ExportOptions,
        filename: string
    ): Promise<ExportResult> {
        const bridgeAvailable = await this.checkBridgeAvailability();

        if (!bridgeAvailable) {
            return {
                success: false,
                filename,
                error: 'DOCX export requires the Eldoria Bridge. Please download and run the bridge for Word document generation.'
            };
        }

        try {
            const bridgeUrl = await getBridgeUrl();
            const response = await fetch(`${bridgeUrl}/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });

            if (response.ok) {
                const blob = await response.blob();
                return { success: true, data: blob, filename };
            } else {
                return { success: false, filename, error: 'Bridge returned an error' };
            }
        } catch (e: any) {
            return { success: false, filename, error: e.message || 'DOCX export failed' };
        }
    }

    /**
     * Download export result
     */
    download(result: ExportResult) {
        if (!result.success || !result.data) {
            console.error('Cannot download failed export:', result.error);
            return;
        }

        const blob = result.data instanceof Blob ? result.data : new Blob([result.data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Quick export shortcut
     */
    async quickExport(project: AcademicProject, format: ExportFormat): Promise<void> {
        const result = await this.export(project, { format });
        if (result.success) {
            this.download(result);
        } else {
            throw new Error(result.error || 'Export failed');
        }
    }
}

export const ExportService = new ExportServiceClass();
export default ExportService;
