import os
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_GENERATION_MODEL", "gemini-3.8-flash")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing.")

client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(
        timeout=30000,
        retry_options=types.HttpRetryOptions(attempts=1),
    ),
)

print(f"Testing model: {MODEL}", flush=True)

start = time.monotonic()

try:
    response = client.models.generate_content(
        model=MODEL,
        contents="What is a black kite? Answer in one sentence.",
        config=types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=150,
        ),
    )

    elapsed = time.monotonic() - start

    print(f"\nResponse time: {elapsed:.2f} seconds")
    print(f"Response: {response.text}")

except Exception as error:
    elapsed = time.monotonic() - start

    print(f"\nFailed after {elapsed:.2f} seconds")
    print(f"Error type: {type(error).__name__}")
    print(f"Error: {error}")

finally:
    client.close()