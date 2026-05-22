from fastapi import APIRouter

from src.api import _legacy_runtime as legacy

router = APIRouter(tags=["system"])

router.add_api_route("/health", legacy.health, methods=["GET"])
router.add_api_route("/healthz", legacy.healthz, methods=["GET"])
router.add_api_route("/metrics", legacy.metrics, methods=["GET"])
