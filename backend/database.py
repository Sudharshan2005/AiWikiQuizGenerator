import os
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json
from dotenv import load_dotenv

load_dotenv()

# Use Supabase PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    date_generated = Column(DateTime, default=datetime.utcnow)
    scraped_content = Column(Text)
    full_quiz_data = Column(Text)  # JSON stored as text
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")
    
    def set_quiz_data(self, data: dict):
        self.full_quiz_data = json.dumps(data)
    
    def get_quiz_data(self) -> dict:
        return json.loads(self.full_quiz_data) if self.full_quiz_data else {}

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    user_session = Column(String, nullable=False)  # Store session ID or user identifier
    score = Column(Float, nullable=False)  # Percentage score
    correct_answers = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    user_answers = Column(JSON, nullable=False)  # Store user's answers as JSON
    time_taken = Column(Integer, default=0)  # Time taken in seconds
    date_attempted = Column(DateTime, default=datetime.utcnow)
    
    quiz = relationship("Quiz", back_populates="attempts")

# Create tables
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()