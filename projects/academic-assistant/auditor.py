import sys
import json

def run_audit(project_data):
    wizard = project_data.get('wizard_state', {})
    compliance = wizard.get('compliance', {})
    basics = wizard.get('basics', {})
    objectives = wizard.get('objectives', {})
    
    results = {
        "score": 0,
        "checks": []
    }
    
    # 1. Title Check
    if len(basics.get('title', '')) > 10:
        results["score"] += 20
        results["checks"].append({"label": "Title Definition", "status": "success", "detail": "Title is descriptive."})
    else:
        results["checks"].append({"label": "Title Definition", "status": "warning", "detail": "Title is too short or missing."})
        
    # 2. Objectives Check
    objs = objectives.get('specificObjectives', [])
    if len(objs) >= 3:
        results["score"] += 30
        results["checks"].append({"label": "SMART Objectives", "status": "success", "detail": f"{len(objs)} objectives defined."})
    else:
        results["checks"].append({"label": "SMART Objectives", "status": "warning", "detail": "Target at least 3 specific objectives."})
        
    # 3. Methodology Check
    method = wizard.get('methodology', {})
    if len(method.get('materials', [])) > 0 and len(method.get('costs', '')) > 5:
        results["score"] += 25
        results["checks"].append({"label": "Execution Plan", "status": "success", "detail": "Materials and costs localized."})
    else:
        results["checks"].append({"label": "Execution Plan", "status": "info", "detail": "Awaiting methodology details."})

    # 4. Plagiarism Placeholder
    results["checks"].append({"label": "Originality Shield", "status": "info", "detail": "Plagiarism scan pending synthesis."})
    
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
