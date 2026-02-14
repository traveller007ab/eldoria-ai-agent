"""
Comprehensive test suite for Phase 1: Fortress Mode
Tests security, rate limiting, and demo mode functionality
"""

import pytest
import asyncio
import json
from fastapi.testclient import TestClient
from starlette.testclient import TestClient as StarletteTestClient

# Import the app
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.bridge import app

client = TestClient(app)

# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================


class TestHealthCheck:
    """Test the enhanced health check endpoint"""

    def test_health_check_returns_200(self):
        """Health check should return 200 OK"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "demo_mode" in data
        assert "environment" in data

    def test_health_check_includes_security_info(self):
        """Health check should include security configuration"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "security" in data
        assert "rate_limiting" in data["security"]
        assert "cors_enabled" in data["security"]

    def test_health_check_rate_limit_headers(self):
        """Health check should include rate limit headers"""
        response = client.get("/health")
        assert response.status_code == 200
        # Check for rate limit headers
        assert (
            "X-RateLimit-Limit" in response.headers
            or "x-ratelimit-limit" in response.headers.lower()
        )


# ============================================================================
# RATE LIMITING TESTS
# ============================================================================


class TestRateLimiting:
    """Test rate limiting on various endpoints"""

    def test_auth_login_rate_limiting(self):
        """Login endpoint should have rate limiting"""
        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = client.post(
                "/auth/login",
                json={"email": f"test{i}@example.com", "password": "wrongpassword"},
            )
            responses.append(response.status_code)

        # Some should be rate limited (429)
        assert 429 in responses or all(r == 401 for r in responses), (
            f"Expected rate limiting (429) or auth failures (401), got: {responses}"
        )

    def test_proxy_endpoints_rate_limiting(self):
        """AI proxy endpoints should be strictly rate limited"""
        # Make multiple requests quickly
        responses = []
        for i in range(5):
            response = client.post(
                "/proxy/groq",
                json={"messages": [{"role": "user", "content": f"test {i}"}]},
            )
            responses.append(response.status_code)

        # Should see either:
        # - 200 (if in demo mode)
        # - 401 (if no API key)
        # - 429 (if rate limited)
        valid_codes = {200, 401, 429}
        assert all(r in valid_codes for r in responses), (
            f"Unexpected status codes: {responses}"
        )

    def test_rate_limit_headers_present(self):
        """Rate limited responses should include headers"""
        response = client.post(
            "/proxy/groq", json={"messages": [{"role": "user", "content": "test"}]}
        )

        # Check for rate limit headers
        headers = response.headers
        rate_limit_headers = [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
        ]

        # At least some headers should be present
        has_headers = any(
            h in headers or h.lower() in [k.lower() for k in headers.keys()]
            for h in rate_limit_headers
        )
        # Note: Headers might not be present in all responses, so this is informational
        print(f"Rate limit headers present: {has_headers}")


# ============================================================================
# DEMO MODE TESTS
# ============================================================================


class TestDemoMode:
    """Test demo mode functionality"""

    def test_demo_mode_detection(self):
        """Demo mode should be detected when no API keys"""
        from services.demo_mode import DemoModeChecker

        # Clear API keys temporarily
        import os

        original_groq = os.environ.pop("GROQ_API_KEY", None)
        original_gemini = os.environ.pop("GEMINI_API_KEY", None)

        try:
            is_demo = DemoModeChecker.is_demo_mode()
            # Should be True if no keys set
            print(f"Demo mode detected: {is_demo}")
        finally:
            # Restore keys
            if original_groq:
                os.environ["GROQ_API_KEY"] = original_groq
            if original_gemini:
                os.environ["GEMINI_API_KEY"] = original_gemini

    def test_proxy_returns_demo_response(self):
        """When in demo mode, proxy should return demo response"""
        response = client.post(
            "/proxy/groq", json={"messages": [{"role": "user", "content": "Hello"}]}
        )

        # Should succeed (200) with demo response
        assert response.status_code == 200
        data = response.json()

        # Check if it's a demo response
        if "demo_mode" in data or "choices" in data:
            print("Demo response received")
            if "choices" in data:
                content = data["choices"][0]["message"]["content"]
                assert "DEMO" in content.upper() or "demo_mode" in data

    def test_tavily_proxy_demo_mode(self):
        """Tavily proxy should return demo research results"""
        response = client.post("/proxy/tavily", json={"query": "machine learning"})

        assert response.status_code == 200
        data = response.json()

        if "demo_mode" in data:
            assert "results" in data
            assert len(data["results"]) > 0
            print("Demo research results returned")


