import sys
import json
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import time
from datetime import datetime
import re

def _sanitize_content(content):
    """
    Robustly strips AI preambles using a multi-pass regex loop.
    Matches the logic in OutputPanel.tsx and AcademicHub.tsx.
    """
    if not content:
        return ""
        
    # Aggressive preamble regex
    # Handles Markdown prefixes (e.g. **Here is...) and colons, AND newlines ([\s\S])
    # Note: In Python, re.DOTALL makes '.' match newlines, but we use [\s\S] equivalent logic or just standard multiline
    
    preamble_pattern = re.compile(r"^([\s\*\-_>]*)(To perform|I will|Sure|I'll|Certainly|Here is|Then, I'll proceed|In order to|Okay|I've|I can|I've noticed|First|I will first|Secondly|Let me)[\s\S]+?(\.|:|\n)", re.IGNORECASE | re.MULTILINE)
    
    cleaned_content = content.strip()
    last_cleaned = ""
    
    # Multi-pass loop to catch consecutive/nested preambles
    pass_count = 0
    while cleaned_content != last_cleaned and pass_count < 20:
        pass_count += 1
        last_cleaned = cleaned_content
        # re.sub replaces all occurrences, but since we are anchoring to ^ (start of line), 
        # it effectively removes leading preambles.
        cleaned_content = preamble_pattern.sub('', cleaned_content).strip()
        
    return cleaned_content

def _setup_page_layout(doc):
    """Applies standard A4/Letter margins (1 inch)"""
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
def _add_header(doc, right_text="Eldoria Hub - Strategic Brief"):
    """Adds standard header with timestamp and title"""
    section = doc.sections[0]
    header = section.header
    
    # Use a table for left/right alignment
    table = header.add_table(1, 2, width=Inches(6.5))
    table.autofit = False
    
    # Left: Timestamp
    cell_left = table.cell(0, 0)
    p = cell_left.paragraphs[0]
    p.text = datetime.now().strftime("%m/%d/%y, %I:%M %p")
    p.style.font.name = 'Arial'
    p.style.font.size = Pt(9)
    p.style.font.color.rgb = RGBColor(0x64, 0x74, 0x8B) # Slate gray

    # Right: Title
    cell_right = table.cell(0, 1)
    p = cell_right.paragraphs[0]
    p.text = right_text
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.style.font.name = 'Arial'
    p.style.font.size = Pt(9)
    p.style.font.bold = True
    p.style.font.color.rgb = RGBColor(0x00, 0x7B, 0xFF) # Blue

def _add_footer(doc, page_num=True):
    """Adds footer with Page X of Y and generation info"""
    section = doc.sections[0]
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    
    # helper for gray text runs
    def add_run(text):
        r = p.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(8)
        r.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        return r

    # helper to create field run
    def create_field_run(instr):
        r = p.add_run()
        r.font.name = 'Arial' 
        r.font.size = Pt(8)
        
        # Begin
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        r._r.append(fldChar1)
        
        # Instruction
        instrText = OxmlElement('w:instrText')
        instrText.set(qn('xml:space'), 'preserve')
        instrText.text = instr
        r._r.append(instrText)
        
        # End
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'end')
        r._r.append(fldChar2)

    add_run("Page ")
    create_field_run("PAGE")
    add_run(" of ")
    create_field_run("NUMPAGES")
    add_run(" | GENERATED VIA ELDORIA AI IDE")

def _create_vertical_bar_header(doc, text, level=2):
    """
    Simulates a 'Vertical Bar Header' using a table with a colored left border cell.
    [ | ] [ HEADING TEXT ]
    """
    table = doc.add_table(rows=1, cols=2)
    table.autofit = False 
    table.allow_autofit = False
    
    # Force column constraints
    col0_w = Inches(0.05)
    col1_w = Inches(6.0)
    
    # Apply to columns
    table.columns[0].width = col0_w
    table.columns[1].width = col1_w
    
    # Apply to cells (Required for Word to respect it)
    cell0 = table.cell(0, 0)
    cell0.width = col0_w
    _set_shading(cell0._tc.get_or_add_tcPr(), "007BFF") # Blue fill
    
    cell1 = table.cell(0, 1)
    cell1.width = col1_w
    p = cell1.paragraphs[0]
    run = p.add_run(text.upper())
    run.font.name = 'Arial'
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x7B, 0xFF)
    run.font.size = Pt(14 if level > 1 else 16)
    
    doc.add_paragraph() # Spacer after header

