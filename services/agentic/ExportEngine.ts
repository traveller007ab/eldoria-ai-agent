import type { AcademicProject, Reference } from '../../types';
import html2pdf from 'html2pdf.js';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from 'docx';

export type ExportFormat = 'pdf' | 'latex' | 'word' | 'html' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  includeAbstract: boolean;
  includeAcknowledgments: boolean;
  includeTableOfContents: boolean;
  includeListOfFigures: boolean;
  includeListOfTables: boolean;
  includeBibliography: boolean;
  citationStyle: 'apa' | 'mla' | 'chicago' | 'ieee' | 'harvard';
  fontSize: 10 | 11 | 12;
  fontFamily: 'times' | 'arial' | 'georgia';
  margins: { top: number; bottom: number; left: number; right: number };
  lineSpacing: 'single' | '1.5' | 'double';
  pageSize: 'a4' | 'letter';
}

export interface ExportResult {
  success: boolean;
  content?: string;
  blob?: Blob;
  filename: string;
  error?: string;
}

export interface LaTeXTemplate {
  preamble: string;
  documentBegin: string;
  documentEnd: string;
  chapterFormat: string;
  sectionFormat: string;
  subsectionFormat: string;
  figureFormat: string;
  tableFormat: string;
  bibliographyStyle: string;
}

export class ExportEngine {
  private defaultOptions: ExportOptions = {
    format: 'latex',
    includeAbstract: true,
    includeAcknowledgments: true,
    includeTableOfContents: true,
    includeListOfFigures: false,
    includeListOfTables: false,
    includeBibliography: true,
    citationStyle: 'apa',
    fontSize: 12,
    fontFamily: 'times',
    margins: { top: 1, bottom: 1, left: 1.25, right: 1.25 },
    lineSpacing: 'double',
    pageSize: 'a4'
  };

