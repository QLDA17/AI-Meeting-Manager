# FastAPI Patterns for MUTI_AI

## Router Template
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from src.api.database import get_db
from src.api.auth import get_current_user
from src.api import crud, models

router = APIRouter(prefix="/feature", tags=["feature"])

@router.get("/", response_model=List[FeatureOut])
def read_features(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return crud.get_features(db, skip=skip, limit=limit)
```

## Dependency Injection
Luôn sử dụng `Depends(get_db)` để quản lý session database và `Depends(get_current_user)` để bảo mật endpoint.
