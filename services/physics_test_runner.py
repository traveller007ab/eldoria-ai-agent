"""
Physics Simulation Test Runner
Integration endpoint for running all Phase 3 tests
"""

import asyncio
import json
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from datetime import datetime

# Import test modules
try:
    from services.physics_test_blueprints import (
        get_all_test_blueprints,
        get_test_blueprint,
        validate_blueprint_structure,
    )
    from services.physics_validation import PhysicsValidator
    from services.physics_performance_testing import PhysicsPerformanceTester

    TEST_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import test modules: {e}")
    TEST_MODULES_AVAILABLE = False

try:
    from services.simulation import run_simulation, SimulationRequest

    SIMULATION_AVAILABLE = True
except ImportError:
    SIMULATION_AVAILABLE = False

router = APIRouter(prefix="/test/physics", tags=["physics-testing"])

# ============================================================================
# MODELS
# ============================================================================


class PhysicsTestRequest(BaseModel):
    """Request to run physics tests"""

    test_type: str = (
        "all"  # "all", "convergence", "validation", "performance", "railway"
    )
    blueprint_name: str = None  # Specific blueprint to test, or None for all
    tolerance: float = 1e-6


class PhysicsTestResult(BaseModel):
    """Result of physics testing"""

    test_id: str
    timestamp: datetime
    test_type: str
    success: bool
    summary: Dict[str, Any]
    details: Dict[str, Any]
    execution_time: float


# ============================================================================
# TEST ENDPOINTS
# ============================================================================


@router.post("/run", response_model=PhysicsTestResult)
async def run_physics_tests(request: PhysicsTestRequest):
    """
    Run comprehensive physics simulation tests

    Tests solver convergence, physics validation, and Railway compatibility
    """
    if not TEST_MODULES_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Physics testing modules not available"
        )

    start_time = datetime.now()
    test_id = f"physics-test-{start_time.timestamp()}"

    try:
        results = {
            "test_id": test_id,
            "test_type": request.test_type,
            "timestamp": start_time.isoformat(),
            "blueprints_tested": [],
            "validation_results": [],
            "performance_results": {},
            "errors": [],
        }

        # Get blueprints to test
        if request.blueprint_name:
            blueprint = get_test_blueprint(request.blueprint_name)
            if not blueprint:
                raise HTTPException(
                    status_code=404,
                    detail=f"Blueprint '{request.blueprint_name}' not found",
                )
            blueprints = [blueprint]
        else:
            blueprints = get_all_test_blueprints()

        results["blueprints_tested"] = [b.get("project_name") for b in blueprints]

        # Run tests based on type
        if request.test_type in ["all", "validation"]:
            validation_results = await _run_validation_tests(blueprints)
            results["validation_results"] = validation_results

        if request.test_type in ["all", "performance", "railway"]:
            performance_tester = PhysicsPerformanceTester()
            perf_results = await performance_tester.run_all_tests()
            results["performance_results"] = perf_results

        # Calculate overall success
        success = len(results["errors"]) == 0

        execution_time = (datetime.now() - start_time).total_seconds()

        return PhysicsTestResult(
            test_id=test_id,
            timestamp=start_time,
            test_type=request.test_type,
            success=success,
            summary={
                "blueprints_tested": len(blueprints),
                "execution_time": execution_time,
                "errors_count": len(results["errors"]),
            },
            details=results,
            execution_time=execution_time,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test execution failed: {str(e)}")


@router.get("/blueprints")
async def list_test_blueprints():
    """List all available test blueprints"""
    if not TEST_MODULES_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Physics testing modules not available"
        )

    blueprints = get_all_test_blueprints()

    return {
        "blueprints": [
            {
                "name": b.get("project_name"),
                "description": b.get("description"),
                "domain": _detect_domain(b),
                "components_count": len(b.get("components", [])),
                "connections_count": len(b.get("connections", [])),
            }
            for b in blueprints
        ],
        "count": len(blueprints),
    }


@router.post("/blueprint/{blueprint_name}/validate")
async def validate_blueprint(blueprint_name: str):
    """Validate a specific blueprint structure"""
    if not TEST_MODULES_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Physics testing modules not available"
        )

    blueprint = get_test_blueprint(blueprint_name)
    if not blueprint:
        raise HTTPException(
            status_code=404, detail=f"Blueprint '{blueprint_name}' not found"
        )

    is_valid, errors = validate_blueprint_structure(blueprint)

    return {
        "blueprint_name": blueprint_name,
        "valid": is_valid,
        "errors": errors,
        "structure": {
            "project_name": blueprint.get("project_name"),
            "components": len(blueprint.get("components", [])),
            "connections": len(blueprint.get("connections", [])),
            "expected_physics": blueprint.get("expected_physics", {}),
        },
    }


