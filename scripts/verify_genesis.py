
import sys
import os
import json
import asyncio

# Ensure path includes project root
sys.path.append(os.getcwd())

try:
    from services.simulation import build_system_equations, SimulationRequest, SimulationComponent, SimulationConnection
    import sympy
    print("[PASS] Imports successful")
    print(f"[INFO] SymPy Version: {sympy.__version__}")
except ImportError as e:
    print(f"[FAIL] Import failed: {e}")
    sys.exit(1)

def test_electrical_circuit():
    print("\n--- Testing Electrical Domain (Symbolic) ---")
    
    # Simple Circuit: Source (12V) -> Resistor (4 Ohm) -> Ground
    # Current should be 3A
    
    req = SimulationRequest(
        project_name="Simple Circuit",
        components=[
            SimulationComponent(id="src", type="electrical.battery", label="Battery", parameters={"voltage": 12}),
            SimulationComponent(id="res", type="electrical.resistor", label="Resistor", parameters={"resistance": 4}),
            SimulationComponent(id="gnd", type="electrical.ground", label="Ground")
        ],
        connections=[
            SimulationConnection(id="c1", source="src", target="res", type="electrical"),
            SimulationConnection(id="c2", source="res", target="gnd", type="electrical")
        ]
    )
    
    # Returns: equations, variable_groups (list of dicts), logs
    equations, variable_groups, logs = build_system_equations(req)
    
    print(f"[INFO] Generated {len(equations)} equations")
    for eq in equations:
        print(f"  {eq}")
        
    # Solve
    print("[INFO] Solving system...")
    try:
        # Flatten variables from groups
        variables = []
        for group in variable_groups:
            variables.extend(group.values())
            
        print(f"[INFO] Unknowns: {[str(v) for v in variables]}")
        
        # Using nsolve for numerical or solve for symbolic
        # For this linear system, solve is fine
        solution = sympy.solve(equations, variables, dict=True)
        
        if solution:
            print("[PASS] Solution found!")
            # Extract Current (I) for c1 or c2
            # c1_I and c2_I should be equal
            
            # Map back to readable names
            sol_dict = {str(k): float(v) for k, v in solution[0].items()}
            print(json.dumps(sol_dict, indent=2))
            
            c1_I = sol_dict.get("c1_I")
            if c1_I and abs(c1_I - 3.0) < 0.01:
                print(f"[SUCCESS] Current is {c1_I}A (Expected 3.0A)")
            else:
                print(f"[WARN] Current {c1_I}A matches expectation? {c1_I == 3.0}")
        else:
            print("[FAIL] No solution found")
            
    except Exception as e:
        print(f"[FAIL] Solver error: {e}")

if __name__ == "__main__":
    test_electrical_circuit()
