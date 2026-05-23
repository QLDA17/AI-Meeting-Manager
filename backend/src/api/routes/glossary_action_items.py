from typing import List, Optional

import csv
import io

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from src.api import auth, schemas
from src.api.core.glossary_action_item_operations import (
    approve_glossary_suggestion_payload,
    create_action_item_payload,
    create_glossary_term_payload,
    delete_action_item_payload,
    delete_glossary_term_payload,
    export_glossary_terms_payload,
    get_glossary_insights_payload,
    import_glossary_terms_payload,
    list_action_items_payload,
    list_glossary_categories_payload,
    list_glossary_suggestions_payload,
    list_glossary_terms_payload,
    merge_glossary_suggestion_payload,
    reject_glossary_suggestion_payload,
    run_glossary_suggestions_payload,
    update_action_item_payload,
    update_glossary_term_payload,
    update_my_action_item_assignment_payload,
)
from src.api.database import get_db

router = APIRouter(tags=["glossary-action-items"])


def _parse_bool(value, default=True):
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def _parse_aliases(value) -> List[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    return [part.strip() for part in str(value or "").split(";") if part.strip()]


@router.get("/api/glossary", response_model=List[schemas.GlossaryTerm])
def list_glossary_terms(
    organization_id: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return list_glossary_terms_payload(organization_id, category, is_active, skip, limit, db, current_user)


@router.get("/api/glossary/categories", response_model=List[str])
def list_glossary_categories(
    organization_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return list_glossary_categories_payload(organization_id, db, current_user)


@router.get("/api/glossary/suggestions", response_model=List[schemas.GlossarySuggestion])
def list_glossary_suggestions(
    organization_id: str,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return list_glossary_suggestions_payload(organization_id, status, skip, limit, db, current_user)


@router.post("/api/glossary/suggestions/run")
def run_glossary_suggestions(
    request: schemas.GlossarySuggestionRunRequest,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return run_glossary_suggestions_payload(request.organization_id, db, current_user)


@router.post("/api/glossary/suggestions/{suggestion_id}/approve", response_model=schemas.GlossaryTerm)
def approve_glossary_suggestion(
    suggestion_id: str,
    request: schemas.GlossarySuggestionApproveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return approve_glossary_suggestion_payload(suggestion_id, request, db, current_user)


@router.post("/api/glossary/suggestions/{suggestion_id}/merge", response_model=schemas.GlossaryTerm)
def merge_glossary_suggestion(
    suggestion_id: str,
    request: schemas.GlossarySuggestionMergeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return merge_glossary_suggestion_payload(suggestion_id, request, db, current_user)


@router.post("/api/glossary/suggestions/{suggestion_id}/reject", response_model=schemas.GlossarySuggestion)
def reject_glossary_suggestion(
    suggestion_id: str,
    request: schemas.GlossarySuggestionRejectRequest,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return reject_glossary_suggestion_payload(suggestion_id, request.organization_id, db, current_user)


@router.get("/api/glossary/insights", response_model=schemas.GlossaryInsightsResponse)
def get_glossary_insights(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return get_glossary_insights_payload(organization_id, db, current_user)


@router.post("/api/glossary", response_model=schemas.GlossaryTerm)
def create_glossary_term(
    term: schemas.GlossaryTermCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return create_glossary_term_payload(term, db, current_user)


@router.post("/api/glossary/import", response_model=schemas.GlossaryImportReport)
async def import_glossary_terms(
    request: Request,
    file: Optional[UploadFile] = File(default=None),
    organization_id: Optional[str] = Form(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    items: List[dict] = []
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        organization_id = organization_id or body.get("organization_id")
        items = body.get("items") or []
    elif file is not None:
        payload = await file.read()
        decoded = payload.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))
        for index, row in enumerate(reader, start=2):
            items.append(
                {
                    "_row": index,
                    "term": row.get("term"),
                    "aliases": _parse_aliases(row.get("aliases")),
                    "category": row.get("category"),
                    "translation_vi": row.get("translation_vi"),
                    "translation_en": row.get("translation_en"),
                    "translation_ja": row.get("translation_ja"),
                    "translation_zh": row.get("translation_zh"),
                    "translation_ko": row.get("translation_ko"),
                    "is_active": _parse_bool(row.get("is_active"), True),
                }
            )
    if not organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required for glossary import")
    return import_glossary_terms_payload(organization_id, items, db, current_user)


@router.get("/api/glossary/export")
def export_glossary_terms(
    organization_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    csv_content = export_glossary_terms_payload(organization_id, db, current_user)
    headers = {"Content-Disposition": f'attachment; filename="glossary-{organization_id}.csv"'}
    return PlainTextResponse(csv_content, headers=headers, media_type="text/csv; charset=utf-8")


@router.patch("/api/glossary/{term_id}", response_model=schemas.GlossaryTerm)
def update_glossary_term(
    term_id: str,
    updates: schemas.GlossaryTermUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return update_glossary_term_payload(term_id, updates, db, current_user)


@router.delete("/api/glossary/{term_id}")
def delete_glossary_term(
    term_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return delete_glossary_term_payload(term_id, db, current_user)


@router.get("/api/action-items", response_model=List[schemas.ActionItem])
def list_action_items(
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
    meeting_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    return list_action_items_payload(db, current_user, meeting_id=meeting_id, status=status, skip=skip, limit=limit)


@router.post("/api/action-items", response_model=schemas.ActionItem)
def create_new_action_item(
    action_item: schemas.ActionItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return create_action_item_payload(action_item, db, current_user)


@router.patch("/api/action-items/{action_id}", response_model=schemas.ActionItem)
def update_existing_action_item(
    action_id: str,
    updates: schemas.ActionItemUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return update_action_item_payload(action_id, updates, db, current_user)


@router.patch("/api/action-items/{action_id}/assignees/me", response_model=schemas.ActionItem)
def update_my_action_item_assignment(
    action_id: str,
    updates: schemas.ActionItemAssigneeStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return update_my_action_item_assignment_payload(action_id, updates, db, current_user)


@router.delete("/api/action-items/{action_id}")
def delete_existing_action_item(
    action_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    return delete_action_item_payload(action_id, db, current_user)
