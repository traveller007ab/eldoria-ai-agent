
import sys
import os
from datetime import datetime

# Add services directory to path
sys.path.append(os.path.join(os.getcwd(), 'services', 'academic_assistant'))

try:
    print("Importing docx_builder...")
    from docx_builder import build_simple_doc, build_thesis
    
    print("Testing build_simple_doc (Output Panel)...")
    # Mock data
    doc_bytes = build_simple_doc(
        content="# Test Content\n\nThis is a test.",
        title="Deployment Verification"
    )
    if not doc_bytes:
        raise Exception("build_simple_doc returned None")
    print("build_simple_doc passed (Size: {} bytes)".format(len(doc_bytes.getvalue())))

    print("Testing build_thesis (Academic Hub)...")
    # Mock data
    thesis_bytes = build_thesis(
        title="Deployment Thesis",
        drafts={"Introduction": "## Intro\nText", "Conclusion": "## End\nText"},
        ordered_chapters=["Introduction", "Conclusion"]
    )
    if not thesis_bytes:
        raise Exception("build_thesis returned None")
    print("build_thesis passed (Size: {} bytes)".format(len(thesis_bytes.getvalue())))

    print("✅ All Python Logic Checks Passed!")

except Exception as e:
    print(f"❌ Verification FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
