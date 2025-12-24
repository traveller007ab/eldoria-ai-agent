import sys
import json
import os
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_thesis(input_data):
    doc = Document()
    
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
            doc.add_heading(chapter_name.upper(), level=1)
            # Placeholder for complex markdown parsing
            # Split by double newlines for basic paragraph handling
            for para in content.split('\n\n'):
                if para.strip():
                    doc.add_paragraph(para.strip())
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
    for section in doc.sections:
        footer = section.footer
        p = footer.paragraphs[0]
        p.text = f"Eldoria-Assisted Research Draft | Project ID: {input_data.get('id', 'N/A')} | Ethical Transparency Log Active"
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for run in p.runs:
            run.font.size = Pt(8)
            run.font.italic = True

    output_path = f"thesis_{input_data.get('id', 'temp')}.docx"
    doc.save(output_path)
    return output_path

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
