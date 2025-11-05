from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import get_db, Quiz
from scraper import scrape_wikipedia, validate_wikipedia_url
from llm_quiz_generator import QuizGenerator
import json

app = FastAPI(title="AI Wiki Quiz Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

quiz_generator = QuizGenerator()

@app.get("/")
def read_root():
    return {"message": "AI Wiki Quiz Generator API"}

@app.post("/generate-quiz", response_model=schemas.QuizResponse)
def generate_quiz(quiz_request: schemas.QuizRequest, db: Session = Depends(get_db)):
    if not validate_wikipedia_url(quiz_request.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Wikipedia URL"
        )
    
    existing_quiz = db.query(Quiz).filter(Quiz.url == quiz_request.url).first()
    if existing_quiz:
        return {
            "id": existing_quiz.id,
            "url": existing_quiz.url,
            "title": existing_quiz.title,
            **existing_quiz.get_quiz_data()
        }
    
    article_text, title = scrape_wikipedia(quiz_request.url)
    if not article_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to scrape Wikipedia article"
        )
    
    quiz_data = quiz_generator.generate_quiz(article_text)
    
    db_quiz = Quiz(
        url=quiz_request.url,
        title=title or "Unknown Title",
        scraped_content=article_text
    )
    db_quiz.set_quiz_data(quiz_data.dict())
    
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    
    return {
        "id": db_quiz.id,
        "url": db_quiz.url,
        "title": db_quiz.title,
        **quiz_data.dict()
    }

@app.get("/quizzes", response_model=List[schemas.QuizHistory])
def get_quiz_history(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).order_by(Quiz.date_generated.desc()).all()
    return [
        {
            "id": quiz.id,
            "url": quiz.url,
            "title": quiz.title,
            "date_generated": quiz.date_generated
        }
        for quiz in quizzes
    ]

@app.get("/quizzes/{quiz_id}", response_model=schemas.QuizResponse)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    return {
        "id": quiz.id,
        "url": quiz.url,
        "title": quiz.title,
        **quiz.get_quiz_data()
    }