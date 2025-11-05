import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser
from models import QuizOutput
from dotenv import load_dotenv
import re, json
from pydantic import ValidationError

load_dotenv()

class QuizGenerator:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found.")
        
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
            temperature=0.7
        )
        self.parser = PydanticOutputParser(pydantic_object=QuizOutput)
        
        self.prompt_template = PromptTemplate(
            template="""
You are an expert educational content creator. Your task is to generate a quiz from a Wikipedia article.

ARTICLE CONTENT:
{article_text}

Follow these exact steps:
1. Write a 3-5 sentence summary of the article.
2. Extract key entities (people, organizations, locations).
3. Identify main sections of the article.
4. Create 5–10 quiz questions, each with 4 options (A, B, C, D) and one correct answer.
5. Suggest 3–5 related Wikipedia topics for further reading.
6. Difficulty levels: easy, medium, hard.
7. All output MUST be in valid JSON only — no Markdown, no text outside JSON.

Output Format:
{format_instructions}
""",
            input_variables=["article_text"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()},
        )
        
        self.chain = self.prompt_template | self.llm | self.parser

    def generate_quiz(self, article_text: str) -> QuizOutput:
        try:
            raw_output = self.llm.invoke(self.prompt_template.format(article_text=article_text))
            text = raw_output.content if hasattr(raw_output, "content") else str(raw_output)

            text = re.sub(r"^```json\s*|\s*```$", "", text.strip(), flags=re.DOTALL)

            text = text.replace("\n", " ").replace("“", "\"").replace("”", "\"")
            text = re.sub(r'(?<!\\)"([A-Za-z0-9 ,\.\'“”\-]*)"(?![:,}\]])', r'"\1"', text)

            try:
                data = json.loads(text)
            except json.JSONDecodeError as err:
                fixed_text = re.sub(r'(["\'])(?:(?=(\\?))\2.)*?\1', lambda m: m.group(0).replace('"', '\\"'), text)
                data = json.loads(fixed_text)

            result = QuizOutput(**data)

            return result

        except (ValidationError, json.JSONDecodeError) as e:
            return QuizOutput(
                summary="Failed to generate summary",
                key_entities={},
                sections=[],
                quiz=[],
                related_topics=[]
            )
        except Exception as e:
            return QuizOutput(
                summary="Failed to generate summary",
                key_entities={},
                sections=[],
                quiz=[],
                related_topics=[]
            )