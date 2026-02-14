"""
Comprehensive test suite for Phase 3: Physics Simulation Testing
Tests physics validation, performance, and Railway compatibility
"""

import pytest
import asyncio
import time
from typing import Dict, List, Any

# Import test modules
try:
    from services.physics_test_blueprints import (
        get_all_test_blueprints,
        get_test_blueprint,
        validate_blueprint_structure,
        BASIC_HYDRAULICS_BLUEPRINT,
        THERMAL_SYSTEM_BLUEPRINT,
        ELECTRICAL_CIRCUIT_BLUEPRINT,
    )
    from services.physics_validation import (
        PhysicsValidator,
        FluidMechanicsValidator,
        ThermodynamicsValidator,
        ElectricalValidator,
        PHYSICS_CONSTANTS,
    )
    from services.physics_performance_testing import (
        SolverConvergenceTester,
        RailwayFreeTierTester,
        PerformanceMetrics,
    )

    TEST_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import test modules: {e}")
    TEST_MODULES_AVAILABLE = False

# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def validator():
    """Fixture for physics validator"""
    if TEST_MODULES_AVAILABLE:
        return PhysicsValidator()
    return None


@pytest.fixture
def fluid_validator():
    """Fixture for fluid mechanics validator"""
    if TEST_MODULES_AVAILABLE:
        return FluidMechanicsValidator()
    return None


@pytest.fixture
def thermal_validator():
    """Fixture for thermodynamics validator"""
    if TEST_MODULES_AVAILABLE:
        return ThermodynamicsValidator()
    return None


@pytest.fixture
def basic_blueprint():
    """Fixture for basic hydraulics blueprint"""
    if TEST_MODULES_AVAILABLE:
        return BASIC_HYDRAULICS_BLUEPRINT
    return None


# ============================================================================
# BLUEPRINT STRUCTURE TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestBlueprintStructure:
    """Test blueprint structure validation"""

    def test_blueprint_has_required_fields(self):
        """All blueprints must have required fields"""
        blueprints = get_all_test_blueprints()

        for blueprint in blueprints:
            assert "project_name" in blueprint
            assert "components" in blueprint
            assert "connections" in blueprint
            assert isinstance(blueprint["components"], list)
            assert isinstance(blueprint["connections"], list)

    def test_components_have_required_fields(self):
        """All components must have id and type"""
        blueprints = get_all_test_blueprints()

        for blueprint in blueprints:
            for component in blueprint["components"]:
                assert "id" in component
                assert "type" in component
                assert isinstance(component["id"], str)
                assert isinstance(component["type"], str)

    def test_connections_have_required_fields(self):
        """All connections must have id, source, target"""
        blueprints = get_all_test_blueprints()

        for blueprint in blueprints:
            for connection in blueprint["connections"]:
                assert "id" in connection
                assert "source" in connection
                assert "target" in connection

    def test_blueprint_validation_function(self):
        """Test blueprint structure validator"""
        # Valid blueprint
        valid, errors = validate_blueprint_structure(BASIC_HYDRAULICS_BLUEPRINT)
        assert valid is True
        assert len(errors) == 0

        # Invalid blueprint (missing fields)
        invalid = {"project_name": "Test"}  # Missing components and connections
        valid, errors = validate_blueprint_structure(invalid)
        assert valid is False
        assert len(errors) > 0


# ============================================================================
# FLUID MECHANICS VALIDATION TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestFluidMechanicsValidation:
    """Test fluid mechanics equation validation"""

    def test_mass_balance_validation(self, fluid_validator):
        """Test mass balance conservation check"""
        # Perfect balance
        result = fluid_validator.validate_mass_balance(10.0, [5.0, 5.0])
        assert result.passed is True
        assert result.error_percent < 0.1

        # Imbalance
        result = fluid_validator.validate_mass_balance(10.0, [4.0, 5.0])
        assert result.passed is False
        assert result.error_percent > 0.1

    def test_bernoulli_equation_validation(self, fluid_validator):
        """Test Bernoulli's equation validation"""
        # Equal total heads (no losses)
        result = fluid_validator.validate_bernoulli_equation(
            p1=200000, v1=2.0, z1=0, p2=150000, v2=3.0, z2=5.0
        )
        # Should fail due to height difference not compensated
        assert result.passed is False

    def test_pressure_drop_calculation(self, fluid_validator):
        """Test Darcy-Weisbach pressure drop calculation"""
        drop = fluid_validator.calculate_pressure_drop_darcy_weisbach(
            length=100, diameter=0.1, velocity=2.0, friction_factor=0.02
        )
        # ΔP = f * (L/D) * (ρv²/2)
        # ΔP = 0.02 * (100/0.1) * (1000 * 4 / 2) = 0.02 * 1000 * 2000 = 40,000 Pa
        expected = 0.02 * 1000 * 2000
        assert abs(drop - expected) < 1.0


