"""
Physics Simulation Test Blueprints for Phase 3
Comprehensive test cases from simple to complex
"""

from typing import Dict, List, Any

# ============================================================================
# TEST 1: BASIC HYDRAULICS (Pump → Pipe → Tank)
# ============================================================================

BASIC_HYDRAULICS_BLUEPRINT = {
    "project_name": "Test 1: Basic Hydraulics",
    "description": "Simple water pump feeding into a tank through a pipe",
    "expected_physics": {
        "mass_balance": "inflow = outflow",
        "pressure_drop": "Bernoulli equation",
        "temperature": "constant (no heat transfer)",
    },
    "components": [
        {
            "id": "pump_1",
            "type": "source",
            "label": "Water Pump",
            "parameters": {
                "pressure": 200,  # bar
                "pressure_unit": "bar",
                "temperature": 300,  # K
                "temperature_unit": "K",
                "flow_rate": 10,  # kg/s
                "flow_rate_unit": "kg/s",
            },
        },
        {
            "id": "pipe_1",
            "type": "pipe",
            "label": "Distribution Pipe",
            "parameters": {
                "diameter": 0.1,  # m
                "length": 50,  # m
                "roughness": 0.0001,
            },
        },
        {
            "id": "tank_1",
            "type": "sink",
            "label": "Storage Tank",
            "parameters": {
                "capacity": 1000,  # kg
                "initial_level": 0,
            },
        },
    ],
    "connections": [
        {"id": "f1", "source": "pump_1", "target": "pipe_1", "type": "fluid"},
        {"id": "f2", "source": "pipe_1", "target": "tank_1", "type": "fluid"},
    ],
    "global_constants": {
        "gravity": 9.81,
        "water_density": 1000,  # kg/m³
        "atmospheric_pressure": 1.013,  # bar
    },
    "validation": {
        "mass_flow_in": 10,  # kg/s (from pump)
        "mass_flow_out": 10,  # kg/s (should equal inflow)
        "pressure_drop_expected": 5,  # bar (approximate for 50m pipe)
        "temperature_constant": True,
    },
}

# ============================================================================
# TEST 2: THERMAL SYSTEM (Heat Exchanger)
# ============================================================================

THERMAL_SYSTEM_BLUEPRINT = {
    "project_name": "Test 2: Thermal System",
    "description": "Hot water source feeding a heat exchanger",
    "expected_physics": {
        "energy_balance": "Q = m_dot * cp * delta_T",
        "heat_transfer": "convection and conduction",
        "temperature_change": "significant",
    },
    "components": [
        {
            "id": "boiler_1",
            "type": "source",
            "label": "Hot Water Boiler",
            "parameters": {
                "pressure": 150,
                "pressure_unit": "bar",
                "temperature": 600,  # K
                "temperature_unit": "K",
                "flow_rate": 5,
                "flow_rate_unit": "kg/s",
            },
        },
        {
            "id": "heater_1",
            "type": "heater",
            "label": "Heat Exchanger",
            "parameters": {
                "target_temp": 450,  # K
                "efficiency": 0.85,
            },
        },
        {
            "id": "pipe_1",
            "type": "pipe",
            "label": "Hot Water Line",
            "parameters": {"diameter": 0.08, "length": 30, "insulated": True},
        },
        {"id": "sink_1", "type": "sink", "label": "Process Sink", "parameters": {}},
    ],
    "connections": [
        {"id": "f1", "source": "boiler_1", "target": "heater_1", "type": "fluid"},
        {"id": "f2", "source": "heater_1", "target": "pipe_1", "type": "fluid"},
        {"id": "f3", "source": "pipe_1", "target": "sink_1", "type": "fluid"},
    ],
    "global_constants": {
        "gravity": 9.81,
        "water_density": 1000,
        "specific_heat": 4186,  # J/(kg·K)
        "ambient_temp": 300,  # K
    },
    "validation": {
        "initial_temp": 600,  # K
        "final_temp": 450,  # K (after heat exchanger)
        "energy_extracted": 3139500,  # W (5 kg/s * 4186 J/kg·K * 150 K)
        "mass_flow_conserved": True,
    },
}

# ============================================================================
# TEST 3: COMPLEX NETWORK (Multiple Pumps and Junctions)
# ============================================================================

