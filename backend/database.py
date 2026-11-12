import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv


# --------------------------------------------------
# LOAD ENVIRONMENT VARIABLES
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")


# --------------------------------------------------
# DATABASE CONFIGURATION
# --------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_db_connection():
    """
    Create a PostgreSQL connection using the
    DATABASE_URL stored in backend/.env.

    The caller is responsible for closing
    the connection after use.
    """

    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is missing. "
            "Check backend/.env."
        )

    return psycopg.connect(
        DATABASE_URL,
        connect_timeout=10,
        sslmode="require",
    )