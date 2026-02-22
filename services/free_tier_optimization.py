"""
Railway Free Tier Optimization
Handles cold starts, memory optimization, and performance tuning
"""

import os
import time
import asyncio
import psutil
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import functools

# ============================================================================
# COLD START HANDLER
# ============================================================================


@dataclass
class ColdStartConfig:
    """Configuration for cold start handling"""

    # Railway free tier containers sleep after ~10 minutes of inactivity
    sleep_threshold_minutes: int = 10

    # How often to ping to keep alive (8 minutes to be safe)
    keep_alive_interval_seconds: int = 480  # 8 minutes

    # Show "waking up" message after this many seconds of no response
    wake_up_timeout_seconds: int = 5

    # Maximum time to wait for Railway to wake up
    max_wake_up_wait_seconds: int = 30


class ColdStartHandler:
    """
    Handles Railway free tier cold starts gracefully

    Railway free tier containers go to sleep after ~10 minutes of inactivity.
    First request after sleep takes 5-30 seconds to respond while container wakes up.
    """

    def __init__(self, config: ColdStartConfig = None):
        self.config = config or ColdStartConfig()
        self.last_activity = datetime.now()
        self.is_waking_up = False
        self.wake_up_start_time: Optional[datetime] = None
        self._wake_up_callbacks: List[Callable] = []

    def record_activity(self):
        """Record that there was activity"""
        self.last_activity = datetime.now()
        self.is_waking_up = False

    def get_inactive_duration(self) -> float:
        """Get how long the server has been inactive (seconds)"""
        return (datetime.now() - self.last_activity).total_seconds()

    def is_likely_asleep(self) -> bool:
        """Check if the container is likely asleep"""
        inactive_minutes = self.get_inactive_duration() / 60
        return inactive_minutes > self.config.sleep_threshold_minutes

    def on_wake_up(self, callback: Callable):
        """Register a callback to be called when server wakes up"""
        self._wake_up_callbacks.append(callback)

    async def handle_request(self, request_handler: Callable, *args, **kwargs):
        """
        Wrap a request handler with cold start logic

        Returns tuple of (result, was_cold_start)
        """
        was_cold_start = False

        # Check if we need to wake up
        if self.is_likely_asleep():
            was_cold_start = True
            self.is_waking_up = True
            self.wake_up_start_time = datetime.now()

            print(f"[COLD START] Container appears asleep. Waking up...")

        try:
            # Execute the request
            start_time = time.time()
            result = await request_handler(*args, **kwargs)
            execution_time = time.time() - start_time

            # Record activity
            self.record_activity()

            # If this took a long time and we were waking up, log it
            if was_cold_start and execution_time > self.config.wake_up_timeout_seconds:
                wake_up_duration = (
                    datetime.now() - self.wake_up_start_time
                ).total_seconds()
                print(f"[COLD START] Wake up completed in {wake_up_duration:.2f}s")

                # Notify callbacks
                for callback in self._wake_up_callbacks:
                    try:
                        callback(wake_up_duration)
                    except Exception as e:
                        print(f"[COLD START] Callback error: {e}")

            return result, was_cold_start

        except Exception as e:
            self.record_activity()  # Still record activity on error
            raise e

    def get_status(self) -> Dict[str, Any]:
        """Get current cold start handler status"""
        return {
            "is_likely_asleep": self.is_likely_asleep(),
            "inactive_duration_seconds": self.get_inactive_duration(),
            "is_waking_up": self.is_waking_up,
            "sleep_threshold_minutes": self.config.sleep_threshold_minutes,
            "last_activity": self.last_activity.isoformat(),
        }


# Global cold start handler instance
cold_start_handler = ColdStartHandler()


# ============================================================================
# MEMORY OPTIMIZATION
# ============================================================================