COMPLEX_NETWORK_BLUEPRINT = {
    "project_name": "Test 3: Complex Network",
    "description": "Multiple pumps with junctions and parallel paths",
    "expected_physics": {
        "parallel_flows": "pressure equalization",
        "junction_balance": "Kirchhoff's laws",
        "system_curve": "combined pump characteristics",
    },
    "components": [
        {
            "id": "pump_main",
            "type": "source",
            "label": "Main Supply Pump",
            "parameters": {
                "pressure": 250,
                "pressure_unit": "bar",
                "temperature": 350,
                "temperature_unit": "K",
                "flow_rate": 20,
                "flow_rate_unit": "kg/s",
            },
        },
        {
            "id": "junction_1",
            "type": "pipe",  # Using pipe as junction
            "label": "Distribution Junction",
            "parameters": {},
        },
        {
            "id": "pipe_a",
            "type": "pipe",
            "label": "Branch A (Long)",
            "parameters": {"diameter": 0.05, "length": 100, "roughness": 0.0002},
        },
        {
            "id": "pipe_b",
            "type": "pipe",
            "label": "Branch B (Short)",
            "parameters": {"diameter": 0.05, "length": 30, "roughness": 0.0002},
        },
        {"id": "sink_a", "type": "sink", "label": "Process A", "parameters": {}},
        {"id": "sink_b", "type": "sink", "label": "Process B", "parameters": {}},
    ],
    "connections": [
        {"id": "f1", "source": "pump_main", "target": "junction_1", "type": "fluid"},
        {"id": "f2", "source": "junction_1", "target": "pipe_a", "type": "fluid"},
        {"id": "f3", "source": "junction_1", "target": "pipe_b", "type": "fluid"},
        {"id": "f4", "source": "pipe_a", "target": "sink_a", "type": "fluid"},
        {"id": "f5", "source": "pipe_b", "target": "sink_b", "type": "fluid"},
    ],
    "global_constants": {
        "gravity": 9.81,
        "water_density": 1000,
        "viscosity": 0.001,  # Pa·s
    },
    "validation": {
        "total_inflow": 20,  # kg/s
        "branch_a_flow": 6,  # kg/s (higher resistance = less flow)
        "branch_b_flow": 14,  # kg/s (lower resistance = more flow)
        "junction_pressure_equal": True,
        "mass_balance": "inflow = outflow_a + outflow_b",
    },
}

# ============================================================================
# TEST 4: POWER CYCLE (Rankine Cycle Simulation)
# ============================================================================

POWER_CYCLE_BLUEPRINT = {
    "project_name": "Test 4: Rankine Power Cycle",
    "description": "Complete thermodynamic power generation cycle",
    "expected_physics": {
        "cycle_efficiency": "thermal efficiency calculation",
        "phase_changes": "boiling and condensation",
        "work_extraction": "turbine power output",
    },
    "components": [
        {
            "id": "pump",
            "type": "source",
            "label": "Feedwater Pump",
            "parameters": {
                "pressure": 150,
                "pressure_unit": "bar",
                "temperature": 350,
                "temperature_unit": "K",
                "flow_rate": 50,
                "flow_rate_unit": "kg/s",
            },
        },
        {
            "id": "boiler",
            "type": "heater",
            "label": "Steam Generator",
            "parameters": {
                "target_temp": 800,  # K
                "heat_input": 100e6,  # W
            },
        },
        {
            "id": "turbine",
            "type": "pipe",  # Using pipe with expansion
            "label": "Steam Turbine",
            "parameters": {
                "expansion_ratio": 50,  # Pressure ratio
                "isentropic_efficiency": 0.88,
            },
        },
        {
            "id": "condenser",
            "type": "sink",
            "label": "Condenser",
            "parameters": {
                "pressure": 0.1,  # bar
                "temperature": 320,  # K
            },
        },
    ],
    "connections": [
        {"id": "f1", "source": "pump", "target": "boiler", "type": "fluid"},
        {"id": "f2", "source": "boiler", "target": "turbine", "type": "fluid"},
        {"id": "f3", "source": "turbine", "target": "condenser", "type": "fluid"},
    ],
    "global_constants": {
        "gravity": 9.81,
        "water_density": 1000,
        "steam_enthalpy_in": 3390,  # kJ/kg (at 150 bar, 800 K)
        "steam_enthalpy_out": 2150,  # kJ/kg (at 0.1 bar)
        "pump_work": 15,  # kJ/kg
    },
    "validation": {
        "cycle_efficiency_expected": 0.35,  # 35% typical for Rankine
        "turbine_power": 62e6,  # W (50 kg/s * 1240 kJ/kg)
        "heat_added": 100e6,  # W
        "net_work": 61.25e6,  # W (turbine - pump)
        "thermal_efficiency": 0.6125,
    },
}

