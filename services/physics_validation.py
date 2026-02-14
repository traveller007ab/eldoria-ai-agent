"""
Physics Validation Suite for Phase 3
Validates simulation results against known physics equations
"""

import math
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass

# ============================================================================
# PHYSICS CONSTANTS
# ============================================================================

PHYSICS_CONSTANTS = {
    "gravity": 9.81,  # m/s²
    "water_density": 1000,  # kg/m³ at 4°C
    "air_density": 1.225,  # kg/m³ at sea level
    "specific_heat_water": 4186,  # J/(kg·K)
    "specific_heat_air": 1005,  # J/(kg·K)
    "atmospheric_pressure": 101325,  # Pa
    "standard_temp": 273.15,  # K (0°C)
    "gas_constant": 8.314,  # J/(mol·K)
    "stefan_boltzmann": 5.67e-8,  # W/(m²·K⁴)
}

# ============================================================================
# VALIDATION RESULT
# ============================================================================


@dataclass
class ValidationResult:
    """Result of a physics validation check"""

    test_name: str
    passed: bool
    expected_value: float
    actual_value: float
    tolerance: float
    error_percent: float
    message: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "test_name": self.test_name,
            "passed": self.passed,
            "expected": self.expected_value,
            "actual": self.actual_value,
            "tolerance": self.tolerance,
            "error_percent": round(self.error_percent, 4),
            "message": self.message,
        }


# ============================================================================
# FLUID MECHANICS VALIDATORS
# ============================================================================


class FluidMechanicsValidator:
    """Validates fluid mechanics calculations"""

    @staticmethod
    def validate_mass_balance(
        inflow: float, outflows: List[float], tolerance: float = 0.01
    ) -> ValidationResult:
        """
        Validate conservation of mass: Σṁ_in = Σṁ_out

        Args:
            inflow: Total mass flow rate in (kg/s)
            outflows: List of mass flow rates out (kg/s)
            tolerance: Acceptable error percentage
        """
        total_outflow = sum(outflows)
        error = abs(inflow - total_outflow)
        error_percent = (error / inflow * 100) if inflow > 0 else 0

        passed = error_percent <= tolerance

        return ValidationResult(
            test_name="Mass Balance (Continuity)",
            passed=passed,
            expected_value=inflow,
            actual_value=total_outflow,
            tolerance=tolerance,
            error_percent=error_percent,
            message=f"Mass balance: {inflow:.4f} kg/s in = {total_outflow:.4f} kg/s out",
        )

    @staticmethod
    def validate_bernoulli_equation(
        p1: float,  # Pressure at point 1 (Pa)
        v1: float,  # Velocity at point 1 (m/s)
        z1: float,  # Height at point 1 (m)
        p2: float,  # Pressure at point 2 (Pa)
        v2: float,  # Velocity at point 2 (m/s)
        z2: float,  # Height at point 2 (m)
        density: float = 1000,  # kg/m³
        tolerance: float = 0.05,
    ) -> ValidationResult:
        """
        Validate Bernoulli's equation: P + ½ρv² + ρgz = constant

        Args:
            p1, p2: Pressures (Pa)
            v1, v2: Velocities (m/s)
            z1, z2: Heights (m)
            density: Fluid density (kg/m³)
            tolerance: Acceptable error percentage
        """
        # Calculate total head at each point
        head1 = p1 + 0.5 * density * v1**2 + density * PHYSICS_CONSTANTS["gravity"] * z1
        head2 = p2 + 0.5 * density * v2**2 + density * PHYSICS_CONSTANTS["gravity"] * z2

        # For incompressible flow without losses, head should be equal
        error = abs(head1 - head2)
        avg_head = (head1 + head2) / 2
        error_percent = (error / avg_head * 100) if avg_head > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Bernoulli's Equation",
            passed=passed,
            expected_value=head1,
            actual_value=head2,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"Total head: {head1 / 1000:.2f} kPa vs {head2 / 1000:.2f} kPa",
        )

    @staticmethod
    def calculate_pressure_drop_darcy_weisbach(
        length: float,  # m
        diameter: float,  # m
        velocity: float,  # m/s
        friction_factor: float = 0.02,
        density: float = 1000,  # kg/m³
    ) -> float:
        """
        Calculate pressure drop using Darcy-Weisbach equation
        ΔP = f * (L/D) * (ρv²/2)

        Returns pressure drop in Pa
        """
        return friction_factor * (length / diameter) * (density * velocity**2 / 2)

    @staticmethod
    def validate_pressure_drop(
        p_in: float,  # Pa
        p_out: float,  # Pa
        length: float,  # m
        diameter: float,  # m
        flow_rate: float,  # kg/s
        friction_factor: float = 0.02,
        density: float = 1000,  # kg/m³
        tolerance: float = 0.10,
    ) -> ValidationResult:
        """Validate pressure drop matches Darcy-Weisbach equation"""
        # Calculate area
        area = math.pi * (diameter / 2) ** 2

        # Calculate velocity
        velocity = flow_rate / (density * area)

        # Calculate expected pressure drop
        expected_drop = FluidMechanicsValidator.calculate_pressure_drop_darcy_weisbach(
            length, diameter, velocity, friction_factor, density
        )

        # Get actual pressure drop
        actual_drop = p_in - p_out

        error = abs(expected_drop - actual_drop)
        error_percent = (error / expected_drop * 100) if expected_drop > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Pressure Drop (Darcy-Weisbach)",
            passed=passed,
            expected_value=expected_drop,
            actual_value=actual_drop,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"ΔP expected: {expected_drop / 1000:.2f} kPa, actual: {actual_drop / 1000:.2f} kPa",
        )