class MemoryOptimizer:
    """
    Monitors and optimizes memory usage for Railway free tier (512 MB limit)
    """

    def __init__(self, max_memory_mb: float = 450):  # Leave 62 MB buffer
        self.max_memory_mb = max_memory_mb
        self.warning_threshold = max_memory_mb * 0.8  # 80%
        self.critical_threshold = max_memory_mb * 0.9  # 90%
        self.optimization_callbacks: List[Callable] = []
        self._process = None
        try:
            self._process = psutil.Process()
        except Exception:
            self._process = None

    @property
    def process(self):
        if self._process is None:
            try:
                self._process = psutil.Process()
            except Exception:
                pass
        return self._process

    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics"""
        if self.process is None:
            return {
                "rss_mb": 0,
                "vms_mb": 0,
                "percent": 0,
                "max_allowed_mb": self.max_memory_mb,
                "available_mb": self.max_memory_mb,
            }
        mem_info = self.process.memory_info()

        return {
            "rss_mb": mem_info.rss / 1024 / 1024,  # Resident Set Size
            "vms_mb": mem_info.vms / 1024 / 1024,  # Virtual Memory Size
            "percent": self.process.memory_percent(),
            "max_allowed_mb": self.max_memory_mb,
            "available_mb": self.max_memory_mb - (mem_info.rss / 1024 / 1024),
        }

    def check_memory(self) -> Dict[str, Any]:
        """Check memory status and return recommendations"""
        mem = self.get_memory_usage()
        rss = mem["rss_mb"]

        status = "ok"
        recommendations = []

        if rss > self.critical_threshold:
            status = "critical"
            recommendations = [
                "Clear caches immediately",
                "Reduce concurrent operations",
                "Consider upgrading to Hobby tier",
            ]
            # Trigger optimizations
            self._trigger_optimizations()

        elif rss > self.warning_threshold:
            status = "warning"
            recommendations = [
                "Monitor memory closely",
                "Clear old caches",
                "Limit large simulations",
            ]

        return {
            "status": status,
            "usage": mem,
            "thresholds": {
                "warning_mb": self.warning_threshold,
                "critical_mb": self.critical_threshold,
            },
            "recommendations": recommendations,
        }

    def on_memory_pressure(self, callback: Callable):
        """Register callback to be called when memory is critical"""
        self.optimization_callbacks.append(callback)

    def _trigger_optimizations(self):
        """Trigger memory optimization callbacks"""
        print("[MEMORY] Critical memory pressure detected. Triggering optimizations...")

        for callback in self.optimization_callbacks:
            try:
                callback()
            except Exception as e:
                print(f"[MEMORY] Optimization callback error: {e}")

    def clear_caches(self):
        """Clear all caches to free memory"""
        try:
            # Clear agent cache
            from services.agent_cache import AgentCache

            cache = AgentCache()
            stats_before = cache.get_stats()
            cache.clear()
            stats_after = cache.get_stats()

            print(
                f"[MEMORY] Cleared agent cache. Size: {stats_before['size']} → {stats_after['size']}"
            )

        except Exception as e:
            print(f"[MEMORY] Error clearing caches: {e}")

    def get_optimization_report(self) -> str:
        """Generate memory optimization report"""
        check = self.check_memory()
        mem = check["usage"]

        lines = [
            "=" * 70,
            "MEMORY OPTIMIZATION REPORT",
            "=" * 70,
            f"Status: {check['status'].upper()}",
            f"Memory Usage: {mem['rss_mb']:.1f} MB / {self.max_memory_mb:.1f} MB ({mem['percent']:.1f}%)",
            f"Available: {mem['available_mb']:.1f} MB",
            "",
        ]

        if check["recommendations"]:
            lines.append("Recommendations:")
            for rec in check["recommendations"]:
                lines.append(f"  - {rec}")
        else:
            lines.append("✅ Memory usage is healthy")

        lines.append("=" * 70)

        return "\n".join(lines)


# Global memory optimizer instance
memory_optimizer = MemoryOptimizer()

# Register cache clearing on memory pressure
memory_optimizer.on_memory_pressure(memory_optimizer.clear_caches)


# ============================================================================
# PERFORMANCE MONITORING
# ============================================================================


@dataclass
class PerformanceSnapshot:
    """Snapshot of system performance"""

    timestamp: datetime
    memory_usage_mb: float
    cpu_percent: float
    request_count: int = 0
    avg_response_time_ms: float = 0.0
    cold_starts: int = 0


class PerformanceMonitor:
    """Monitor system performance over time"""

    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self.snapshots: List[PerformanceSnapshot] = []
        self.request_times: List[float] = []
        self.cold_start_count = 0
        self.process = psutil.Process()

    def record_snapshot(self):
        """Record a performance snapshot"""
        mem_info = self.process.memory_info()

        snapshot = PerformanceSnapshot(
            timestamp=datetime.now(),
            memory_usage_mb=mem_info.rss / 1024 / 1024,
            cpu_percent=self.process.cpu_percent(),
            request_count=len(self.request_times),
            avg_response_time_ms=(
                sum(self.request_times) / len(self.request_times) * 1000
            )
            if self.request_times
            else 0,
            cold_starts=self.cold_start_count,
        )

        self.snapshots.append(snapshot)

        # Keep only recent history
        if len(self.snapshots) > self.max_history:
            self.snapshots = self.snapshots[-self.max_history :]

    def record_request(self, duration_seconds: float, was_cold_start: bool = False):
        """Record a request duration"""
        self.request_times.append(duration_seconds)

        # Keep only recent requests
        if len(self.request_times) > 100:
            self.request_times = self.request_times[-100:]

        if was_cold_start:
            self.cold_start_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.snapshots:
            return {"error": "No snapshots recorded"}

        recent = self.snapshots[-10:]  # Last 10 snapshots

        avg_memory = sum(s.memory_usage_mb for s in recent) / len(recent)
        avg_cpu = sum(s.cpu_percent for s in recent) / len(recent)

        return {
            "snapshots_count": len(self.snapshots),
            "avg_memory_mb": round(avg_memory, 2),
            "avg_cpu_percent": round(avg_cpu, 2),
            "avg_response_time_ms": round(
                (sum(self.request_times) / len(self.request_times) * 1000), 2
            )
            if self.request_times
            else 0,
            "cold_starts_total": self.cold_start_count,
            "latest": {
                "memory_mb": round(self.snapshots[-1].memory_usage_mb, 2),
                "cpu_percent": round(self.snapshots[-1].cpu_percent, 2),
                "timestamp": self.snapshots[-1].timestamp.isoformat(),
            },
        }


# Global performance monitor
performance_monitor = PerformanceMonitor()


# ============================================================================
# DECORATORS FOR EASY INTEGRATION
# ============================================================================


def monitored(handler_func):
    """
    Decorator to monitor endpoint performance

    Usage:
        @app.get("/endpoint")
        @monitored
        async def my_endpoint():
            return {"result": "ok"}
    """

    @functools.wraps(handler_func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            # Check if we need to handle cold start
            result, was_cold_start = await cold_start_handler.handle_request(
                handler_func, *args, **kwargs
            )

            # Record performance
            duration = time.time() - start_time
            performance_monitor.record_request(duration, was_cold_start)

            # Periodic snapshot
            if len(performance_monitor.request_times) % 10 == 0:
                performance_monitor.record_snapshot()

            return result

        except Exception as e:
            duration = time.time() - start_time
            performance_monitor.record_request(duration)
            raise e

    return wrapper


def memory_aware(handler_func):
    """
    Decorator to check memory before executing

    Usage:
        @app.post("/expensive-operation")
        @memory_aware
        async def expensive_operation():
            return {"result": "ok"}
    """

    @functools.wraps(handler_func)
    async def wrapper(*args, **kwargs):
        # Check memory before
        mem_check = memory_optimizer.check_memory()

        if mem_check["status"] == "critical":
            return {
                "error": "Server is under high memory pressure",
                "message": "Please try again in a moment",
                "status": "memory_pressure",
                "recommendations": mem_check["recommendations"],
            }

        return await handler_func(*args, **kwargs)

    return wrapper


# ============================================================================
# HEALTH CHECK ENHANCEMENT
# ============================================================================


def get_enhanced_health_status() -> Dict[str, Any]:
    """Get comprehensive health status including optimization metrics"""

    # Basic health
    health = {"status": "healthy", "timestamp": datetime.now().isoformat()}

    # Cold start info
    cold_start_status = cold_start_handler.get_status()
    health["cold_start"] = {
        "likely_asleep": cold_start_status["is_likely_asleep"],
        "inactive_seconds": round(cold_start_status["inactive_duration_seconds"], 1),
    }

    # Memory status
    mem_check = memory_optimizer.check_memory()
    health["memory"] = {
        "status": mem_check["status"],
        "usage_mb": round(mem_check["usage"]["rss_mb"], 1),
        "available_mb": round(mem_check["usage"]["available_mb"], 1),
        "percent": round(mem_check["usage"]["percent"], 1),
    }

    # Performance stats
    perf_stats = performance_monitor.get_stats()
    health["performance"] = {
        "avg_response_time_ms": perf_stats.get("avg_response_time_ms", 0),
        "cold_starts": perf_stats.get("cold_starts_total", 0),
    }

    # Railway specific
    health["railway"] = {
        "free_tier_optimized": True,
        "cold_start_handling": "enabled",
        "memory_management": "enabled",
    }

    return health


# ============================================================================
# BACKGROUND TASKS
# ============================================================================


async def keep_alive_ping():
    """Background task to prevent Railway from sleeping"""
    while True:
        await asyncio.sleep(ColdStartConfig().keep_alive_interval_seconds)

        # Record activity to prevent sleep
        cold_start_handler.record_activity()

        # Record performance snapshot
        performance_monitor.record_snapshot()

        print(f"[KEEP ALIVE] Ping at {datetime.now().isoformat()}")


async def memory_monitor_task():
    """Background task to monitor memory"""
    while True:
        await asyncio.sleep(60)  # Check every minute

        mem_check = memory_optimizer.check_memory()

        if mem_check["status"] == "critical":
            print(f"[MEMORY] CRITICAL: {mem_check['usage']['rss_mb']:.1f} MB used")
            memory_optimizer.clear_caches()
        elif mem_check["status"] == "warning":
            print(f"[MEMORY] WARNING: {mem_check['usage']['rss_mb']:.1f} MB used")


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    "ColdStartHandler",
    "cold_start_handler",
    "MemoryOptimizer",
    "memory_optimizer",
    "PerformanceMonitor",
    "performance_monitor",
    "monitored",
    "memory_aware",
    "get_enhanced_health_status",
    "keep_alive_ping",
    "memory_monitor_task",
]