# ============================================================================
# TEST 5: ELECTRICAL CIRCUIT (Ohm's Law Validation)
# ============================================================================

ELECTRICAL_CIRCUIT_BLUEPRINT = {
    "project_name": "Test 5: Electrical Circuit",
    "description": "Simple DC circuit for Ohm's law validation",
    "expected_physics": {
        "ohms_law": "V = I * R",
        "series_resistance": "R_total = R1 + R2",
        "power": "P = V * I",
    },
    "components": [
        {
            "id": "battery",
            "type": "source",
            "label": "12V Battery",
            "parameters": {
                "voltage": 12,  # V
                "internal_resistance": 0.1,  # ohm
            },
        },
        {
            "id": "resistor_1",
            "type": "resistor",
            "label": "Load Resistor",
            "parameters": {
                "resistance": 100  # ohms
            },
        },
        {"id": "ground", "type": "sink", "label": "Ground", "parameters": {}},
    ],
    "connections": [
        {"id": "w1", "source": "battery", "target": "resistor_1", "type": "electrical"},
        {"id": "w2", "source": "resistor_1", "target": "ground", "type": "electrical"},
    ],
    "global_constants": {
        "temperature": 300,  # K
        "wire_resistance": 0.01,  # ohms
    },
    "validation": {
        "current_expected": 0.1188,  # A (12V / 101.1 ohms)
        "voltage_drop": 11.88,  # V across resistor
        "power_dissipated": 1.41,  # W
        "ohms_law_verified": True,
    },
}

# ============================================================================
# BENCHMARK CONFIGURATION
# ============================================================================

BENCHMARK_CONFIG = {
    "solver_tolerance": 1e-6,
    "max_iterations": 100,
    "timeout_seconds": 30,
    "performance_thresholds": {
        "simple": {"max_time": 2.0, "max_memory": 50},  # MB
        "intermediate": {"max_time": 5.0, "max_memory": 100},
        "complex": {"max_time": 10.0, "max_memory": 200},
    },
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def get_all_test_blueprints() -> List[Dict[str, Any]]:
    """Return all test blueprints"""
    return [
        BASIC_HYDRAULICS_BLUEPRINT,
        THERMAL_SYSTEM_BLUEPRINT,
        COMPLEX_NETWORK_BLUEPRINT,
        POWER_CYCLE_BLUEPRINT,
        ELECTRICAL_CIRCUIT_BLUEPRINT,
    ]


def get_test_blueprint(name: str) -> Dict[str, Any]:
    """Get a specific test blueprint by name"""
    blueprints = {
        "basic_hydraulics": BASIC_HYDRAULICS_BLUEPRINT,
        "thermal_system": THERMAL_SYSTEM_BLUEPRINT,
        "complex_network": COMPLEX_NETWORK_BLUEPRINT,
        "power_cycle": POWER_CYCLE_BLUEPRINT,
        "electrical_circuit": ELECTRICAL_CIRCUIT_BLUEPRINT,
    }
    return blueprints.get(name.lower().replace(" ", "_"))


def validate_blueprint_structure(blueprint: Dict) -> tuple[bool, List[str]]:
    """Validate blueprint has required fields"""
    errors = []

    required_fields = ["project_name", "components", "connections"]
    for field in required_fields:
        if field not in blueprint:
            errors.append(f"Missing required field: {field}")

    if "components" in blueprint:
        for i, comp in enumerate(blueprint["components"]):
            if "id" not in comp:
                errors.append(f"Component {i} missing 'id'")
            if "type" not in comp:
                errors.append(f"Component {i} missing 'type'")

    if "connections" in blueprint:
        for i, conn in enumerate(blueprint["connections"]):
            required = ["id", "source", "target"]
            for field in required:
                if field not in conn:
                    errors.append(f"Connection {i} missing '{field}'")

    return len(errors) == 0, errors


# Export for use in other modules
__all__ = [
    "BASIC_HYDRAULICS_BLUEPRINT",
    "THERMAL_SYSTEM_BLUEPRINT",
    "COMPLEX_NETWORK_BLUEPRINT",
    "POWER_CYCLE_BLUEPRINT",
    "ELECTRICAL_CIRCUIT_BLUEPRINT",
    "BENCHMARK_CONFIG",
    "get_all_test_blueprints",
    "get_test_blueprint",
    "validate_blueprint_structure",
]