def _setup_styles(doc):
    """Configures document styles to match Eldoria's web aesthetic (Blue/Sans-Serif)"""
    # 1. Normal Text
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)
    font.color.rgb = RGBColor(0, 0, 0) # Force Black to prevent style bleeding
    
    # 2. Headings (Blue #007BFF)
    for i in range(1, 4):
        style_name = f'Heading {i}'
        try:
            style = doc.styles[style_name]
        except KeyError:
            style = doc.styles.add_style(style_name, 1) # 1 = Paragraph Style
            
        font = style.font
        font.name = 'Arial'
        font.color.rgb = RGBColor(0x00, 0x7B, 0xFF)
        if i == 1: font.size = Pt(18) # Web H1
        if i == 2: font.size = Pt(16) # Web H2
        if i == 3: font.size = Pt(14) # Web H3
def _set_shading(element, color_hex):
    """Helper to add background color to a table cell or paragraph"""
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:val'), 'clear')
    shading_elm.set(qn('w:color'), 'auto')
    shading_elm.set(qn('w:fill'), color_hex)
    element.append(shading_elm)

def _add_markdown_content(doc, content):
    """
    Parses basic Markdown (Headers, Lists, Tables, Bold) into Docx elements.
    Removes SAF blocks.
    """
    if not content: return

    # 1. Sanitize preambles first
    content = _sanitize_content(content)

    # 2. Transform SAF/JSON blocks to match Print View ("Technical Specification")
    # Instead of deleting, we reformat to a Header + Code Block
    
    # Handle wrapped cases first: ```json<SAF_ISO> -> ```json
    content = re.sub(r"```json\s*<SAF_ISO>", "```json", content, flags=re.IGNORECASE)
    content = re.sub(r"</SAF_ISO>\s*```", "```", content, flags=re.IGNORECASE)
    
    # Handle bare tags: <SAF_ISO> -> ### Header + ```json
    content = re.sub(r"<SAF_ISO>", "\n\n### Technical Specification (SAF-ISO)\n```json\n", content, flags=re.IGNORECASE)
    content = re.sub(r"</SAF_ISO>", "\n```\n", content, flags=re.IGNORECASE)

    lines = content.split('\n')
    
    # State flags
    in_code_block = False
    table_buffer = []
    
    def flush_table():
        if not table_buffer: return
        # Create table
        rows = len(table_buffer)
        cols = len(table_buffer[0].split('|')) - 2 # Assuming | val | val | format
        if cols < 1: return
        
        table = doc.add_table(rows=rows, cols=cols)
        table.style = 'Table Grid'
        
        for r_idx, row_str in enumerate(table_buffer):
            # Split and clean empty start/end
            cells = [c.strip() for c in row_str.split('|')[1:-1]]
            for c_idx, cell_text in enumerate(cells):
                if c_idx < cols:
                    cell = table.cell(r_idx, c_idx)
                    cell.text = cell_text
                    if r_idx == 0: # Header shading
                         _set_shading(cell._tc.get_or_add_tcPr(), "F8FAFC")
                         for paragraph in cell.paragraphs:
                             for run in paragraph.runs:
                                 run.font.bold = True
        
        doc.add_paragraph() # Spacer
        table_buffer.clear()

    for line in lines:
        stripped = line.strip()
        
        # Table Detection
        if stripped.startswith('|'):
            table_buffer.append(stripped)
            continue
        elif table_buffer:
             flush_table()

        # Code block toggle
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            continue
            
        if in_code_block:
            # Render code inside a shaded table cell for background color
            t = doc.add_table(rows=1, cols=1)
            cell = t.cell(0, 0)
            _set_shading(cell._tc.get_or_add_tcPr(), "F1F5F9") # Slate-100
            p = cell.paragraphs[0]
            p.text = stripped
            p.style.font.name = 'Courier New'
            p.style.font.size = Pt(9)
            continue

        # Headers - Use Special Vertical Bar Style
        if stripped.startswith('# '):
            _create_vertical_bar_header(doc, stripped[2:], level=1)
        elif stripped.startswith('## '):
            _create_vertical_bar_header(doc, stripped[3:], level=2)
        elif stripped.startswith('### '):
            _create_vertical_bar_header(doc, stripped[4:], level=3)
        
        # List Items - Bullet
        elif stripped.startswith('- ') or stripped.startswith('* '):
            try:
                p = doc.add_paragraph(style='List Bullet')
            except:
                p = doc.add_paragraph(style='List Paragraph') # Fallback
            _process_bold(p, stripped[2:])
            
        # List Items - Numbered
        elif re.match(r'^\d+\.\s', stripped):
            try:
                p = doc.add_paragraph(style='List Number')
            except:
                 p = doc.add_paragraph(style='List Paragraph')
            # Remove "1. " prefix
            text_content = re.sub(r'^\d+\.\s', '', stripped)
            _process_bold(p, text_content)
            
        # Standard Paragraph
        else:
            if not stripped: continue
            p = doc.add_paragraph()
            _process_bold(p, stripped)
    
    # Flush any remaining table
    if table_buffer: flush_table()