# ============================================================================
# THERMODYNAMICS VALIDATION TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestThermodynamicsValidation:
    """Test thermodynamics equation validation"""

    def test_first_law_validation(self, thermal_validator):
        """Test First Law of Thermodynamics validation"""
        # Q - W = ΔH
        # 1000 W - 200 W = 800 W enthalpy change
        result = thermal_validator.validate_first_law(
            heat_added=1000,
            work_done=200,
            enthalpy_in=500,
            enthalpy_out=1300,  # 500 + 800
        )
        assert result.passed is True

        # Violation
        result = thermal_validator.validate_first_law(
            heat_added=1000,
            work_done=200,
            enthalpy_in=500,
            enthalpy_out=1000,  # Should be 1300
        )
        assert result.passed is False

    def test_heat_transfer_calculation(self, thermal_validator):
        """Test heat transfer calculation"""
        q = thermal_validator.calculate_heat_transfer(
            mass_flow=5.0,  # kg/s
            cp=4186,  # J/(kg·K)
            temp_in=300,  # K
            temp_out=350,  # K
        )
        # Q = 5 * 4186 * 50 = 1,046,500 W
        expected = 5 * 4186 * 50
        assert abs(q - expected) < 1.0

    def test_thermal_efficiency_calculation(self, thermal_validator):
        """Test thermal efficiency calculation"""
        efficiency = thermal_validator.calculate_thermal_efficiency(
            net_work=350,  # W
            heat_input=1000,  # W
        )
        assert abs(efficiency - 0.35) < 0.001


# ============================================================================
# PHYSICS CONSTANTS TESTS
# ============================================================================


class TestPhysicsConstants:
    """Test physics constants are correct"""

    def test_gravity_constant(self):
        """Test gravity constant value"""
        assert PHYSICS_CONSTANTS["gravity"] == 9.81

    def test_water_density(self):
        """Test water density value"""
        assert PHYSICS_CONSTANTS["water_density"] == 1000

    def test_specific_heat_water(self):
        """Test specific heat of water"""
        assert PHYSICS_CONSTANTS["specific_heat_water"] == 4186


# ============================================================================
# RAILWAY COMPATIBILITY TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestRailwayCompatibility:
    """Test Railway free tier compatibility checks"""

    def test_memory_limit_check(self):
        """Test memory usage limit check"""
        tester = RailwayFreeTierTester()

        # Within limits
        metrics = PerformanceMetrics(
            test_name="Test",
            success=True,
            execution_time=1.0,
            memory_used=300,  # MB (under 512 limit)
            cpu_percent=50,
            iterations=10,
            error=0.001,
            convergence_achieved=True,
        )

        result = tester.check_compatibility(metrics)
        assert result["passed"] is True
        assert len(result["violations"]) == 0

        # Over memory limit
        metrics.memory_used = 600  # MB (over 512 limit)
        result = tester.check_compatibility(metrics)
        assert result["passed"] is False
        assert len(result["violations"]) > 0

    def test_execution_time_limit(self):
        """Test execution time limit check"""
        tester = RailwayFreeTierTester()

        # Within time limit
        metrics = PerformanceMetrics(
            test_name="Test",
            success=True,
            execution_time=10.0,  # Under 30s limit
            memory_used=100,
            cpu_percent=50,
            iterations=10,
            error=0.001,
            convergence_achieved=True,
        )

        result = tester.check_compatibility(metrics)
        assert result["passed"] is True

        # Over time limit
        metrics.execution_time = 35.0  # Over 30s limit
        result = tester.check_compatibility(metrics)
        assert result["passed"] is False


