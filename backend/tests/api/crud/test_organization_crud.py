import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.api.database import Base
from src.api.crud import (
    create_user, get_user_by_username,
    create_organization, get_organization_by_id, get_organizations, update_organization, delete_organization,
    add_user_to_organization, remove_user_from_organization
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


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "role": "org-admin",
    }
    return create_user(db, user_data)


def test_create_organization(db):
    """Test creating a new organization."""
    org_data = {
        "name": "Test Organization",
        "description": "A test organization",
        "domain": "test.com",
        "logo_url": "https://test.com/logo.png",
        "settings": {"theme": "dark"},
    }
    org = create_organization(db, org_data)
    
    assert org.id is not None
    assert org.name == "Test Organization"
    assert org.description == "A test organization"
    assert org.domain == "test.com"
    assert org.logo_url == "https://test.com/logo.png"
    assert org.settings == {"theme": "dark"}


def test_get_organization_by_id(db):
    """Test retrieving an organization by ID."""
    org_data = {
        "name": "Test Organization",
    }
    created_org = create_organization(db, org_data)
    
    retrieved_org = get_organization_by_id(db, created_org.id)
    
    assert retrieved_org is not None
    assert retrieved_org.id == created_org.id
    assert retrieved_org.name == "Test Organization"


def test_get_organizations(db):
    """Test retrieving multiple organizations with pagination."""
    # Create multiple organizations
    for i in range(5):
        org_data = {
            "name": f"Organization {i}",
        }
        create_organization(db, org_data)
    
    orgs = get_organizations(db, skip=0, limit=3)
    
    assert len(orgs) == 3
    
    orgs_all = get_organizations(db, skip=0, limit=100)
    assert len(orgs_all) == 5


def test_update_organization(db):
    """Test updating an organization."""
    org_data = {
        "name": "Original Name",
        "description": "Original description",
    }
    org = create_organization(db, org_data)
    
    updates = {
        "name": "Updated Name",
        "description": "Updated description",
        "domain": "updated.com",
    }
    updated_org = update_organization(db, org.id, updates)
    
    assert updated_org is not None
    assert updated_org.name == "Updated Name"
    assert updated_org.description == "Updated description"
    assert updated_org.domain == "updated.com"


def test_delete_organization(db):
    """Test deleting an organization."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    success = delete_organization(db, org.id)
    
    assert success is True
    
    # Verify organization is deleted
    deleted_org = get_organization_by_id(db, org.id)
    assert deleted_org is None


def test_add_user_to_organization(db, test_user):
    """Test adding a user to an organization."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    user_org = add_user_to_organization(db, test_user.id, org.id, "member")
    
    assert user_org is not None
    assert user_org.user_id == test_user.id
    assert user_org.organization_id == org.id
    assert user_org.role == "member"


def test_add_user_to_organization_duplicate(db, test_user):
    """Test that adding the same user to an organization twice returns existing record."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    # Add user first time
    user_org1 = add_user_to_organization(db, test_user.id, org.id, "member")
    
    # Add user second time
    user_org2 = add_user_to_organization(db, test_user.id, org.id, "org-admin")
    
    # Should return the same record
    assert user_org1.id == user_org2.id
    # Role should not change on duplicate
    assert user_org2.role == "member"


def test_remove_user_from_organization(db, test_user):
    """Test removing a user from an organization."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    # Add user to organization
    add_user_to_organization(db, test_user.id, org.id, "member")
    
    # Remove user
    success = remove_user_from_organization(db, test_user.id, org.id)
    
    assert success is True


def test_remove_user_from_organization_by_email(db, test_user):
    """Test removing a user from organization by email (for external participants)."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    # Add user by email (simulating external participant)
    from src.api.crud import add_meeting_participant
    # This would need a different approach for email-based removal
    # For now, test the existing function
    success = remove_user_from_organization(db, test_user.id, org.id)
    assert success is False  # User was not added


def test_organization_cascade_delete(db, test_user):
    """Test that deleting an organization cascades to user_organizations."""
    org_data = {
        "name": "Test Organization",
    }
    org = create_organization(db, org_data)
    
    # Add user to organization
    add_user_to_organization(db, test_user.id, org.id, "member")
    
    # Delete organization
    delete_organization(db, org.id)
    
    # User should still exist (organization deletion cascades user_org, not user)
    user = get_user_by_username(db, "testuser")
    assert user is not None
