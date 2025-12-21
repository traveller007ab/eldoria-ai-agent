import sys
import json
import os
from docx_builder import build_thesis

def main():
    if len(sys.argv) < 2:
        print("Usage: python generate.py '<json_data>'")
        return

    try:
        input_data = json.loads(sys.argv[1])
        # In a real scenario, we would trigger LLM generations here
        # for missing chapters before building.
        
        output_file = build_thesis(input_data)
        print(f"Academic Generation Complete. Workspace: {os.getcwd()}")
        print(f"Output File: {output_file}")
    except Exception as e:
        print(f"Generation Failed: {str(e)}")

if __name__ == "__main__":
    main()