# ============================================================================
# SOLVER CONVERGENCE TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestSolverConvergence:
    """Test solver convergence characteristics"""

    def test_convergence_tester_creation(self):
        """Test convergence tester can be created"""
        tester = SolverConvergenceTester()
        assert tester is not None

    def test_blueprint_scaling(self):
        """Test blueprint scaling function"""
        tester = SolverConvergenceTester()

        original = BASIC_HYDRAULICS_BLUEPRINT
        scaled = tester._scale_blueprint(original, 10)

        assert len(scaled["components"]) == 10
        assert len(scaled["connections"]) == 9  # One less than components


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestIntegration:
    """Integration tests for complete workflow"""

    def test_validator_initialization(self, validator):
        """Test validator can be initialized"""
        assert validator is not None
        assert validator.fluid is not None
        assert validator.thermal is not None

    def test_full_validation_workflow(self, validator, basic_blueprint):
        """Test complete validation workflow"""
        # Create mock simulation result
        sim_result = {
            "success": True,
            "iterations": 25,
            "error": 0.0001,
            "system_vars": {
                "f1_P": 200,  # bar
                "f1_m": 10,  # kg/s
                "f2_P": 195,  # bar (pressure drop)
                "f2_m": 10,  # kg/s (mass conserved)
            },
        }

        # Run validation
        validation = validator.validate_simulation_result(basic_blueprint, sim_result)

        assert "overall_passed" in validation
        assert "test_results" in validation
        assert isinstance(validation["test_results"], list)

    def test_get_test_blueprint_function(self):
        """Test getting specific blueprint by name"""
        blueprint = get_test_blueprint("basic_hydraulics")
        assert blueprint is not None
        assert "Basic Hydraulics" in blueprint["project_name"]

        # Non-existent blueprint
        blueprint = get_test_blueprint("nonexistent")
        assert blueprint is None


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================


class TestPerformance:
    """Test performance characteristics"""

    def test_performance_metrics_creation(self):
        """Test performance metrics dataclass"""
        if not TEST_MODULES_AVAILABLE:
            pytest.skip("Test modules not available")

        metrics = PerformanceMetrics(
            test_name="Test",
            success=True,
            execution_time=2.5,
            memory_used=100.5,
            cpu_percent=25.0,
            iterations=30,
            error=0.0001,
            convergence_achieved=True,
        )

        assert metrics.test_name == "Test"
        assert metrics.execution_time == 2.5
        assert metrics.convergence_achieved is True

    def test_metrics_serialization(self):
        """Test metrics can be serialized to dict"""
        if not TEST_MODULES_AVAILABLE:
            pytest.skip("Test modules not available")

        metrics = PerformanceMetrics(
            test_name="Test",
            success=True,
            execution_time=2.5,
            memory_used=100.0,
            cpu_percent=25.0,
            iterations=30,
            error=0.0001,
            convergence_achieved=True,
        )

        data = metrics.to_dict()
        assert data["test_name"] == "Test"
        assert data["success"] is True
        assert "execution_time" in data


# ============================================================================
# RUN TESTS
# ============================================================================


def run_tests():
    """Run all Phase 3 tests"""
    print("=" * 70)
    print("PHASE 3: PHYSICS SIMULATION TEST SUITE")
    print("=" * 70)

    if not TEST_MODULES_AVAILABLE:
        print("\n❌ Test modules not available. Cannot run tests.")
        return 1

    # Run pytest
    exit_code = pytest.main(
        [
            __file__,
            "-v",
            "--tb=short",
            "-x",  # Stop on first failure
        ]
    )

    print("\n" + "=" * 70)
    if exit_code == 0:
        print("✅ ALL PHASE 3 TESTS PASSED")
    else:
        print(f"⚠️  TESTS FAILED (exit code: {exit_code})")
    print("=" * 70)

    return exit_code


if __name__ == "__main__":
    run_tests()