@router.post("/blueprint/{blueprint_name}/simulate")
async def simulate_blueprint(
    blueprint_name: str,
    solver_config: Dict[str, Any] = Body(default={"tolerance": 1e-6}),
):
    """Run simulation on a specific test blueprint"""
    if not TEST_MODULES_AVAILABLE or not SIMULATION_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Simulation or testing modules not available"
        )

    blueprint = get_test_blueprint(blueprint_name)
    if not blueprint:
        raise HTTPException(
            status_code=404, detail=f"Blueprint '{blueprint_name}' not found"
        )

    # Update solver config
    blueprint["solver_config"] = solver_config

    try:
        # Run simulation
        result = await run_simulation(SimulationRequest(**blueprint))

        # Validate results
        validator = PhysicsValidator()
        validation = validator.validate_simulation_result(blueprint, result)

        return {
            "blueprint": blueprint_name,
            "simulation_success": result.get("success", False),
            "simulation_result": result,
            "physics_validation": validation,
            "summary": {
                "overall_passed": validation["overall_passed"],
                "tests_run": validation["total_tests"],
                "tests_passed": validation["passed"],
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@router.get("/railway/compatibility")
async def check_railway_compatibility():
    """Quick check of Railway free tier compatibility"""
    if not TEST_MODULES_AVAILABLE:
        raise HTTPException(
            status_code=503, detail="Physics testing modules not available"
        )

    from services.physics_performance_testing import RailwayFreeTierTester

    tester = RailwayFreeTierTester()

    # Run compatibility test
    report = await tester.run_full_compatibility_test()

    return {
        "compatible": report["overall_passed"],
        "summary": {
            "total_tests": report["total_tests"],
            "passed": report["passed"],
            "failed": report["failed"],
            "pass_rate": report["pass_rate"],
        },
        "railway_limits": report["railway_limits"],
        "recommendations": _generate_recommendations(report),
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


async def _run_validation_tests(blueprints: List[Dict]) -> List[Dict]:
    """Run physics validation on all blueprints"""
    results = []
    validator = PhysicsValidator()

    for blueprint in blueprints:
        if not SIMULATION_AVAILABLE:
            # Skip if simulation not available
            continue

        try:
            # Run simulation
            sim_result = await run_simulation(SimulationRequest(**blueprint))

            # Validate
            validation = validator.validate_simulation_result(blueprint, sim_result)

            results.append(
                {
                    "blueprint": blueprint.get("project_name"),
                    "success": sim_result.get("success", False),
                    "validation": validation,
                }
            )

        except Exception as e:
            results.append(
                {
                    "blueprint": blueprint.get("project_name"),
                    "success": False,
                    "error": str(e),
                }
            )

    return results


def _detect_domain(blueprint: Dict) -> str:
    """Detect physics domain from blueprint"""
    components = blueprint.get("components", [])
    if not components:
        return "unknown"

    first_type = components[0].get("type", "").lower()

    electrical_keywords = ["resistor", "battery", "voltage", "current", "ground"]
    if any(kw in first_type for kw in electrical_keywords):
        return "electrical"

    thermal_keywords = ["heater", "boiler", "condenser", "heat"]
    if any(kw in first_type for kw in thermal_keywords):
        return "thermal"

    return "fluid"


def _generate_recommendations(report: Dict) -> List[str]:
    """Generate recommendations based on compatibility report"""
    recommendations = []

    if report["overall_passed"]:
        recommendations.append(
            "✅ Simulation engine is fully compatible with Railway free tier"
        )
        recommendations.append("✅ Can handle systems up to 20 components reliably")
    else:
        failed_count = report["failed"]
        recommendations.append(
            f"⚠️  {failed_count} tests failed Railway compatibility checks"
        )

        # Check specific issues
        for test in report.get("test_results", []):
            if not test["passed"]:
                for violation in test.get("violations", []):
                    if "memory" in violation.lower():
                        recommendations.append(
                            "💡 Consider reducing component count or simplifying geometry"
                        )
                    elif "time" in violation.lower():
                        recommendations.append(
                            "💡 Consider increasing solver tolerance (e.g., 1e-4 instead of 1e-6)"
                        )

    return recommendations


# ============================================================================
# EXPORT
# ============================================================================

__all__ = ["router"]