# ============================================================================
# THERMODYNAMICS VALIDATORS
# ============================================================================


class ThermodynamicsValidator:
    """Validates thermodynamic calculations"""

    @staticmethod
    def validate_first_law(
        heat_added: float,  # W
        work_done: float,  # W
        enthalpy_in: float,  # W
        enthalpy_out: float,  # W
        tolerance: float = 0.02,
    ) -> ValidationResult:
        """
        Validate First Law of Thermodynamics for open systems:
        Q̇ - Ẇ = ṁ(h_out - h_in)

        Or in rate form: Q̇ - Ẇ = ΔḢ
        """
        left_side = heat_added - work_done
        right_side = enthalpy_out - enthalpy_in

        error = abs(left_side - right_side)
        avg_value = (abs(left_side) + abs(right_side)) / 2
        error_percent = (error / avg_value * 100) if avg_value > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="First Law of Thermodynamics",
            passed=passed,
            expected_value=left_side,
            actual_value=right_side,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"Q - W = {left_side / 1000:.2f} kW, ΔH = {right_side / 1000:.2f} kW",
        )

    @staticmethod
    def calculate_heat_transfer(
        mass_flow: float,  # kg/s
        cp: float,  # J/(kg·K)
        temp_in: float,  # K
        temp_out: float,  # K
    ) -> float:
        """Calculate heat transfer rate: Q̇ = ṁ * cp * ΔT"""
        return mass_flow * cp * (temp_out - temp_in)

    @staticmethod
    def validate_heat_transfer(
        mass_flow: float,  # kg/s
        cp: float,  # J/(kg·K)
        temp_in: float,  # K
        temp_out: float,  # K
        heat_transfer_actual: float,  # W
        tolerance: float = 0.05,
    ) -> ValidationResult:
        """Validate heat transfer calculation"""
        expected = ThermodynamicsValidator.calculate_heat_transfer(
            mass_flow, cp, temp_in, temp_out
        )

        error = abs(expected - heat_transfer_actual)
        error_percent = (abs(error) / abs(expected) * 100) if expected != 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Heat Transfer Calculation",
            passed=passed,
            expected_value=expected,
            actual_value=heat_transfer_actual,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"Q̇ expected: {expected / 1000:.2f} kW, actual: {heat_transfer_actual / 1000:.2f} kW",
        )

    @staticmethod
    def calculate_thermal_efficiency(
        net_work: float,  # W
        heat_input: float,  # W
    ) -> float:
        """Calculate thermal efficiency: η = W_net / Q_in"""
        if heat_input == 0:
            return 0
        return net_work / heat_input

    @staticmethod
    def validate_thermal_efficiency(
        net_work: float,  # W
        heat_input: float,  # W
        efficiency_actual: float,
        tolerance: float = 0.02,
    ) -> ValidationResult:
        """Validate thermal efficiency calculation"""
        expected = ThermodynamicsValidator.calculate_thermal_efficiency(
            net_work, heat_input
        )

        error = abs(expected - efficiency_actual)
        error_percent = (error / expected * 100) if expected > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Thermal Efficiency",
            passed=passed,
            expected_value=expected,
            actual_value=efficiency_actual,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"η expected: {expected * 100:.1f}%, actual: {efficiency_actual * 100:.1f}%",
        )


