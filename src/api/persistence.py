"""
Data Persistence Layer for MultiMinutes AI
JSON-based storage with repository pattern
"""
import json
import os
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import uuid

# Storage paths
DATA_DIR = "data"
MEETINGS_FILE = os.path.join(DATA_DIR, "meetings.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
TRANSCRIPTS_FILE = os.path.join(DATA_DIR, "transcripts.json")
CHAT_HISTORY_FILE = os.path.join(DATA_DIR, "chat_history.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

class Meeting(BaseModel):
    id: str
    title: str
    date: str
    time: str
    duration: str
    participants: List[str]
    location: str
    status: str  # "scheduled", "in_progress", "completed", "cancelled"
    created_at: datetime
    updated_at: datetime
    transcript_id: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    action_items: Optional[List[Dict[str, Any]]] = None
    cost: Optional[float] = None
    provider: Optional[str] = None

class User(BaseModel):
    id: str
    username: str
    email: str
    role: str  # "admin", "manager", "staff"
    created_at: datetime
    last_login: Optional[datetime] = None
    is_active: bool = True

class Transcript(BaseModel):
    id: str
    meeting_id: str
    content: str
    speakers: List[str]
    duration: float
    word_count: int
    created_at: datetime
    processed_at: Optional[datetime] = None
    der_score: Optional[float] = None
    bleu_score: Optional[float] = None
    wer_score: Optional[float] = None

class ChatMessage(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    message: str
    response: str
    timestamp: datetime
    sources: List[str] = []

class JSONRepository:
    """Generic JSON repository with CRUD operations"""
    
    def __init__(self, file_path: str, model_class: type):
        self.file_path = file_path
        self.model_class = model_class
        self._data = []
        self._load_data()
    
    def _load_data(self):
        """Load data from JSON file"""
        try:
            if os.path.exists(self.file_path):
                with open(self.file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._data = [self.model_class(**item) for item in data]
            else:
                self._data = []
        except Exception as e:
            print(f"Error loading data from {self.file_path}: {e}")
            self._data = []
    
    def _save_data(self):
        """Save data to JSON file"""
        try:
            # Create backup
            if os.path.exists(self.file_path):
                backup_path = f"{self.file_path}.backup"
                os.rename(self.file_path, backup_path)
            
            # Save current data
            with open(self.file_path, 'w', encoding='utf-8') as f:
                data = [item.dict() for item in self._data]
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                
        except Exception as e:
            print(f"Error saving data to {self.file_path}: {e}")
            # Restore backup if exists
            backup_path = f"{self.file_path}.backup"
            if os.path.exists(backup_path):
                os.rename(backup_path, self.file_path)
    
    def create(self, item: BaseModel) -> BaseModel:
        """Create new item"""
        self._data.append(item)
        self._save_data()
        return item
    
    def get_by_id(self, item_id: str) -> Optional[BaseModel]:
        """Get item by ID"""
        for item in self._data:
            if hasattr(item, 'id') and item.id == item_id:
                return item
        return None
    
    def get_all(self) -> List[BaseModel]:
        """Get all items"""
        return self._data.copy()
    
    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[BaseModel]:
        """Update item"""
        for i, item in enumerate(self._data):
            if hasattr(item, 'id') and item.id == item_id:
                # Update fields
                for key, value in updates.items():
                    if hasattr(item, key):
                        setattr(item, key, value)
                
                # Update timestamp if exists
                if hasattr(item, 'updated_at'):
                    item.updated_at = datetime.now()
                
                self._save_data()
                return item
        return None
    
    def delete(self, item_id: str) -> bool:
        """Delete item"""
        for i, item in enumerate(self._data):
            if hasattr(item, 'id') and item.id == item_id:
                del self._data[i]
                self._save_data()
                return True
        return False
    
    def filter(self, **kwargs) -> List[BaseModel]:
        """Filter items by attributes"""
        result = []
        for item in self._data:
            match = True
            for key, value in kwargs.items():
                if hasattr(item, key):
                    item_value = getattr(item, key)
                    if isinstance(value, (list, tuple)):
                        if item_value not in value:
                            match = False
                            break
                    elif item_value != value:
                        match = False
                        break
                else:
                    match = False
                    break
            if match:
                result.append(item)
        return result

# Repository instances
meeting_repo = JSONRepository(MEETINGS_FILE, Meeting)
user_repo = JSONRepository(USERS_FILE, User)
transcript_repo = JSONRepository(TRANSCRIPTS_FILE, Transcript)
chat_repo = JSONRepository(CHAT_HISTORY_FILE, ChatMessage)

# Initialize with sample data if empty
def initialize_sample_data():
    """Initialize with sample data if repositories are empty"""
    
    # Sample users
    if not user_repo.get_all():
        users = [
            User(
                id="user-1",
                username="admin",
                email="admin@multiminutes.ai",
                role="admin",
                created_at=datetime.now()
            ),
            User(
                id="user-2",
                username="manager",
                email="manager@multiminutes.ai",
                role="manager",
                created_at=datetime.now()
            ),
            User(
                id="user-3",
                username="staff",
                email="staff@multiminutes.ai",
                role="staff",
                created_at=datetime.now()
            )
        ]
        for user in users:
            user_repo.create(user)
    
    # Sample meetings
    if not meeting_repo.get_all():
        meetings = [
            Meeting(
                id="meeting-1",
                title="Daily Standup - Project MultiMinutes AI",
                date="08/04/2026",
                time="09:00 - 09:15",
                duration="15 minutes",
                participants=["Admin", "Team Lead", "Developer", "QA Engineer"],
                location="Virtual Meeting",
                status="completed",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                cost=0.008,
                provider="google",
                summary={
                    "key_points": [
                        "Dashboard và login cơ bản đã hoàn thành",
                        "Backend API ổn định với Google Gemini integration",
                        "Cần cải thiện performance cho audio file lớn",
                        "Frontend team cần support cho export feature"
                    ],
                    "decisions": [
                        "Developer support frontend cho export feature",
                        "Team Lead tập trung vào chat integration",
                        "QA prepare test cases cho new features",
                        "Sync lại lúc 3 chiều"
                    ]
                },
                action_items=[
                    {"task": "Hoàn thiện Meeting Detail page functionality", "owner": "Developer", "deadline": "Hôm nay", "status": "Pending"},
                    {"task": "Tích hợp chat với Google Gemini", "owner": "Team Lead", "deadline": "Hôm nay", "status": "In Progress"},
                    {"task": "Prepare test cases cho export và chat features", "owner": "QA Engineer", "deadline": "Hôm nay", "status": "Pending"},
                    {"task": "Phân công lại tasks cho export feature", "owner": "Admin", "deadline": "Hoàn thành", "status": "Completed"}
                ]
            ),
            Meeting(
                id="meeting-2",
                title="Sprint Planning - Q2 2026",
                date="07/04/2026",
                time="14:00 - 15:30",
                duration="90 minutes",
                participants=["Admin", "Team Lead", "Developer", "QA Engineer", "Product Manager"],
                location="Conference Room A",
                status="completed",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                cost=0.045,
                provider="google"
            ),
            Meeting(
                id="meeting-3",
                title="Client Review - Product Demo",
                date="06/04/2026",
                time="10:00 - 11:00",
                duration="60 minutes",
                participants=["Admin", "Team Lead", "Client Representative"],
                location="Virtual Meeting",
                status="completed",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                cost=0.032,
                provider="openai"
            )
        ]
        for meeting in meetings:
            meeting_repo.create(meeting)
    
    # Sample transcripts
    if not transcript_repo.get_all():
        transcripts = [
            Transcript(
                id="transcript-1",
                meeting_id="meeting-1",
                content="Admin (09:00:12): Chào mọi người, bắt đầu daily standup nhé...",
                speakers=["Admin", "Team Lead", "Developer", "QA Engineer"],
                duration=900.0,
                word_count=2450,
                created_at=datetime.now(),
                processed_at=datetime.now(),
                der_score=12.3,
                bleu_score=0.72,
                wer_score=8.5
            )
        ]
        for transcript in transcripts:
            transcript_repo.create(transcript)

# Initialize sample data
initialize_sample_data()

# Export repository instances for use in other modules
__all__ = [
    'meeting_repo',
    'user_repo', 
    'transcript_repo',
    'chat_repo',
    'Meeting',
    'User',
    'Transcript',
    'ChatMessage',
    'initialize_sample_data'
]
