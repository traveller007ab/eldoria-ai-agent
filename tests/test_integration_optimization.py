"""
Integration Tests for Phase 4+5
Tests end-to-end workflows and optimization features
"""

import pytest
import asyncio
from datetime import datetime

# Import test modules
try:
    from services.integration_testing import (
        IntegrationTestSuite,
        DemoModeWorkflowScenario,
        PhysicsWithAgentsScenario,
        ErrorRecoveryScenario,
    )
    from services.free_tier_optimization import (
        ColdStartHandler,
        ColdStartConfig,
        MemoryOptimizer,
        PerformanceMonitor,
        cold_start_handler,
        memory_optimizer,
        performance_monitor,
    )

    TEST_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import modules: {e}")
    TEST_MODULES_AVAILABLE = False

# ============================================================================
# COLD START HANDLER TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestColdStartHandler:
    """Test cold start handling functionality"""

    def test_cold_start_handler_creation(self):
        """Test cold start handler can be created"""
        config = ColdStartConfig()
        handler = ColdStartHandler(config)

        assert handler is not None
        assert handler.config.sleep_threshold_minutes == 10

    def test_activity_recording(self):
        """Test activity recording updates timestamp"""
        handler = ColdStartHandler()

        initial_time = handler.last_activity
        handler.record_activity()

        assert handler.last_activity > initial_time
        assert handler.is_waking_up is False

    def test_inactive_duration_calculation(self):
        """Test inactive duration calculation"""
        handler = ColdStartHandler()

        # Should be very small (just created)
        duration = handler.get_inactive_duration()
        assert duration >= 0
        assert duration < 1  # Less than 1 second

    def test_likely_asleep_detection(self):
        """Test detection of likely asleep state"""
        handler = ColdStartHandler()

        # Fresh handler should not be asleep
        assert handler.is_likely_asleep() is False

        # Simulate old activity
        from datetime import datetime, timedelta

        handler.last_activity = datetime.now() - timedelta(minutes=15)

        # Should now be asleep
        assert handler.is_likely_asleep() is True

    def test_status_reporting(self):
        """Test status reporting"""
        handler = ColdStartHandler()
        status = handler.get_status()

        assert "is_likely_asleep" in status
        assert "inactive_duration_seconds" in status
        assert "sleep_threshold_minutes" in status


# ============================================================================
# MEMORY OPTIMIZER TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestMemoryOptimizer:
    """Test memory optimization functionality"""

    def test_memory_optimizer_creation(self):
        """Test memory optimizer can be created"""
        optimizer = MemoryOptimizer(max_memory_mb=400)

        assert optimizer is not None
        assert optimizer.max_memory_mb == 400
        assert optimizer.warning_threshold == 320  # 80% of 400
        assert optimizer.critical_threshold == 360  # 90% of 400

    def test_memory_usage_check(self):
        """Test memory usage checking"""
        optimizer = MemoryOptimizer()
        mem = optimizer.get_memory_usage()

        assert "rss_mb" in mem
        assert "vms_mb" in mem
        assert "percent" in mem
        assert "available_mb" in mem

        # Memory values should be positive
        assert mem["rss_mb"] >= 0
        assert mem["percent"] >= 0

    def test_memory_status_check(self):
        """Test memory status checking"""
        optimizer = MemoryOptimizer()
        check = optimizer.check_memory()

        assert "status" in check
        assert check["status"] in ["ok", "warning", "critical"]
        assert "usage" in check
        assert "thresholds" in check
        assert "recommendations" in check

    def test_memory_report_generation(self):
        """Test memory report generation"""
        optimizer = MemoryOptimizer()
        report = optimizer.get_optimization_report()

        assert isinstance(report, str)
        assert "MEMORY OPTIMIZATION REPORT" in report