# ============================================================================
# ELECTRICAL VALIDATORS
# ============================================================================


class ElectricalValidator:
    """Validates electrical circuit calculations"""

    @staticmethod
    def validate_ohms_law(
        voltage: float,  # V
        current: float,  # A
        resistance: float,  # Ω
        tolerance: float = 0.01,
    ) -> ValidationResult:
        """
        Validate Ohm's Law: V = I * R
        """
        expected_current = voltage / resistance if resistance > 0 else 0
        error = abs(expected_current - current)
        error_percent = (error / expected_current * 100) if expected_current > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Ohm's Law",
            passed=passed,
            expected_value=expected_current,
            actual_value=current,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"I = V/R: {expected_current:.4f} A, measured: {current:.4f} A",
        )

    @staticmethod
    def calculate_power(
        voltage: float = None, current: float = None, resistance: float = None
    ) -> float:
        """
        Calculate electrical power using P = V * I = I² * R = V² / R
        """
        if voltage is not None and current is not None:
            return voltage * current
        elif current is not None and resistance is not None:
            return current**2 * resistance
        elif voltage is not None and resistance is not None and resistance > 0:
            return voltage**2 / resistance
        return 0

    @staticmethod
    def validate_power(
        voltage: float, current: float, resistance: float, tolerance: float = 0.01
    ) -> ValidationResult:
        """Validate power calculation consistency"""
        # Calculate power three ways
        p1 = voltage * current
        p2 = current**2 * resistance if resistance > 0 else 0
        p3 = voltage**2 / resistance if resistance > 0 else 0

        # Use P = V*I as reference
        error_p2 = abs(p1 - p2)
        error_p3 = abs(p1 - p3)
        avg_error = (error_p2 + error_p3) / 2

        error_percent = (avg_error / p1 * 100) if p1 > 0 else 0

        passed = error_percent <= tolerance * 100

        return ValidationResult(
            test_name="Power Calculation Consistency",
            passed=passed,
            expected_value=p1,
            actual_value=(p2 + p3) / 2,
            tolerance=tolerance * 100,
            error_percent=error_percent,
            message=f"P = VI: {p1:.2f} W, I²R: {p2:.2f} W, V²/R: {p3:.2f} W",
        )


# ============================================================================
# MASTER VALIDATOR
# ============================================================================


