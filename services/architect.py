"""
Genesis AI Architect - Backend Service
Generates complete SAF blueprints from natural language descriptions.
"""

import json
import os
import re
import traceback
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables explicitly to ensure API keys are available
load_dotenv(".env")
load_dotenv(".env.local")

router = APIRouter(prefix="/architect", tags=["architect"])

# --- Models ---

class ArchitectRequest(BaseModel):
    system_description: str
    domain: str = "auto_detect"
    complexity: str = "balanced"
    constraints: Optional[str] = None

class BlueprintComponent(BaseModel):
    id: str
    name: str
    type: str
    label: str
    position: Dict[str, float] = {"x": 0, "y": 0}
    parameters: List[Dict[str, Any]] = []
    equations: List[str] = []

class BlueprintFlow(BaseModel):
    id: str
    source: str  # 'from' is reserved, using source
    target: str  # 'to' renamed for clarity
    type: str
    label: Optional[str] = None

class Blueprint(BaseModel):
    project_name: str
    components: List[Dict[str, Any]]
    flows: List[Dict[str, Any]]

class ArchitectVariant(BaseModel):
    name: str
    description: str
    pros: List[str]
    cons: List[str]
    blueprint: Dict[str, Any]

class ArchitectResponse(BaseModel):
    success: bool
    variants: List[ArchitectVariant] = []
    domain_detected: str = ""
    follow_up_questions: List[str] = []
    error: Optional[str] = None

# --- LLM Integration ---

def get_llm_client():
    """Get available LLM client (Groq or OpenRouter)."""
    # Check standard and VITE_ prefixed keys
    groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("VITE_GROQ_API_KEY")
    openrouter_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("VITE_OPENROUTER_API_KEY")
    
    if groq_key:
        try:
            from groq import Groq
            return Groq(api_key=groq_key), "groq"
        except ImportError:
            pass
    
    if openrouter_key:
        try:
            import requests
            return openrouter_key, "openrouter"
        except ImportError:
            pass
    
    return None, None

def call_llm(system_prompt: str, user_prompt: str) -> str:
    """Call LLM and return response text."""
    client, provider = get_llm_client()
    
    if not client:
        raise HTTPException(status_code=503, detail="No LLM API key configured")
    
    if provider == "groq":
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=8000
        )
        return response.choices[0].message.content
    
    elif provider == "openrouter":
        import requests
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {client}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/llama-3.1-70b-instruct",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 8000
            }
        )
        return response.json()["choices"][0]["message"]["content"]
    
    raise HTTPException(status_code=503, detail="LLM provider error")

def extract_json_from_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Try to find JSON in code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if json_match:
        text = json_match.group(1)
    
    # Try to parse directly
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise

def auto_layout_components(components: List[Dict]) -> List[Dict]:
    """Automatically position components in a logical grid layout."""
    if not components:
        return components
    
    # Simple grid layout
    cols = 3
    spacing_x = 300
    spacing_y = 200
    start_x = 100
    start_y = 100
    
    for i, comp in enumerate(components):
        if "position" not in comp or comp["position"] == {"x": 0, "y": 0}:
            row = i // cols
            col = i % cols
            comp["position"] = {
                "x": start_x + col * spacing_x,
                "y": start_y + row * spacing_y
            }
    
    return components

def validate_blueprint(blueprint: Dict) -> List[str]:
    """Validate blueprint structure and return list of issues."""
    issues = []
    
    if "components" not in blueprint:
        issues.append("Missing 'components' array")
        return issues
    
    if "flows" not in blueprint:
        issues.append("Missing 'flows' array")
        return issues
    
    component_ids = {c.get("id") for c in blueprint["components"]}
    
    for flow in blueprint.get("flows", []):
        # Handle both 'from'/'to' and 'source'/'target' naming
        source = flow.get("from") or flow.get("source")
        target = flow.get("to") or flow.get("target")
        
        if source and source not in component_ids:
            issues.append(f"Flow '{flow.get('id')}' references unknown source: {source}")
        if target and target not in component_ids:
            issues.append(f"Flow '{flow.get('id')}' references unknown target: {target}")
    
    return issues

# --- Endpoints ---

