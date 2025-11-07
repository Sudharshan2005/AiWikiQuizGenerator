import os
import json
import re
from models import QuizOutput
import requests

class QuizGenerator:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        
    def generate_quiz(self, article_text: str) -> QuizOutput:
        """Generate quiz from article text using Gemini REST API"""
        
        prompt = self._build_prompt(article_text)
        
        try:
            # Use direct REST API call instead of Google AI SDK
            response = self._make_api_call(prompt)
            quiz_data = self._parse_response(response)
            return QuizOutput(**quiz_data)
            
        except Exception as e:
            print(f"Quiz generation error: {e}")
            return self._get_fallback_quiz()
    
    def _build_prompt(self, article_text: str) -> str:
        return f"""
        You are an expert educational content creator. Create a comprehensive quiz based on the following Wikipedia article content.
        
        ARTICLE CONTENT:
        {article_text[:8000]}
        
        IMPORTANT INSTRUCTIONS:
        1. Generate 5-8 high-quality quiz questions that test understanding of key concepts
        2. Questions should be factual and directly based on the provided content
        3. Each question must have exactly 4 options labeled A, B, C, D
        4. Provide the correct answer as JUST THE LETTER (A, B, C, or D) - NOT the full text
        5. Assign appropriate difficulty levels (easy, medium, hard)
        6. Provide a brief explanation for each answer
        7. Extract key entities (people, organizations, locations)
        8. Identify main sections of the article
        9. Suggest 3-5 related Wikipedia topics for further reading
        
        CRITICAL: The "answer" field must contain ONLY the letter (A, B, C, or D), not the full option text.
        
        Return the response in this exact JSON format:
        {{
            "summary": "Concise summary of the article",
            "key_entities": {{
                "people": ["list", "of", "people"],
                "organizations": ["list", "of", "organizations"], 
                "locations": ["list", "of", "locations"]
            }},
            "sections": ["list", "of", "main", "sections"],
            "quiz": [
                {{
                    "question": "Question text?",
                    "options": [
                        "A) Option A text",
                        "B) Option B text", 
                        "C) Option C text",
                        "D) Option D text"
                    ],
                    "answer": "A",  # MUST BE JUST THE LETTER A, B, C, or D
                    "difficulty": "easy",
                    "explanation": "Brief explanation of why this is correct"
                }}
            ],
            "related_topics": ["topic1", "topic2", "topic3"]
        }}
        
        Make sure the response is valid JSON that can be parsed directly.
        """
    
    def _make_api_call(self, prompt: str) -> dict:
        """Make direct REST API call to Gemini"""
        url = f"{self.base_url}?key={self.api_key}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            }
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        return response.json()
    
    def _parse_response(self, api_response: dict) -> dict:
        """Parse the API response and extract quiz data"""
        try:
            response_text = api_response["candidates"][0]["content"]["parts"][0]["text"]
            
            # Clean the response - remove markdown code blocks if present
            response_text = re.sub(r'```json\s*', '', response_text)
            response_text = re.sub(r'\s*```', '', response_text)
            response_text = response_text.strip()
            
            # Parse JSON response
            quiz_data = json.loads(response_text)
            
            # Validate that answers are just letters
            for question in quiz_data.get('quiz', []):
                if 'answer' in question:
                    # Ensure answer is just a letter
                    answer = str(question['answer']).strip().upper()
                    if len(answer) == 1 and answer in ['A', 'B', 'C', 'D']:
                        question['answer'] = answer
                    else:
                        # Extract first character if it's a letter
                        match = re.match(r'^([A-D])', answer)
                        if match:
                            question['answer'] = match.group(1)
                        else:
                            # Default to A if invalid
                            question['answer'] = 'A'
            
            return quiz_data
            
        except (KeyError, json.JSONDecodeError) as e:
            print(f"Error parsing API response: {e}")
            raise
    
    def _get_fallback_quiz(self) -> QuizOutput:
        """Return a fallback quiz when generation fails"""
        return QuizOutput(
            summary="Failed to generate summary due to API error",
            key_entities={
                "people": [],
                "organizations": [], 
                "locations": []
            },
            sections=[],
            quiz=[
                {
                    "question": "What is the main topic of this article?",
                    "options": [
                        "A) The content is not available",
                        "B) Please try generating the quiz again", 
                        "C) There was an error processing the article",
                        "D) The AI service is temporarily unavailable"
                    ],
                    "answer": "B",
                    "difficulty": "easy",
                    "explanation": "There was an issue generating the quiz. Please try again."
                }
            ],
            related_topics=[]
        )