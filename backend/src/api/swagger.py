"""
Swagger/OpenAPI Documentation Configuration for MultiMinutes AI
"""

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from typing import Dict

def custom_openapi(app: FastAPI) -> Dict:
    """Custom OpenAPI schema with enhanced documentation"""
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="CONVIA API",
        version="1.0.0",
        description="""
## CONVIA API Documentation

Hệ thống API cho CONVIA - Hệ thống Ghi Biên Bản & Tổng Hợp Nội Dung Cuộc Họp bằng AI.

### Features
- **Speech-to-Text**: Chuyển đổi giọng nói thành văn bản với OpenAI Whisper
- **Diarization**: Phân biệt người nói với pyannote.audio
- **AI Chat**: Tích hợp Google Gemini cho chat với cuộc họp
- **Export**: Xuất biên bản sang PDF và DOCX
- **Notifications**: Hệ thống thông báo qua email
- **Cost Tracking**: Theo dõi chi phí sử dụng API AI

### Authentication
Hiện tại sử dụng mock authentication. Trong production sẽ sử dụng JWT tokens.

### Rate Limiting
- 100 requests/minute per user
- 1000 requests/minute per organization

### Error Codes
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error
        """,
        routes=app.routes,
    )
    
    # Custom OpenAPI extensions
    openapi_schema["info"]["x-logo"] = {
        "url": "/brand/convia-logo.svg",
        "altText": "CONVIA Logo"
    }
    
    openapi_schema["info"]["contact"] = {
        "name": "CONVIA Team",
        "email": "support@multiminutes.ai",
        "url": "https://multiminutes.ai"
    }
    
    openapi_schema["info"]["license"] = {
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    }
    
    # Add servers
    openapi_schema["servers"] = [
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.multiminutes.ai",
            "description": "Production server"
        }
    ]
    
    # Add tags
    openapi_schema["tags"] = [
        {
            "name": "Authentication",
            "description": "Authentication and authorization endpoints"
        },
        {
            "name": "Meetings",
            "description": "Meeting management endpoints"
        },
        {
            "name": "Chat",
            "description": "AI chat with meeting content"
        },
        {
            "name": "Export",
            "description": "Export meeting minutes to various formats"
        },
        {
            "name": "Notifications",
            "description": "Email notification endpoints"
        },
        {
            "name": "Analytics",
            "description": "Analytics and reporting endpoints"
        },
        {
            "name": "Upload",
            "description": "Audio upload and processing endpoints"
        },
        {
            "name": "Health",
            "description": "Health check and system status"
        }
    ]
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT token authentication"
        },
        "ApiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API key authentication"
        }
    }
    
    # Add security requirements
    openapi_schema["security"] = [
        {"BearerAuth": []},
        {"ApiKeyAuth": []}
    ]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Example usage in main.py:
# from src.api.swagger import custom_openapi
# app.openapi = lambda: custom_openapi(app)
