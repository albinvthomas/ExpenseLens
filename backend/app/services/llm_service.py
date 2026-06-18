import os
from google import genai
from app.core.config import settings
from dotenv import load_dotenv

load_dotenv()

def get_gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

async def generate_financial_advice(category: str, allocated: float, spent: float, overage: float) -> str:
    client = get_gemini_client()
    if not client:
        return "AI Advisor is currently unavailable. Please ensure your GEMINI_API_KEY is configured."

    prompt = f"""
    You are an expert financial advisor for ExpenseLens, a personal finance app.
    The user has overspent on the '{category}' category this month.
    Allocated: ₹{allocated}
    Actual Spend: ₹{spent}
    Overage: ₹{overage}

    Provide 2 specific, actionable, and non-generic tips to help the user reduce their spending in this category next month.
    Keep the tone encouraging but firm. Do NOT use markdown headers, just return a short paragraph or bullet points. Maximum 3-4 sentences.
    """

    try:
        # In genai SDK, standard chat generation uses generate_content
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Error generating advice: {e}")
        return "We noticed you overspent in this category. Try to review your recent purchases to find areas to cut back next month."