@router.post("/generate", response_model=ArchitectResponse)
async def generate_architecture(req: ArchitectRequest):
    """
    Generate complete SAF blueprints from natural language description.
    Returns 3 architecture variants with different trade-offs.
    """
    try:
        # Build prompts
        system_prompt = """You are Genesis, an elite AI system architect specialized in engineering design, powered by the Living Mathematics Engine.

Your task is to translate natural language descriptions into complete, physics-accurate SAF (System Architecture Framework) blueprints with MOLECULAR FLUID support.

IMPORTANT RULES:
1. Each component MUST have a unique ID (e.g., 'pump_1', 'heat_exchanger_1')
2. Each flow MUST connect valid component IDs using 'from' and 'to' fields
3. Include realistic parameter values with units
4. Add governing equations where applicable (sympy-compatible syntax)
5. Consider energy balance, mass balance, and thermodynamic constraints
6. Position components logically (you can use x: 0, y: 0 and they will be auto-arranged)
7. Component types should be: 'core', 'subcore', or 'micro'
8. Flow types should be: 'energy', 'material', 'fluid', 'data', 'control', or 'signal'

LIVING MATHEMATICS ENGINE FEATURES:
- Fluids are defined by MOLECULAR COMPOSITION, not property tables
- Each fluid stream has: species, mole_fractions, phase
- Multi-stream components track separate fluid circuits
- Incompatible fluid connections are flagged
- Phase changes are tracked automatically

MOLECULAR FLUID EXAMPLES:
- Pure water: {"species": ["H2O"], "mole_fractions": [1.0]}
- 50% Glycol coolant: {"species": ["H2O", "C2H6O2"], "mole_fractions": [0.5, 0.5]}
- E10 Gasoline: {"species": ["C8H18", "C2H5OH"], "mole_fractions": [0.9, 0.1]}

You MUST respond with valid JSON containing exactly 3 architecture variants."""

        domain_hint = f"Domain: {req.domain}" if req.domain != "auto_detect" else "Auto-detect the engineering domain"
        
        user_prompt = f"""Design a system based on this description:

{req.system_description}

{domain_hint}
Complexity Level: {req.complexity}
{f"Additional Constraints: {req.constraints}" if req.constraints else ""}

Generate 3 architecture variants:
1. COMPACT: Minimal components, lower cost, simpler maintenance
2. BALANCED: Optimal efficiency/cost ratio, industry-standard approach  
3. PREMIUM: Maximum efficiency, advanced features, higher complexity

For each component, include:
- id: unique identifier (snake_case)
- name: display name
- type: 'core' | 'subcore' | 'micro'
- label: short label for graph display
- parameters: array of {{ name, value, unit, description }}
- equations: array of physics equations (if applicable)
- fluid_streams: (for fluid components) array of {{ stream_id, fluid_type, inlet/outlet }}

For fluid-handling components, specify:
- fluid_definition: {{ species: [...], mole_fractions: [...], phase: 'liquid'|'gas'|'two_phase' }}
- operating_conditions: {{ temperature_C, pressure_kPa, flow_rate_kg_s }}

For each flow, include:
- id: unique identifier
- from: source component id
- to: target component id
- type: 'energy' | 'material' | 'fluid' | 'data' | 'control' | 'signal'
- label: optional description
- fluid_stream_id: (for fluid flows) which stream this belongs to

Respond ONLY with valid JSON:
{{
  "variants": [
    {{
      "name": "Compact",
      "description": "Trade-off summary",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1"],
      "blueprint": {{
        "project_name": "System Name",
        "components": [...],
        "flows": [...],
        "fluid_definitions": [
          {{ "id": "coolant_1", "species": ["H2O"], "mole_fractions": [1.0], "phase": "liquid" }}
        ]
      }}
    }},
    // ... 2 more variants
  ],
  "domain_detected": "power_systems",
  "follow_up_questions": ["Question 1?", "Question 2?"]
}}"""

        # Call LLM
        raw_response = call_llm(system_prompt, user_prompt)
        
        # Parse response
        try:
            data = extract_json_from_response(raw_response)
        except (json.JSONDecodeError, ValueError) as e:
            return ArchitectResponse(
                success=False,
                error=f"Failed to parse LLM response: {str(e)}. Raw: {raw_response[:500]}..."
            )
        
        # Process variants
        variants = []
        for v in data.get("variants", []):
            blueprint = v.get("blueprint", {})
            
            # Validate
            issues = validate_blueprint(blueprint)
            if issues:
                print(f"Blueprint validation issues for {v.get('name')}: {issues}")
            
            # Auto-layout components
            if "components" in blueprint:
                blueprint["components"] = auto_layout_components(blueprint["components"])
            
            variants.append(ArchitectVariant(
                name=v.get("name", "Unknown"),
                description=v.get("description", ""),
                pros=v.get("pros", []),
                cons=v.get("cons", []),
                blueprint=blueprint
            ))
        
        return ArchitectResponse(
            success=True,
            variants=variants,
            domain_detected=data.get("domain_detected", "unknown"),
            follow_up_questions=data.get("follow_up_questions", [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Genesis Architect Error: {traceback.format_exc()}")
        return ArchitectResponse(
            success=False,
            error=str(e)
        )


@router.get("/templates")
async def get_templates():
    """Return predefined system templates for quick start."""
    return {
        "templates": [
            {
                "id": "solar_home",
                "name": "Home Solar Power System",
                "description": "Residential solar with battery storage",
                "domain": "power_systems",
                "preview_description": "5kW solar array with lithium battery bank and grid tie inverter"
            },
            {
                "id": "hvac_commercial",
                "name": "Commercial HVAC System",
                "description": "Multi-zone heating and cooling",
                "domain": "thermal_systems",
                "preview_description": "Centralized chiller with variable air volume distribution"
            },
            {
                "id": "water_treatment",
                "name": "Water Treatment Plant",
                "description": "Municipal water purification",
                "domain": "fluid_systems",
                "preview_description": "Multi-stage filtration with UV sterilization"
            },
            {
                "id": "conveyor_system",
                "name": "Industrial Conveyor System",
                "description": "Automated material handling",
                "domain": "electromechanical",
                "preview_description": "Belt conveyor with PLC control and sensors"
            },
            {
                "id": "rankine_cycle",
                "name": "Rankine Cycle Power Plant",
                "description": "Steam turbine power generation",
                "domain": "thermal_systems",
                "preview_description": "Boiler, turbine, condenser, pump cycle"
            }
        ]
    }