def _process_bold(paragraph, text):
    """Refactored bold processing"""
    segments = text.split('**')
    for i, segment in enumerate(segments):
        if not segment: continue
        run = paragraph.add_run(segment)
        if i % 2 != 0: # Odd indices are inside **
            run.bold = True

def build_thesis(input_data):
    doc = Document()
    _setup_page_layout(doc)
    _setup_styles(doc) # Keep valid for fallbacks
    _add_header(doc, right_text="ACADEMIC DRAFT")
    _add_footer(doc)
    
    # 1. Title Page
    title = input_data.get('basics', {}).get('title', 'UNTITLED THESIS').upper()
    author = input_data.get('basics', {}).get('author', 'UNKNOWN AUTHOR')
    reg_num = input_data.get('basics', {}).get('regNumber', '')
    year = input_data.get('basics', {}).get('year', '2024')
    
    # Simple Title Page Logic
    for _ in range(5): doc.add_paragraph()
    p = doc.add_paragraph(title)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.runs[0]
    run.bold = True
    run.font.size = Pt(16)
    
    for _ in range(3): doc.add_paragraph()
    p = doc.add_paragraph("BY")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p = doc.add_paragraph(author)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].bold = True
    
    p = doc.add_paragraph(reg_num)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    for _ in range(5): doc.add_paragraph()
    p = doc.add_paragraph("A THESIS SUBMITTED TO THE DEPARTMENT OF MECHANICAL ENGINEERING")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p = doc.add_paragraph("RIVERS STATE UNIVERSITY, PORT HARCOURT")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    p = doc.add_paragraph(year)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    doc.add_page_break()
    
    # 2. Content Sections
    ordered_chapters = [
        'Front Matter',
        'Abstract', 
        'Chapter 1: Introduction', 
        'Chapter 2: Literature Review', 
        'Chapter 3: Materials & Methods',
        'Chapter 4: Results & Discussion',
        'Chapter 5: Conclusion & Recommendations'
    ]
    
    drafts = input_data.get('draft_content', {})
    for chapter_name in ordered_chapters:
        content = drafts.get(chapter_name)
        if content:
            # Use new markdown parser
            _add_markdown_content(doc, content)
            doc.add_page_break()

    # 3. References
    references = input_data.get('references', [])
    if references:
        doc.add_heading('REFERENCES', level=1)
        for ref in references:
            apa = ref.get('formattedApa', f"{ref.get('authors')} ({ref.get('year')}). {ref.get('title')}. {ref.get('journal')}.")
            p = doc.add_paragraph(apa)
            p.style.font.size = Pt(11)
    
    # 4. Ethical Watermark (Footer)
    # Footer handled by _add_footer

    output_path = f"thesis_{input_data.get('id', 'temp')}.docx"
    doc.save(output_path)
    return output_path

def build_simple_doc(title, content):
    doc = Document()
    _setup_page_layout(doc)
    _setup_styles(doc) # Fallbacks
    _add_header(doc, right_text="Eldoria Hub - Strategic Brief")
    _add_footer(doc)
    
    # Professional Header Title Block
    p = doc.add_paragraph("ELDORIA STRATEGIC ANALYSIS")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.runs[0].font.name = 'Arial'
    p.runs[0].font.size = Pt(22)
    p.runs[0].font.bold = True
    p.runs[0].font.color.rgb = RGBColor(0x00, 0x7B, 0xFF)
    
    p2 = doc.add_paragraph(title.upper())
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.runs[0].font.size = Pt(14)
    p2.runs[0].font.bold = True
    
    doc.add_paragraph() # Spacer
    
    # Body Content via Parser
    _add_markdown_content(doc, content)
                
    # Footer is handled by _add_footer

    filename = f"export_{int(time.time())}.docx"
    output_path = os.path.join(os.getcwd(), filename)
    doc.save(output_path)
    return filename, output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No input JSON provided")
        sys.exit(1)
        
    try:
        data = json.loads(sys.argv[1])
        path = build_thesis(data)
        print(f"SUCCESS: {path}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        sys.exit(1)
