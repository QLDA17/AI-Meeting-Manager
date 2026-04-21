# Database Standards for MUTI_AI

## Model Example
```python
class NewModel(Base):
    __tablename__ = "new_table"
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

## Migration
Hiện tại dự án đang dùng `Base.metadata.create_all(bind=engine)` trong `main.py`. Khi scale, sẽ cần tích hợp Alembic.