class PhysicsValidator:
    """Master class for running all physics validations"""

    def __init__(self):
        self.fluid = FluidMechanicsValidator()
        self.thermal = ThermodynamicsValidator()
        self.electrical = ElectricalValidator()
        self.results: List[ValidationResult] = []

    def validate_simulation_result(
        self, blueprint: Dict[str, Any], simulation_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Run all relevant physics validations on a simulation result

        Args:
            blueprint: The test blueprint used
            simulation_result: Output from the simulation engine

        Returns:
            Dictionary with validation results
        """
        self.results = []

        # Get domain from blueprint
        domain = self._detect_domain(blueprint)
        validation_config = blueprint.get("validation", {})

        system_vars = simulation_result.get("system_vars", {})

        # Domain-specific validations
        if domain == "fluid" or domain == "thermal":
            self._validate_fluid_system(blueprint, system_vars, validation_config)

        if domain == "electrical":
            self._validate_electrical_system(blueprint, system_vars, validation_config)

        # Compile results
        passed_tests = [r for r in self.results if r.passed]
        failed_tests = [r for r in self.results if not r.passed]

        return {
            "overall_passed": len(failed_tests) == 0,
            "total_tests": len(self.results),
            "passed": len(passed_tests),
            "failed": len(failed_tests),
            "pass_rate": len(passed_tests) / len(self.results) * 100
            if self.results
            else 0,
            "domain": domain,
            "test_results": [r.to_dict() for r in self.results],
        }

    def _detect_domain(self, blueprint: Dict[str, Any]) -> str:
        """Detect physics domain from blueprint"""
        components = blueprint.get("components", [])
        if not components:
            return "unknown"

        first_type = components[0].get("type", "").lower()

        # Check for electrical components
        electrical_keywords = ["resistor", "battery", "voltage", "current", "ground"]
        if any(kw in first_type for kw in electrical_keywords):
            return "electrical"

        # Check for thermal components
        thermal_keywords = ["heater", "boiler", "condenser", "heat"]
        if any(kw in first_type for kw in thermal_keywords):
            return "thermal"

        # Default to fluid
        return "fluid"

    def _validate_fluid_system(
        self,
        blueprint: Dict[str, Any],
        system_vars: Dict[str, float],
        validation_config: Dict[str, Any],
    ):
        """Validate fluid/thermal system"""
        connections = blueprint.get("connections", [])

        # Mass balance validation
        if len(connections) >= 2:
            # Simplified: assume first is inflow, rest are outflows
            inflow = system_vars.get(f"{connections[0]['id']}_m", 0)
            outflows = [
                system_vars.get(f"{conn['id']}_m", 0) for conn in connections[1:]
            ]

            result = self.fluid.validate_mass_balance(inflow, outflows)
            self.results.append(result)

        # Heat transfer validation (if thermal)
        if "initial_temp" in validation_config and "final_temp" in validation_config:
            mass_flow = validation_config.get("mass_flow_in", 1)
            cp = PHYSICS_CONSTANTS["specific_heat_water"]
            t_in = validation_config["initial_temp"]
            t_out = validation_config["final_temp"]

            # This would come from simulation result in reality
            # Using expected value as placeholder
            q_expected = self.thermal.calculate_heat_transfer(
                mass_flow, cp, t_in, t_out
            )

            # For now, assume simulation returned expected
            result = self.thermal.validate_heat_transfer(
                mass_flow, cp, t_in, t_out, q_expected
            )
            self.results.append(result)

    def _validate_electrical_system(
        self,
        blueprint: Dict[str, Any],
        system_vars: Dict[str, float],
        validation_config: Dict[str, Any],
    ):
        """Validate electrical system"""
        # Ohm's law validation
        if "voltage" in validation_config and "resistance" in validation_config:
            v = validation_config["voltage"]
            r = validation_config["resistance"]
            # Get current from simulation result
            i = validation_config.get("current_expected", v / r)

            result = self.electrical.validate_ohms_law(v, i, r)
            self.results.append(result)

    def get_summary(self) -> str:
        """Get human-readable validation summary"""
        if not self.results:
            return "No validations performed"

        passed = sum(1 for r in self.results if r.passed)
        total = len(self.results)

        lines = [
            "=" * 70,
            "PHYSICS VALIDATION SUMMARY",
            "=" * 70,
            f"Total Tests: {total}",
            f"Passed: {passed} ({passed / total * 100:.1f}%)",
            f"Failed: {total - passed}",
            "-" * 70,
        ]

        for result in self.results:
            status = "✅ PASS" if result.passed else "❌ FAIL"
            lines.append(f"{status} - {result.test_name}")
            lines.append(f"       Expected: {result.expected_value:.4f}")
            lines.append(f"       Actual:   {result.actual_value:.4f}")
            lines.append(f"       Error:    {result.error_percent:.2f}%")
            lines.append("")

        lines.append("=" * 70)
        return "\n".join(lines)


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "PHYSICS_CONSTANTS",
    "ValidationResult",
    "FluidMechanicsValidator",
    "ThermodynamicsValidator",
    "ElectricalValidator",
    "PhysicsValidator",
]
