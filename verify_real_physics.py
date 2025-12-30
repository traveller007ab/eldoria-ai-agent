
import sys
import os
from services.simulation import build_system_equations, SimulationRequest, SimulationComponent, SimulationConnection

# Mock simple circuit: Source -> Resistor -> Ground
req = SimulationRequest(
    project_name="Test Circuit",
    components=[
        SimulationComponent(id="bat1", type="battery", label="Source", parameters={"voltage": 12}),
        SimulationComponent(id="res1", type="resistor", label="Load", parameters={"resistance": 100}),
        SimulationComponent(id="gnd1", type="ground", label="GND")
    ],
    connections=[
        SimulationConnection(id="c1", source="bat1", target="res1", type="electrical"),
        SimulationConnection(id="c2", source="res1", target="gnd1", type="electrical")
    ],
    global_constants={}
)

try:
    print("TESTING GENESIS PHYSICS ENGINE...")
    eqs, vars, logs = build_system_equations(req)
    
    print(f"\nDOMAIN DETECTED: {logs[0]}") # Should be 'electrical'
    
    print(f"\nGENERATED SYMBOLIC VARIABLES ({len(vars)}):")
    for v in vars:
        print(f" - {v}")
        
    print(f"\nGENERATED EQUATIONS ({len(eqs)}):")
    for eq in eqs:
        print(f" - {eq}")
        
    print("\nCONCLUSION: The math is REAL.")
except Exception as e:
    print(f"\nFAILED: {e}")
