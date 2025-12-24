import sys
import json

def run_audit(project_data):
    wizard = project_data.get('wizard_state', {})
    drafts = project_data.get('draft_content', {})
    compliance = wizard.get('compliance', {})
    basics = wizard.get('basics', {})
    objectives = wizard.get('objectives', {})
    methodology = wizard.get('methodology', {})
    finishing = wizard.get('finishing', {})
    
    results = {
        "score": 0,
        "checks": []
    }
    
    # 1. Title Check
    if len(basics.get('title', '')) > 10:
        results["score"] += 15
        results["checks"].append({"label": "Title Definition", "status": "success", "detail": "Title is descriptive."})
    else:
        results["checks"].append({"label": "Title Definition", "status": "warning", "detail": "Title is too short or missing."})
        
    # 2. Objectives Check
    objs = objectives.get('specificObjectives', [])
    if len(objs) >= 3:
        results["score"] += 15
        results["checks"].append({"label": "SMART Objectives", "status": "success", "detail": f"{len(objs)} objectives defined."})
    else:
        results["checks"].append({"label": "SMART Objectives", "status": "warning", "detail": "Target at least 3 specific objectives."})
        
    # 3. Execution Plan Check
    if len(methodology.get('materials', [])) > 0 and len(methodology.get('methods', '')) > 10:
        results["score"] += 15
        results["checks"].append({"label": "Execution Plan", "status": "success", "detail": "Technical methodology defined."})
    else:
        results["checks"].append({"label": "Execution Plan", "status": "info", "detail": "Awaiting methodology details."})

    # 4. Technical Results (Chapter 4)
    if "Chapter 4: Results & Discussion" in drafts and len(drafts["Chapter 4: Results & Discussion"]) > 200:
        results["score"] += 20
        results["checks"].append({"label": "Technical Results", "status": "success", "detail": "Chapter 4 synthesized with data."})
    elif methodology.get('results_data'):
        results["checks"].append({"label": "Technical Results", "status": "warning", "detail": "Data provided, synthesis pending."})
    else:
        results["checks"].append({"label": "Technical Results", "status": "info", "detail": "Awaiting data input for Chapter 4."})

    # 5. Thesis Concluding (Chapter 5 & Front Matter)
    has_ch5 = "Chapter 5: Conclusion & Recommendations" in drafts
    has_fm = "Front Matter" in drafts
    if has_ch5 and has_fm:
        results["score"] += 20
        results["checks"].append({"label": "Thesis Concluding", "status": "success", "detail": "Final chapters and front matter ready."})
    else:
        results["checks"].append({"label": "Thesis Concluding", "status": "info", "detail": "Concluding sections pending."})

    # 6. References
    refs = project_data.get('references', [])
    if len(refs) >= 5:
        results["score"] += 15
        results["checks"].append({"label": "Originality Shield", "status": "success", "detail": f"{len(refs)} scholarly sources in vault."})
    else:
        results["checks"].append({"label": "Originality Shield", "status": "warning", "detail": "Less than 5 references saved."})
    
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No data")
        sys.exit(1)
    
    try:
        data = json.loads(sys.argv[1])
        print(json.dumps(run_audit(data)))
    except Exception as e:
        print(f"Error: {str(e)}")