  async exportProject(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options?: Partial<ExportOptions>
  ): Promise<ExportResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    try {
      switch (mergedOptions.format) {
        case 'latex':
          return this.exportToLaTeX(project, chapters, references, mergedOptions);
        case 'pdf':
          return await this.exportToPDF(project, chapters, references, mergedOptions);
        case 'markdown':
          return this.exportToMarkdown(project, chapters, references, mergedOptions);
        case 'html':
          return this.exportToHTML(project, chapters, references, mergedOptions);
        case 'word':
          return await this.exportToWord(project, chapters, references, mergedOptions);
        default:
          return { success: false, filename: '', error: `Unsupported format: ${mergedOptions.format}` };
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        error: error instanceof Error ? error.message : 'Unknown export error'
      };
    }
  }

  private prepareAcademicPdfHtml(htmlContent: string): string {
    const withAcademicStyle = htmlContent.replace('</head>', `
  <style>
    @page { size: A4; margin: 1in; }
    body {
      font-family: 'Times New Roman', serif !important;
      font-size: 12pt !important;
      line-height: 2 !important;
      color: #000 !important;
      background: #fff !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    h1, h2, h3 { font-family: 'Times New Roman', serif !important; color: #000 !important; }
    .chapter-break { page-break-before: always; break-before: page; }
    .chapter-break:first-of-type { page-break-before: auto; break-before: auto; }
    p { text-align: justify; }
  </style>
</head>`);

    return withAcademicStyle.replace(/<section id=\"/g, '<section class=\"chapter-break\" id=\"');
  }

  private markdownToParagraphs(markdown: string): string[] {
    return markdown
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*]\s+/gm, '- ')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`{1,3}/g, '')
        .trim())
      .filter(Boolean);
  }

  private exportToLaTeX(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options: ExportOptions
  ): ExportResult {
    const ws = project.wizard_state;
    const template = this.getLaTeXTemplate(options);

    let content = template.preamble;
    content += `\\title{${this.escapeLaTeX(ws.basics?.title || 'Untitled')}}\n`;
    content += `\\author{${this.escapeLaTeX(ws.basics?.author || 'Unknown')}}\n`;
    content += `\\date{\\today}\n`;
    content += template.documentBegin;

    if (options.includeAbstract) {
      content += `\\begin{abstract}\n`;
      content += `\\textbf{Abstract placeholder - Replace with actual abstract}\n\n`;
      content += `Keywords: ${ws.literature?.keywords?.join(', ') || ''}\n`;
      content += `\\end{abstract}\n\n`;
    }

    if (options.includeTableOfContents) {
      content += `\\tableofcontents\n\n`;
    }

    if (options.includeListOfFigures) {
      content += `\\listoffigures\n\n`;
    }

    if (options.includeListOfTables) {
      content += `\\listoftables\n\n`;
    }

    for (const chapter of chapters) {
      content += `\\chapter{${this.escapeLaTeX(chapter.title)}}\n`;
      content += this.convertMarkdownToLaTeX(chapter.content);
      content += '\n\n';
    }

    if (options.includeBibliography) {
      content += this.generateLaTeXBibliography(references, options.citationStyle);
    }

    content += template.documentEnd;

    const filename = `${this.sanitizeFilename(ws.basics?.title || 'thesis')}.tex`;
    return { success: true, content, filename };
  }

  private getLaTeXTemplate(options: ExportOptions): LaTeXTemplate {
    const pageSize = options.pageSize === 'a4' ? 'a4paper' : 'letterpaper';
    const fontSize = `${options.fontSize}pt`;
    const lineSpacing = options.lineSpacing === 'double' ? 'double' :
      options.lineSpacing === '1.5' ? 'onehalf' : 'single';

    return {
      preamble: `\\documentclass[${fontSize},${pageSize}]{report}\n` +
        `\\usepackage[utf8]{inputenc}\n` +
        `\\usepackage{amsmath,amssymb}\n` +
        `\\usepackage{graphicx}\n` +
        `\\usepackage{hyperref}\n` +
        `\\usepackage{natbib}\n` +
        `\\usepackage{setspace}\n` +
        `\\singlespacing\n`,
      documentBegin: `\\begin{document}\n\\m\n`,
      documentEnd: `\\end{document}`,
      chapterFormat: '',
      sectionFormat: '',
      subsectionFormat: '',
      figureFormat: '\\begin{figure}[h]\\centering\\includegraphics[width=0.8\\linewidth]{}\\caption{}\\end{figure}',
      tableFormat: '\\begin{table}[h]\\centering\\caption{}\\begin{tabular}{}\\end{tabular}\\end{table}',
      bibliographyStyle: '\\bibliographystyle{plain}'
    };
  }

  private convertMarkdownToLaTeX(markdown: string): string {
    let latex = markdown;

    latex = latex.replace(/^### (.*$)/gim, '\\subsection{$1}');
    latex = latex.replace(/^## (.*$)/gim, '\\section{$1}');
    latex = latex.replace(/^# (.*$)/gim, '\\chapter{$1}');

    latex = latex.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
    latex = latex.replace(/\*(.*?)\*/g, '\\textit{$1}');
    latex = latex.replace(/`(.*?)`/g, '\\texttt{$1}');

    latex = latex.replace(/^\- (.*$)/gim, '\\item $1');

    latex = latex.replace(/```(\w*)\n([\s\S]*?)```/g, '\\beginverbatim\n$2\n\\endverbatim');

    return latex;
  }

  private generateLaTeXBibliography(references: Reference[], style: string): string {
    let bib = '\n\\bibliography{references}\n';

    bib += '\\begin{thebibliography}{99}\n';

    for (const ref of references) {
      const authors = ref.authors || 'Unknown';
      const title = ref.title || 'Untitled';
      const year = ref.year || 'n.d.';
      const journal = ref.journal || '';

      switch (style) {
        case 'apa':
          bib += `\\bibitem{${ref.id}} ${authors} (${year}). ${title}. ${journal}.\n`;
          break;
        case 'ieee':
          bib += `\\bibitem{${ref.id}} ${authors}, "${title}," ${journal}, ${year}.\n`;
          break;
        default:
          bib += `\\bibitem{${ref.id}} ${authors}. "${title}." ${journal}, ${year}.\n`;
      }
    }

    bib += '\\end{thebibliography}\n';
    return bib;
  }

  private async exportToPDF(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const htmlResult = this.exportToHTML(project, chapters, references, options);
    if (!htmlResult.success || !htmlResult.content) {
      return htmlResult;
    }

    const styledHtml = this.prepareAcademicPdfHtml(htmlResult.content);
    let container: HTMLDivElement | null = null;

    try {
      container = document.createElement('div');
      container.innerHTML = styledHtml;
      container.style.position = 'fixed';
      container.style.left = '-99999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.background = '#ffffff';
      document.body.appendChild(container);

      const pdfBlob = await html2pdf()
        .set({
          margin: [1, 1, 1, 1],
          filename: htmlResult.filename.replace('.html', '.pdf'),
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff'
          },
          jsPDF: {
            unit: 'in',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: {
            mode: ['css', 'legacy'],
            before: '.chapter-break'
          }
        } as any)
        .from(container)
        .toPdf()
        .outputPdf('blob');

      return {
        success: true,
        content: htmlResult.content,
        blob: pdfBlob,
        filename: htmlResult.filename.replace('.html', '.pdf')
      };
    } catch (error) {
      return {
        success: false,
        filename: htmlResult.filename.replace('.html', '.pdf'),
        error: error instanceof Error ? error.message : 'Browser PDF export failed'
      };
    } finally {
      if (container?.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  private exportToMarkdown(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options: ExportOptions
  ): ExportResult {
    const ws = project.wizard_state;
    let content = `# ${ws.basics?.title || 'Untitled'}\n\n`;
    content += `**Author:** ${ws.basics?.author || 'Unknown'}\n`;
    content += `**Date:** ${new Date().toLocaleDateString()}\n\n`;

    if (options.includeAbstract) {
      content += `## Abstract\n\n`;
      content += `*Abstract placeholder - Replace with actual abstract*\n\n`;
      content += `**Keywords:** ${ws.literature?.keywords?.join(', ') || ''}\n\n`;
    }

    for (const chapter of chapters) {
      content += `## ${chapter.title}\n\n`;
      content += chapter.content + '\n\n';
    }

    if (options.includeBibliography) {
      content += `## References\n\n`;
      for (const ref of references) {
        content += this.formatMarkdownCitation(ref, options.citationStyle) + '\n';
      }
    }

    const filename = `${this.sanitizeFilename(ws.basics?.title || 'thesis')}.md`;
    return { success: true, content, filename };
  }

  private exportToHTML(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options: ExportOptions
  ): ExportResult {
    const ws = project.wizard_state;
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(ws.basics?.title || 'Untitled')}</title>
  <style>
    body { font-family: ${options.fontFamily === 'times' ? 'Times New Roman' : 'Arial'}, serif;
           font-size: ${options.fontSize}px; line-height: ${options.lineSpacing};
           max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { font-family: Arial, sans-serif; }
    .abstract { background: #f5f5f5; padding: 15px; border-left: 4px solid #333; }
    .references { margin-top: 30px; }
    blockquote { border-left: 3px solid #ccc; padding-left: 15px; margin-left: 0; }
    code { background: #f4f4f4; padding: 2px 5px; }
  </style>
</head>
<body>
  <h1>${this.escapeHTML(ws.basics?.title || 'Untitled')}</h1>
  <p><strong>Author:</strong> ${this.escapeHTML(ws.basics?.author || 'Unknown')}</p>
  <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;

    if (options.includeAbstract) {
      content += `
  <div class="abstract">
    <h2>Abstract</h2>
    <p><em>Abstract placeholder - Replace with actual abstract</em></p>
    <p><strong>Keywords:</strong> ${ws.literature?.keywords?.join(', ') || ''}</p>
  </div>`;
    }

    if (options.includeTableOfContents) {
      content += `
  <nav>
    <h2>Table of Contents</h2>
    <ul>
      ${chapters.map(ch => `<li><a href="#${this.slugify(ch.title)}">${this.escapeHTML(ch.title)}</a></li>`).join('\n      ')}
    </ul>
  </nav>`;
    }

    for (const chapter of chapters) {
      content += `
  <section id="${this.slugify(chapter.title)}">
    <h2>${this.escapeHTML(chapter.title)}</h2>
    ${this.convertMarkdownToHTML(chapter.content)}
  </section>`;
    }

    if (options.includeBibliography) {
      content += `
  <section class="references">
    <h2>References</h2>
    <ol>
      ${references.map(ref => `<li>${this.formatHTMLCitation(ref, options.citationStyle)}</li>`).join('\n      ')}
    </ol>
  </section>`;
    }

    content += `
</body>
</html>`;

    const filename = `${this.sanitizeFilename(ws.basics?.title || 'thesis')}.html`;
    return { success: true, content, filename };
  }

  private convertMarkdownToHTML(markdown: string): string {
    let html = this.escapeHTML(markdown);

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    html = html.replace(/\n\n/g, '</p><p>');
    html = `<p>${html}</p>`;

    return html;
  }

  private async exportToWord(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    options: ExportOptions
  ): Promise<ExportResult> {
    const ws = project.wizard_state as any;
    const basics = ws.basics || {};
    const supervisor = basics.supervisor || 'N/A';
    const institution = basics.institution || 'Institution';
    const department = basics.department || 'Department';
    const dateText = basics.year ? String(basics.year) : new Date().toLocaleDateString();

    const children: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 320 },
        children: [new TextRun({ text: basics.title || 'Untitled Thesis', size: 32, bold: true, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Author: ${basics.author || 'Unknown'}`, size: 24, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Institution: ${institution}`, size: 24, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Department: ${department}`, size: 24, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Supervisor: ${supervisor}`, size: 24, font: 'Times New Roman' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360 },
        children: [new TextRun({ text: `Date: ${dateText}`, size: 24, font: 'Times New Roman' })]
      })
    ];

    chapters.forEach((chapter, index) => {
      children.push(
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: index === 0,
          spacing: { before: 240, after: 180, line: 480 }
        })
      );

      this.markdownToParagraphs(chapter.content).forEach((paragraph) => {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 480, after: 160 },
            children: [new TextRun({ text: paragraph, size: 24, font: 'Times New Roman' })]
          })
        );
      });
    });

    if (options.includeBibliography && references.length > 0) {
      children.push(
        new Paragraph({
          text: 'References',
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          spacing: { before: 240, after: 180, line: 480 }
        })
      );

      references.forEach((ref, index) => {
        children.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 480, after: 120 },
            children: [new TextRun({ text: `${index + 1}. ${this.formatMarkdownCitation(ref, options.citationStyle)}`, size: 24, font: 'Times New Roman' })]
          })
        );
      });
    }

    try {
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: {
                font: 'Times New Roman',
                size: 24
              },
              paragraph: {
                spacing: {
                  line: 480,
                  after: 160
                }
              }
            }
          }
        },
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440
                }
              }
            },
            children
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      return {
        success: true,
        content: 'docx',
        blob,
        filename: `${this.sanitizeFilename(ws.basics?.title || 'thesis')}.docx`
      };
    } catch (error) {
      return {
        success: false,
        filename: `${this.sanitizeFilename(ws.basics?.title || 'thesis')}.docx`,
        error: error instanceof Error ? error.message : 'DOCX export failed'
      };
    }
  }

  private formatMarkdownCitation(ref: Reference, style: string): string {
    const authors = Array.isArray(ref.authors)
      ? ref.authors.map(a => `${a.lastName}, ${a.firstName.charAt(0)}.`).join(', ')
      : 'Unknown';
    const title = ref.title || 'Untitled';
    const year = ref.year || 'n.d.';
    const journal = ref.journal || '';

    switch (style) {
      case 'apa':
        return `${authors} (${year}). ${title}. ${journal}.`;
      case 'mla':
        return `${authors}. "${title}." ${journal}, ${year}.`;
      case 'ieee':
        return `${authors}, "${title}," ${journal}, ${year}.`;
      default:
        return `${authors}. "${title}." ${journal}, ${year}.`;
    }
  }

  private formatHTMLCitation(ref: Reference, style: string): string {
    const url = ref.url || '#';
    const link = ref.url ? `<a href="${url}">${ref.title}</a>` : this.escapeHTML(ref.title || 'Untitled');
    const authors = Array.isArray(ref.authors)
      ? ref.authors.map(a => `${a.lastName}, ${a.firstName.charAt(0)}.`).join(', ')
      : 'Unknown';
    const year = ref.year || 'n.d.';
    const journal = ref.journal || '';

    switch (style) {
      case 'apa':
        return `${authors} (${year}). ${link}. ${journal}.`;
      case 'mla':
        return `${authors}. "${link}." ${journal}, ${year}.`;
      case 'ieee':
        return `${authors}, "${link}," ${journal}, ${year}.`;
      default:
        return `${authors}. "${link}." ${journal}, ${year}.`;
    }
  }

  private escapeLaTeX(text: string): string {
    return text
      .replace(/\\/g, '\\textbackslash')
      .replace(/[&%$#_{}]/g, '\\$&')
      .replace(/\^/g, '\\^{}')
      .replace(/~/g, '\\~{}');
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private slugify(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 100);
  }

  downloadExport(result: ExportResult): void {
    if (!result.success || (!result.content && !result.blob)) {
      console.error('Export failed:', result.error);
      return;
    }

    const blob = result.blob || new Blob([result.content], { type: this.getMimeType(result.filename) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      tex: 'application/x-tex',
      md: 'text/markdown',
      html: 'text/html',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext || ''] || 'text/plain';
  }

  async previewExport(
    project: AcademicProject,
    chapters: { id: string; title: string; content: string }[],
    references: Reference[],
    format: ExportFormat
  ): Promise<string> {
    const result = await this.exportProject(project, chapters, references, { format });
    return result.content || result.error || 'Preview not available';
  }
}

export const exportEngine = new ExportEngine();

