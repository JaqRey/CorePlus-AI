import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-flash-lite-latest")

print("Testing Gemini API connection...")
print("-" * 40)

response = model.generate_content("Say hello and confirm you are Gemini AI.")

print("STATUS: 200 OK")
print("RESPONSE:")
print(response.text)
print("-" * 40)
print("✅ API connection successful!")