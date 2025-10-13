# db.py
import sqlite3
from datetime import datetime

DB_NAME = "manomitra.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Chat table
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        mood TEXT,
        polarity REAL,
        timestamp TEXT NOT NULL
    )''')

    # 🆕 Journal table
    c.execute('''CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )''')

    conn.commit()
    conn.close()

def save_journal_entry(text):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''INSERT INTO journal_entries (text, timestamp)
                 VALUES (?, ?)''', (text, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def save_message(role, content, mood=None, polarity=None):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''INSERT INTO chat_history (role, content, mood, polarity, timestamp)
                 VALUES (?, ?, ?, ?, ?)''',
              (role, content, mood, polarity, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()

def get_last_messages(limit=8):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?''', (limit,))
    rows = c.fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

def get_all_moods():
    """Return average polarity per mood per day (for chart)."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("""
        SELECT date(timestamp), mood, AVG(polarity)
        FROM chat_history
        WHERE role = 'user' AND mood IS NOT NULL
        GROUP BY date(timestamp), mood
        ORDER BY timestamp
    """)
    rows = c.fetchall()
    conn.close()
    return [{"date": r[0], "mood": r[1], "score": r[2]} for r in rows]