# ============================================================================
# PERFORMANCE MONITOR TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestPerformanceMonitor:
    """Test performance monitoring functionality"""

    def test_performance_monitor_creation(self):
        """Test performance monitor can be created"""
        monitor = PerformanceMonitor(max_history=100)

        assert monitor is not None
        assert monitor.max_history == 100
        assert len(monitor.snapshots) == 0

    def test_snapshot_recording(self):
        """Test snapshot recording"""
        monitor = PerformanceMonitor()

        monitor.record_snapshot()

        assert len(monitor.snapshots) == 1
        assert monitor.snapshots[0].timestamp is not None
        assert monitor.snapshots[0].memory_usage_mb >= 0

    def test_request_recording(self):
        """Test request recording"""
        monitor = PerformanceMonitor()

        monitor.record_request(0.5, was_cold_start=False)
        monitor.record_request(1.0, was_cold_start=True)

        assert len(monitor.request_times) == 2
        assert monitor.cold_start_count == 1

    def test_stats_retrieval(self):
        """Test stats retrieval"""
        monitor = PerformanceMonitor()

        # Record some data
        monitor.record_snapshot()
        monitor.record_request(0.5)

        stats = monitor.get_stats()

        assert "snapshots_count" in stats
        assert stats["snapshots_count"] == 1
        assert "avg_response_time_ms" in stats


# ============================================================================
# INTEGRATION SCENARIO TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestIntegrationScenarios:
    """Test integration scenarios"""

    @pytest.mark.asyncio
    async def test_demo_mode_workflow_scenario(self):
        """Test demo mode workflow scenario"""
        scenario = DemoModeWorkflowScenario()
        result = await scenario.run()

        assert "scenario" in result
        assert "passed" in result
        assert "execution_time" in result
        assert "results" in result

        # Should have logged steps
        assert len(result["results"]) > 0

    @pytest.mark.asyncio
    async def test_physics_with_agents_scenario(self):
        """Test physics with agents scenario"""
        scenario = PhysicsWithAgentsScenario()
        result = await scenario.run()

        assert result["scenario"] == "Physics + Agents Integration"
        assert "results" in result

    @pytest.mark.asyncio
    async def test_error_recovery_scenario(self):
        """Test error recovery scenario"""
        scenario = ErrorRecoveryScenario()
        result = await scenario.run()

        assert result["scenario"] == "Error Recovery and Resilience"
        assert "results" in result


# ============================================================================
# FULL INTEGRATION SUITE TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestIntegrationSuite:
    """Test full integration suite"""

    @pytest.mark.asyncio
    async def test_integration_suite_run(self):
        """Test running full integration suite"""
        suite = IntegrationTestSuite()
        results = await suite.run_all()

        assert "overall_passed" in results
        assert "total_scenarios" in results
        assert "scenarios" in results
        assert isinstance(results["scenarios"], list)

    def test_report_generation(self):
        """Test report generation"""
        suite = IntegrationTestSuite()

        # Add a mock result
        suite.results = [
            {
                "scenario": "Test",
                "description": "Test scenario",
                "passed": True,
                "execution_time": 1.0,
                "results": [{"step": "test", "status": "passed"}],
            }
        ]

        report = suite.generate_report()

        assert isinstance(report, str)
        assert "INTEGRATION TEST REPORT" in report
        assert "Test" in report


# ============================================================================
# GLOBAL INSTANCE TESTS
# ============================================================================


@pytest.mark.skipif(not TEST_MODULES_AVAILABLE, reason="Test modules not available")
class TestGlobalInstances:
    """Test global instances are properly configured"""

    def test_cold_start_handler_global(self):
        """Test global cold start handler"""
        assert cold_start_handler is not None
        assert isinstance(cold_start_handler, ColdStartHandler)

    def test_memory_optimizer_global(self):
        """Test global memory optimizer"""
        assert memory_optimizer is not None
        assert isinstance(memory_optimizer, MemoryOptimizer)

    def test_performance_monitor_global(self):
        """Test global performance monitor"""
        assert performance_monitor is not None
        assert isinstance(performance_monitor, PerformanceMonitor)


# ============================================================================
# RUN TESTS
# ============================================================================


def run_tests():
    """Run all Phase 4+5 tests"""
    print("=" * 70)
    print("PHASE 4+5: INTEGRATION & OPTIMIZATION TEST SUITE")
    print("=" * 70)

    if not TEST_MODULES_AVAILABLE:
        print("\n❌ Test modules not available. Cannot run tests.")
        return 1

    # Run pytest
    exit_code = pytest.main([__file__, "-v", "--tb=short"])

    print("\n" + "=" * 70)
    if exit_code == 0:
        print("✅ ALL PHASE 4+5 TESTS PASSED")
        print("✅ Integration testing framework working")
        print("✅ Free tier optimization features working")
    else:
        print(f"⚠️  TESTS EXIT CODE: {exit_code}")
    print("=" * 70)

    return exit_code


if __name__ == "__main__":
    run_tests()
