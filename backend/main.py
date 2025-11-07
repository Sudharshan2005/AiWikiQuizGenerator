from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import models
import schemas
from database import get_db, Quiz, QuizAttempt
from scraper import scrape_wikipedia, validate_wikipedia_url
from llm_quiz_generator import QuizGenerator
import json
import uuid
from datetime import datetime

app = FastAPI(title="AI Wiki Quiz Generator", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

quiz_generator = QuizGenerator()

def get_user_session(request: Request, response: Response):
    """Get or create user session ID and set cookie"""
    session_id = request.cookies.get("quiz_session_id")
    if not session_id:
        session_id = str(uuid.uuid4())
        # Set cookie for 30 days
        response.set_cookie(
            key="quiz_session_id",
            value=session_id,
            max_age=30*24*60*60,
            httponly=True,
            samesite="lax"
        )
    return session_id

@app.get("/")
def read_root():
    return {"message": "AI Wiki Quiz Generator API"}

@app.post("/generate-quiz", response_model=schemas.QuizResponse)
def generate_quiz(quiz_request: schemas.QuizRequest, db: Session = Depends(get_db)):
    # Validate URL
    if not validate_wikipedia_url(quiz_request.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Wikipedia URL"
        )
    
    # Check if URL already exists in database
    existing_quiz = db.query(Quiz).filter(Quiz.url == quiz_request.url).first()
    if existing_quiz:
        return {
            "id": existing_quiz.id,
            "url": existing_quiz.url,
            "title": existing_quiz.title,
            **existing_quiz.get_quiz_data()
        }
    
    # Scrape Wikipedia
    article_text, title = scrape_wikipedia(quiz_request.url)
    if not article_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to scrape Wikipedia article"
        )
    
    # Generate quiz using LLM
    quiz_data = quiz_generator.generate_quiz(article_text)
    
    # Save to database
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

@app.post("/quizzes/{quiz_id}/attempt", response_model=schemas.QuizAttemptResponse)
def submit_quiz_attempt(
    quiz_id: int,
    attempt_data: schemas.QuizAttemptCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    # Get user session
    user_session = get_user_session(request, response)
    
    # Get quiz
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    # Calculate score - FIXED: Handle both letter answers and full text answers
    quiz_data = quiz.get_quiz_data()
    quiz_questions = quiz_data.get('quiz', [])
    correct_answers = 0
    user_answers = attempt_data.answers
    
    def is_answer_correct(user_answer, correct_answer, options):
        if not user_answer or not correct_answer:
            return False
        
        # If correct_answer is just a letter (A, B, C, D), check first character of user_answer
        if len(correct_answer.strip()) == 1 and correct_answer.strip().upper() in ['A', 'B', 'C', 'D']:
            user_first_char = user_answer.strip()[0].upper() if user_answer else ''
            return user_first_char == correct_answer.strip().upper()
        
        # If correct_answer is full text, compare directly
        return user_answer.strip() == correct_answer.strip()
    
    for i, question in enumerate(quiz_questions):
        if i < len(user_answers):
            user_answer = user_answers[i]
            correct_answer = question['answer']
            options = question.get('options', [])
            
            if is_answer_correct(user_answer, correct_answer, options):
                correct_answers += 1
    
    total_questions = len(quiz_questions)
    score_percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
    
    # Save attempt
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_session=user_session,
        score=score_percentage,
        correct_answers=correct_answers,
        total_questions=total_questions,
        user_answers=user_answers,
        time_taken=attempt_data.time_taken
    )
    
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    
    return {
        "id": attempt.id,
        "score": score_percentage,
        "correct_answers": correct_answers,
        "total_questions": total_questions,
        "time_taken": attempt.time_taken,
        "date_attempted": attempt.date_attempted,
        "answers": user_answers
    }

@app.get("/quizzes/{quiz_id}/attempts", response_model=List[schemas.QuizAttemptResponse])
def get_quiz_attempts(
    quiz_id: int,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    user_session = get_user_session(request, response)
    print(f"🔍 Getting attempts for quiz {quiz_id}, user session: {user_session}")
    
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_session == user_session
    ).order_by(QuizAttempt.date_attempted.desc()).all()
    
    print(f"📊 Found {len(attempts)} attempts")
    
    result = []
    for attempt in attempts:
        # Ensure user_answers is properly formatted as list
        user_answers = attempt.user_answers
        if isinstance(user_answers, str):
            try:
                user_answers = json.loads(user_answers)
            except json.JSONDecodeError:
                user_answers = []
        elif not isinstance(user_answers, list):
            user_answers = []
        
        result.append({
            "id": attempt.id,
            "score": float(attempt.score),  # Ensure it's float
            "correct_answers": attempt.correct_answers,
            "total_questions": attempt.total_questions,
            "time_taken": attempt.time_taken,
            "date_attempted": attempt.date_attempted,
            "answers": user_answers
        })
    
    print(f"📤 Returning {len(result)} attempts")
    return result

@app.get("/quizzes", response_model=List[schemas.QuizHistory])
def get_quiz_history(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).order_by(Quiz.date_generated.desc()).all()
    result = []
    
    for quiz in quizzes:
        # Count attempts for this quiz (all users)
        attempts_count = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz.id).count()
        
        result.append({
            "id": quiz.id,
            "url": quiz.url,
            "title": quiz.title,
            "date_generated": quiz.date_generated,
            "attempts_count": attempts_count,
            "best_score": None  # We'll calculate this per user in frontend if needed
        })
    
    return result

@app.get("/quizzes/{quiz_id}", response_model=schemas.QuizResponse)
def get_quiz(quiz_id: int, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found"
        )
    
    quiz_data = quiz.get_quiz_data()
    return {
        "id": quiz.id,
        "url": quiz.url,
        "title": quiz.title,
        "summary": quiz_data.get('summary', ''),
        "key_entities": quiz_data.get('key_entities', {}),
        "sections": quiz_data.get('sections', []),
        "quiz": quiz_data.get('quiz', []),
        "related_topics": quiz_data.get('related_topics', [])
    }

# Add health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is running"}

# Add endpoint to list all available endpoints
@app.get("/endpoints")
def list_endpoints():
    endpoints = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            endpoints.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return endpoints