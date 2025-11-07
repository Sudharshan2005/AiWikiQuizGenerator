import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json
from dotenv import load_dotenv

load_dotenv()

# Use Supabase PostgreSQL with proper connection settings
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Add connection timeout and retry settings for production
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    date_generated = Column(DateTime, default=datetime.utcnow)
    scraped_content = Column(Text)
    full_quiz_data = Column(Text)
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
    
    def set_quiz_data(self, data: dict):
        self.full_quiz_data = json.dumps(data)
    
    def get_quiz_data(self) -> dict:
        return json.loads(self.full_quiz_data) if self.full_quiz_data else {}

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    user_session = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    correct_answers = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    user_answers = Column(JSON, nullable=False)
    time_taken = Column(Integer, default=0)
    date_attempted = Column(DateTime, default=datetime.utcnow)
    
    quiz = relationship("Quiz", back_populates="attempts")

# Create tables with error handling
try:
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
except Exception as e:
    print(f"⚠️  Database table creation: {e}")
    # Don't raise the exception to allow the app to start
    # The tables might already exist

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        print(f"❌ Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()