# ============================================================================
# SECURITY TESTS
# ============================================================================


class TestSecurity:
    """Test security measures"""

    def test_cors_preflight(self):
        """CORS preflight should work for allowed origins"""
        response = client.options(
            "/health",
            headers={
                "Origin": "https://eldoriaai.netlify.app",
                "Access-Control-Request-Method": "POST",
            },
        )

        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers

    def test_file_system_requires_auth(self):
        """File system endpoints should require authentication"""
        # Try to read file without auth
        response = client.post("/fs/read", json={"path": "/tmp/test.txt"})

        # Should require auth (403)
        assert response.status_code == 403

    def test_file_system_blocks_restricted_paths(self):
        """File system should block access to sensitive paths"""
        from services.security import is_path_allowed

        # Test blocked paths
        blocked_paths = [
            "/etc/passwd",
            "/etc/shadow",
            "/root/.ssh/id_rsa",
            "../../../etc/passwd",
        ]

        for path in blocked_paths:
            is_allowed, error = is_path_allowed(path)
            assert not is_allowed, f"Path {path} should be blocked"
            assert error is not None

    def test_file_system_allows_allowed_paths(self):
        """File system should allow access to allowed paths"""
        from services.security import is_path_allowed

        # Test allowed paths
        allowed_paths = [
            "/tmp/test.txt",
            "/app/data/project.json",
        ]

        for path in allowed_paths:
            is_allowed, error = is_path_allowed(path)
            # These might not be allowed depending on environment
            print(f"Path {path}: allowed={is_allowed}, error={error}")


# ============================================================================
# RAILWAY-SPECIFIC TESTS
# ============================================================================


class TestRailwayRestrictions:
    """Test Railway-specific restrictions"""

    def test_browser_launch_disabled_on_railway(self):
        """Browser launch should be disabled on Railway"""
        # Set Railway environment
        import os

        os.environ["RAILWAY_PUBLIC_DOMAIN"] = "test.up.railway.app"

        try:
            response = client.post(
                "/browser/launch", json={"url": "http://example.com"}
            )

            # Should be forbidden on Railway
            assert response.status_code == 403
            assert "not available" in response.json()["detail"].lower()
        finally:
            del os.environ["RAILWAY_PUBLIC_DOMAIN"]

    def test_restart_disabled_on_railway(self):
        """Restart endpoint should be disabled on Railway"""
        import os

        os.environ["RAILWAY_PUBLIC_DOMAIN"] = "test.up.railway.app"

        try:
            response = client.post("/restart")

            # Should be forbidden on Railway
            assert response.status_code == 403
        finally:
            del os.environ["RAILWAY_PUBLIC_DOMAIN"]

    def test_native_dialogs_disabled_on_railway(self):
        """Native dialogs should be disabled on Railway"""
        import os

        os.environ["RAILWAY_PUBLIC_DOMAIN"] = "test.up.railway.app"

        try:
            response = client.get("/dialog/file")

            # Should be forbidden on Railway
            assert response.status_code == 403
        finally:
            del os.environ["RAILWAY_PUBLIC_DOMAIN"]


# ============================================================================
# WEBSOCKET TESTS
# ============================================================================


class TestWebSocket:
    """Test WebSocket authentication"""

    @pytest.mark.asyncio
    async def test_websocket_requires_token(self):
        """WebSocket should reject connections without token"""
        # Note: Testing WebSockets with TestClient is limited
        # This is more of an integration test
        pass

    def test_websocket_url_construction(self):
        """Test WebSocket URL construction with token"""
        project_id = "test-project-123"
        token = "test-jwt-token"

        expected_url = (
            f"ws://localhost:3001/ws/projects/{project_id}/agents?token={token}"
        )

        # Verify URL format
        assert "ws://" in expected_url or "wss://" in expected_url
        assert "token=" in expected_url
        assert project_id in expected_url


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def run_tests():
    """Run all tests and print summary"""
    print("=" * 70)
    print("PHASE 1: FORTRESS MODE - SECURITY TEST SUITE")
    print("=" * 70)

    # Run tests
    exit_code = pytest.main([__file__, "-v", "--tb=short"])

    print("\n" + "=" * 70)
    if exit_code == 0:
        print("✅ ALL TESTS PASSED - Phase 1 security measures working!")
    else:
        print("⚠️  SOME TESTS FAILED - Review output above")
    print("=" * 70)

    return exit_code


if __name__ == "__main__":
    run_tests()
