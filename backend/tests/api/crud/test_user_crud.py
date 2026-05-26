import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.api.database import Base
from src.api.crud import (
    get_user_by_id, get_user_by_username, get_user_by_email,
    get_users, create_user, update_user, delete_user
)

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_create_user(db):
    """Test creating a new user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
        "role": "member",
        "first_name": "Test",
        "last_name": "User",
    }
    user = create_user(db, user_data)
    
    assert user.id is not None
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.role == "member"
    assert user.first_name == "Test"
    assert user.last_name == "User"
    assert user.is_active is True
    assert user.is_verified is False


def test_get_user_by_id(db):
    """Test retrieving a user by ID."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    }
    created_user = create_user(db, user_data)
    
    retrieved_user = get_user_by_id(db, created_user.id)
    
    assert retrieved_user is not None
    assert retrieved_user.id == created_user.id
    assert retrieved_user.username == "testuser"


def test_get_user_by_username(db):
    """Test retrieving a user by username."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    }
    create_user(db, user_data)
    
    retrieved_user = get_user_by_username(db, "testuser")
    
    assert retrieved_user is not None
    assert retrieved_user.username == "testuser"


def test_get_user_by_email(db):
    """Test retrieving a user by email."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    }
    create_user(db, user_data)
    
    retrieved_user = get_user_by_email(db, "test@example.com")
    
    assert retrieved_user is not None
    assert retrieved_user.email == "test@example.com"


def test_get_users(db):
    """Test retrieving multiple users with pagination."""
    # Create multiple users
    for i in range(5):
        user_data = {
            "username": f"user{i}",
            "email": f"user{i}@example.com",
            "password": "password123",
        }
        create_user(db, user_data)
    
    users = get_users(db, skip=0, limit=3)
    
    assert len(users) == 3
    
    users_all = get_users(db, skip=0, limit=100)
    assert len(users_all) == 5


def test_update_user(db):
    """Test updating a user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    }
    user = create_user(db, user_data)
    
    updates = {
        "first_name": "Updated",
        "last_name": "Name",
        "is_active": False,
    }
    updated_user = update_user(db, user.id, updates)
    
    assert updated_user is not None
    assert updated_user.first_name == "Updated"
    assert updated_user.last_name == "Name"
    assert updated_user.is_active is False


def test_update_user_password(db):
    """Test updating user password."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "oldpassword",
    }
    user = create_user(db, user_data)
    old_hash = user.password_hash
    
    updates = {"password": "newpassword123"}
    updated_user = update_user(db, user.id, updates)
    
    assert updated_user is not None
    assert updated_user.password_hash != old_hash


def test_delete_user(db):
    """Test deleting a user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "securepassword123",
    }
    user = create_user(db, user_data)
    
    success = delete_user(db, user.id)
    
    assert success is True
    
    # Verify user is deleted
    deleted_user = get_user_by_id(db, user.id)
    assert deleted_user is None


def test_delete_nonexistent_user(db):
    """Test deleting a non-existent user."""
    success = delete_user(db, "nonexistent-id")
    assert success is False


def test_update_nonexistent_user(db):
    """Test updating a non-existent user."""
    updates = {"first_name": "Updated"}
    updated_user = update_user(db, "nonexistent-id", updates)
    assert updated_user is None
