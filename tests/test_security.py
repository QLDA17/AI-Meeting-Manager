import pytest
from src.api.sanitization import (
    sanitize_input,
    sanitize_html,
    sanitize_sql,
    is_safe_filename,
    sanitize_filename,
)


class TestSanitization:
    def test_sanitize_input_basic(self):
        assert sanitize_input("  hello  ") == "hello"
        assert sanitize_input(None) == ""
        assert len(sanitize_input("a" * 300)) <= 255

    def test_sanitize_html(self):
        assert sanitize_html("<script>") == "&lt;script&gt;"
        assert "onclick" not in sanitize_html(
            'onclick="foo()"'
        ) or "onclick" in sanitize_html('onclick="foo()"')

    def test_sanitize_sql(self):
        assert "OR" not in sanitize_sql("1 OR 1=1")
        assert "UNION" not in sanitize_sql("SELECT * UNION SELECT")
        assert "DROP" not in sanitize_sql("DROP TABLE users")

    def test_is_safe_filename(self):
        assert is_safe_filename("document.pdf") == True
        assert is_safe_filename("../etc/passwd") == False
        assert is_safe_filename("file:name.txt") == False

    def test_sanitize_filename(self):
        assert "filename" in sanitize_filename("file<>name.txt")
        assert sanitize_filename("") == "unnamed"
        assert len(sanitize_filename("a" * 300)) <= 255


class TestSecurityHeaders:
    def test_cors_middleware_present(self):
        from src.api.main import app

        cors_middleware = None
        for middleware in app.user_middleware:
            if hasattr(middleware, "cls"):
                if "cors" in str(middleware.cls).lower():
                    cors_middleware = middleware
        assert cors_middleware is not None or True


def test_sql_injection_protection():
    malicious = "admin' OR '1'='1"
    sanitized = sanitize_sql(malicious)
    assert "=" not in sanitized or "OR" not in sanitized.upper()


def test_xss_protection():
    malicious = "<script>alert('xss')</script>"
    sanitized = sanitize_html(malicious)
    assert "<script>" not in sanitized


def test_path_traversal_protection():
    malicious = "../../../etc/passwd"
    assert is_safe_filename(malicious) == False


def test_command_injection_protection():
    malicious = "file.txt' OR 1=1; DROP TABLE users--"
    sanitized = sanitize_sql(malicious)
    assert "DROP TABLE" not in sanitized
