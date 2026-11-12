import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

print("\nAVAILABLE GEMINI GENERATION MODELS\n")

try:
    for model in client.models.list():

        name = model.name

        actions = (
            getattr(model, "supported_actions", None)
            or []
        )

        if (
            "gemini" in name.lower()
            and (
                "generateContent" in actions
                or "generate_content" in actions
            )
        ):
            print(name)

finally:
    client.close()