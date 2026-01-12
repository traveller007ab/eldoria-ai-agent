"""
Project Service
Handles project CRUD operations and business logic.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class ProjectService:
    """Service for managing academic projects."""
    
    def __init__(self):
        # In-memory storage for demo (use database in production)
        self.projects: Dict[str, Dict] = {}
        self.wizard_states: Dict[str, Dict] = {}
        self.draft_sections: Dict[str, Dict] = {}
        self.references: Dict[str, List[Dict]] = {}
    
    def create_project(self, user_id: str, project_data: Dict) -> Dict:
        """Create a new project with default wizard state."""
        
        project_id = str(uuid.uuid4())
        
        project = {
            "id": project_id,
            "user_id": user_id,
            "name": project_data.get("name", "New Research Project"),
            "format": project_data.get("format", "rsu-mech-eng"),
            "status": "drafting",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        self.projects[project_id] = project
        
        # Create wizard state
        wizard_state = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "current_step": 0,
            "basics": {
                "title": "",
                "author": "",
                "regNumber": "",
                "year": str(datetime.now().year)
            },
            "objectives": {
                "aim": "",
                "specificObjectives": []
            },
            "scope": {
                "scopeOfWork": "",
                "significance": "",
                "limitations": ""
            },
            "literature": {
                "keywords": [],
                "searchQueries": []
            },
            "methodology": {
                "materials": [],
                "methods": "",
                "costs": "",
                "results_data": ""
            },
            "finishing": {
                "dedication": "",
                "acknowledgements": "",
                "preface": ""
            },
            "generation_config": {
                "target_page_count": 80,
                "depth": "standard"
            },
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        self.wizard_states[project_id] = wizard_state
        self.references[project_id] = []
        
        return project
    
    def get_project(self, project_id: str, user_id: str) -> Optional[Dict]:
        """Get a project by ID, ensuring user ownership."""
        
        project = self.projects.get(project_id)
        if project and project.get("user_id") == user_id:
            return project
        return None
    
    def get_user_projects(self, user_id: str, limit: int = 20, offset: int = 0) -> List[Dict]:
        """Get all projects for a user."""
        
        user_projects = [
            p for p in self.projects.values() 
            if p.get("user_id") == user_id
        ]
        
        # Sort by updated_at descending
        user_projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        
        return user_projects[offset:offset + limit]
    
    def update_project(self, project_id: str, user_id: str, update_data: Dict) -> Optional[Dict]:
        """Update a project."""
        
        project = self.get_project(project_id, user_id)
        if not project:
            return None
        
        for field, value in update_data.items():
            if field not in ["id", "user_id", "created_at"]:
                project[field] = value
        
        project["updated_at"] = datetime.now().isoformat()
        
        return project
    
    def delete_project(self, project_id: str, user_id: str) -> bool:
        """Delete a project and all related data."""
        
        project = self.get_project(project_id, user_id)
        if not project:
            return False
        
        # Remove all related data
        del self.projects[project_id]
        if project_id in self.wizard_states:
            del self.wizard_states[project_id]
        if project_id in self.references:
            del self.references[project_id]
        
        # Remove draft sections
        keys_to_remove = [k for k in self.draft_sections if k.startswith(project_id)]
        for k in keys_to_remove:
            del self.draft_sections[k]
        
        return True
    
    def get_wizard_state(self, project_id: str, user_id: str) -> Optional[Dict]:
        """Get wizard state for a project."""
        
        if not self.get_project(project_id, user_id):
            return None
        
        return self.wizard_states.get(project_id)
    
    def update_wizard_state(
        self,
        project_id: str,
        user_id: str,
        step: int,
        section: str,
        data: Dict
    ) -> Optional[Dict]:
        """Update wizard state for a step."""
        
        wizard_state = self.get_wizard_state(project_id, user_id)
        if not wizard_state:
            return None
        
        if section in wizard_state:
            wizard_state[section].update(data)
        
        wizard_state["updated_at"] = datetime.now().isoformat()
        
        return wizard_state
    
    def advance_wizard_step(
        self,
        project_id: str,
        user_id: str,
        direction: int
    ) -> Optional[Dict]:
        """Advance or retreat wizard step."""
        
        wizard_state = self.get_wizard_state(project_id, user_id)
        if not wizard_state:
            return None
        
        new_step = wizard_state["current_step"] + direction
        if 0 <= new_step <= 6:
            wizard_state["current_step"] = new_step
        
        wizard_state["updated_at"] = datetime.now().isoformat()
        
        return wizard_state
    
    def get_draft_section(
        self,
        project_id: str,
        user_id: str,
        section_name: str
    ) -> Optional[Dict]:
        """Get a specific draft section."""
        
        if not self.get_project(project_id, user_id):
            return None
        
        key = f"{project_id}_{section_name}"
        return self.draft_sections.get(key)
    
    def update_draft_section(
        self,
        project_id: str,
        user_id: str,
        section_name: str,
        content: str
    ) -> Dict:
        """Update or create a draft section."""
        
        if not self.get_project(project_id, user_id):
            raise ValueError("Project not found")
        
        key = f"{project_id}_{section_name}"
        
        section = self.draft_sections.get(key, {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "section_name": section_name,
            "content": "",
            "word_count": 0,
            "version": 0
        })
        
        section["content"] = content
        section["word_count"] = len(content.split()) if content else 0
        section["version"] += 1
        section["updated_at"] = datetime.now().isoformat()
        
        self.draft_sections[key] = section
        
        return section
    
    def get_all_draft_sections(self, project_id: str, user_id: str) -> List[Dict]:
        """Get all draft sections for a project."""
        
        if not self.get_project(project_id, user_id):
            return []
        
        prefix = f"{project_id}_"
        return [
            s for k, s in self.draft_sections.items() 
            if k.startswith(prefix)
        ]
    
    def add_reference(self, project_id: str, user_id: str, reference: Dict) -> Dict:
        """Add a reference to a project."""
        
        if not self.get_project(project_id, user_id):
            raise ValueError("Project not found")
        
        ref = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            **reference,
            "created_at": datetime.now().isoformat()
        }
        
        if project_id not in self.references:
            self.references[project_id] = []
        
        self.references[project_id].append(ref)
        
        return ref
    
    def get_references(self, project_id: str, user_id: str) -> List[Dict]:
        """Get all references for a project."""
        
        if not self.get_project(project_id, user_id):
            return []
        
        return self.references.get(project_id, [])
    
    def get_compliance_report(self, project_id: str, user_id: str) -> Dict:
        """Generate compliance report for a project."""
        
        project = self.get_project(project_id, user_id)
        if not project:
            raise ValueError("Project not found")
        
        wizard_state = self.wizard_states.get(project_id, {})
        draft_sections = self.get_all_draft_sections(project_id, user_id)
        references = self.references.get(project_id, [])
        
        # Calculate total word count
        total_words = sum(s.get("word_count", 0) for s in draft_sections)
        
        # Generate compliance checks
        checks = []
        total_score = 0
        max_score = 100
        
        # Word count check
        if total_words >= 15000:
            checks.append({
                "label": "Word Count",
                "status": "success",
                "detail": f"{total_words:,} words - Target met (15,000+)",
                "score": 20
            })
            total_score += 20
        elif total_words >= 8000:
            checks.append({
                "label": "Word Count",
                "status": "warning",
                "detail": f"{total_words:,} words - Needs more content",
                "score": 10
            })
            total_score += 10
        else:
            checks.append({
                "label": "Word Count",
                "status": "error",
                "detail": f"{total_words:,} words - Significantly under target",
                "score": 0
            })
        
        # Title check
        title = wizard_state.get("basics", {}).get("title", "")
        if len(title) > 20:
            checks.append({
                "label": "Title Definition",
                "status": "success",
                "detail": "Clear, descriptive title defined.",
                "score": 20
            })
            total_score += 20
        elif title:
            checks.append({
                "label": "Title Definition",
                "status": "warning",
                "detail": "Title may be too short.",
                "score": 10
            })
            total_score += 10
        else:
            checks.append({
                "label": "Title Definition",
                "status": "error",
                "detail": "No title defined.",
                "score": 0
            })
        
        # Objectives check
        objectives = wizard_state.get("objectives", {}).get("specificObjectives", [])
        aim = wizard_state.get("objectives", {}).get("aim", "")
        if len(objectives) >= 3 and aim:
            checks.append({
                "label": "SMART Objectives",
                "status": "success",
                "detail": f"{len(objectives)} objectives with clear aim.",
                "score": 20
            })
            total_score += 20
        elif objectives:
            checks.append({
                "label": "SMART Objectives",
                "status": "warning",
                "detail": f"Only {len(objectives)} objectives defined.",
                "score": 10
            })
            total_score += 10
        else:
            checks.append({
                "label": "SMART Objectives",
                "status": "error",
                "detail": "No objectives defined.",
                "score": 0
            })
        
        # Methodology check
        materials = wizard_state.get("methodology", {}).get("materials", [])
        methods = wizard_state.get("methodology", {}).get("methods", "")
        if materials and len(methods) > 50:
            checks.append({
                "label": "Execution Plan",
                "status": "success",
                "detail": "Materials and methods documented.",
                "score": 20
            })
            total_score += 20
        elif materials or methods:
            checks.append({
                "label": "Execution Plan",
                "status": "warning",
                "detail": "Partial methodology defined.",
                "score": 10
            })
            total_score += 10
        else:
            checks.append({
                "label": "Execution Plan",
                "status": "info",
                "detail": "Awaiting methodology input.",
                "score": 0
            })
        
        # References check
        ref_count = len(references)
        if ref_count >= 10:
            checks.append({
                "label": "References",
                "status": "success",
                "detail": f"{ref_count} references - Good coverage",
                "score": 20
            })
            total_score += 20
        elif ref_count >= 5:
            checks.append({
                "label": "References",
                "status": "warning",
                "detail": f"{ref_count} references - Needs more",
                "score": 10
            })
            total_score += 10
        else:
            checks.append({
                "label": "References",
                "status": "info",
                "detail": f"{ref_count} references - Add more",
                "score": 5
            })
            total_score += 5
        
        return {
            "score": total_score,
            "max_score": max_score,
            "percentage": (total_score / max_score) * 100,
            "checks": checks,
            "word_count": total_words,
            "references_count": ref_count
        }
