from flask import Flask, send_from_directory, request, jsonify
import sqlite3
from dotenv import load_dotenv
from textblob import TextBlob
import google.generativeai as genai
from datetime import datetime
import os
from db import init_db, save_message, get_last_messages, get_all_moods, save_journal_entry
from collections import defaultdict
import statistics


# -------------------------------
# 1️⃣ Load environment variables
# -------------------------------
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY missing in .env")

# -------------------------------
# 2️⃣ Configure Gemini model
# -------------------------------
genai.configure(api_key=GEMINI_API_KEY)
GEN_MODEL = "models/gemini-2.5-pro"

# -------------------------------
# 3️⃣ Flask app setup
# -------------------------------
app = Flask(__name__, static_folder="static", static_url_path="/static")
init_db()

# -------------------------------
# 4️⃣ Helper functions
# -------------------------------
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die", "hurt myself",
    "i'm going to kill myself", "i want to die", "no reason to live"
]

def detect_crisis(text: str) -> bool:
    t = text.lower()
    return any(kw in t for kw in CRISIS_KEYWORDS)

def detect_emotion(text: str):
    """Enhanced emotion detection using TextBlob polarity + keywords."""
    tb = TextBlob(text)
    p = tb.sentiment.polarity
    t = text.lower()

    # Keyword-based boost
    if any(w in t for w in ["angry", "mad", "furious", "irritated"]):
        return "angry", p
    if any(w in t for w in ["tired", "exhausted", "lazy", "sleepy"]):
        return "tired", p
    if any(w in t for w in ["calm", "peaceful", "relaxed"]):
        return "calm", p
    if any(w in t for w in ["worried", "nervous", "stressed", "anxious"]):
        return "anxious", p

    # Sentiment-based fallback
    if p >= 0.35:
        return "happy", p
    if p <= -0.25:
        return "sad", p
    if -0.25 < p < 0:
        return "anxious", p
    return "neutral", p

def build_context_text():
    msgs = get_last_messages()
    lines = []
    for item in msgs:
        label = "User" if item["role"] == "user" else "Assistant"
        lines.append(f"{label}: {item['content']}")
    return "\n".join(lines).strip()

# -------------------------------
# 5️⃣ Routes
# -------------------------------
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(force=True)
    user_msg = (data.get("message") or "").strip()
    name = data.get("name", "friend")

    if not user_msg:
        return jsonify({"error": "empty_message"}), 400

    # --- Crisis detection ---
    if detect_crisis(user_msg):
        reply = (
            "I’m really sorry you’re feeling that way. "
            "You’re not alone — if you’re in immediate danger please contact local emergency services "
            "or a suicide prevention hotline in your country. "
            "Would you like some gentle breathing guidance now?"
        )
        save_message("user", user_msg, "crisis", 0)
        save_message("assistant", reply)
        return jsonify({
            "reply": reply,
            "mood": "crisis",
            "theme": "softWarning",
            "crisis": True
        })

    # --- Emotion detection ---
    mood, score = detect_emotion(user_msg)
    theme = {
        "happy": "warm",
        "sad": "cool",
        "anxious": "softPurple",
        "neutral": "mint",
        "angry": "redGlow",
        "tired": "blueGray",
        "calm": "mint"
    }.get(mood, "mint")

    # --- Gemini response ---
    context = build_context_text()
    prompt = (
        "You are ManoMitra, a gentle supportive AI friend for emotional check-ins. "
        "Keep responses short (1-3 sentences), empathetic, never clinical or diagnostic. "
        "Offer kind small next steps like breathing or journaling."
    )
    if context:
        prompt += f"\nContext:\n{context}\n"
    prompt += f"\nUser ({name}): {user_msg}\nAssistant:"

    try:
        model = genai.GenerativeModel(GEN_MODEL)
        response = model.generate_content(prompt)
        text = (response.text or "").strip()
    except Exception:
        text = "Let's take a calm breath together 🌿. I'm here for you."

    save_message("user", user_msg, mood, score)
    save_message("assistant", text)

    return jsonify({
        "reply": text,
        "mood": mood,
        "score": float(score),
        "theme": theme,
        "crisis": False
    })


@app.route("/api/relaxation", methods=["GET"])
def api_relaxation():
    tools = [
        {"id": "ocean", "title": "Ocean Waves", "type": "audio", "file": "/static/audio/ocean.mp3"},
        {"id": "forest", "title": "Forest Birds", "type": "audio", "file": "/static/audio/forest.mp3"},
        {"id": "piano", "title": "Piano Ambience", "type": "audio", "file": "/static/audio/piano.mp3"},
        {"id": "breath", "title": "Deep Breathing", "type": "guided", "text": "Inhale 4s, hold 2s, exhale 6s — repeat slowly."},
        {"id": "ground", "title": "5-4-3-2-1 Grounding", "type": "guided", "text": "5 things you see, 4 touch, 3 hear, 2 smell, 1 taste."},
        {"id": "affirm", "title": "Affirmation", "type": "text", "text": "You are doing your best, and that’s enough 💙"}
    ]
    return jsonify({"tools": tools})


@app.route("/api/moods", methods=["GET"])
def api_moods():
    moods = get_all_moods()
    return jsonify(moods)


@app.route("/api/journal", methods=["POST"])
def api_journal():
    data = request.get_json(force=True)
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "empty_entry"}), 400

    save_journal_entry(text)
    return jsonify({"status": "saved"})


# ---------- DAILY SUMMARY ----------
@app.route("/api/summary/daily", methods=["GET"])
def daily_summary():
    conn = sqlite3.connect("manomitra.db")
    c = conn.cursor()
    c.execute("SELECT timestamp, polarity FROM chat_history WHERE role='user'")
    rows = c.fetchall()
    conn.close()

    if not rows:
        return jsonify([])

    daily_scores = defaultdict(list)
    for ts, polarity in rows:
        if polarity is not None:
            day = ts[:10]
            daily_scores[day].append(polarity)

    summary = []
    for day, scores in daily_scores.items():
        avg = round(statistics.mean(scores), 2)
        mood = (
            "happy" if avg > 0.3 else
            "sad" if avg < -0.3 else
            "neutral"
        )
        summary.append({"date": day, "avg_score": avg, "mood": mood})

    return jsonify(summary)


# ---------- WEEKLY SUMMARY ----------
@app.route("/api/summary/weekly", methods=["GET"])
def weekly_summary():
    conn = sqlite3.connect("manomitra.db")
    c = conn.cursor()
    c.execute("SELECT timestamp, polarity FROM chat_history WHERE role='user'")
    rows = c.fetchall()
    conn.close()

    if not rows:
        return jsonify([])

    weekly_scores = defaultdict(list)
    for ts, polarity in rows:
        if polarity is not None:
            dt = datetime.fromisoformat(ts)
            year, week, _ = dt.isocalendar()
            weekly_scores[(year, week)].append(polarity)

    summary = []
    for (year, week), scores in weekly_scores.items():
        avg = round(statistics.mean(scores), 2)
        mood = (
            "happy" if avg > 0.3 else
            "sad" if avg < -0.3 else
            "neutral"
        )
        summary.append({"year": year, "week": week, "avg_score": avg, "mood": mood})

    return jsonify(summary)


# ---------- AI DAILY SUMMARY ----------
@app.route("/api/summary/daily_ai", methods=["GET"])
def daily_ai_summary():
    conn = sqlite3.connect("manomitra.db")
    c = conn.cursor()
    c.execute("""
        SELECT content, mood, polarity, timestamp
        FROM chat_history
        WHERE role='user'
        AND timestamp >= datetime('now', '-1 day')
    """)
    rows = c.fetchall()
    conn.close()

    if not rows:
        return jsonify({"summary": "No recent conversations yet to summarize."})

    user_entries = "\n".join([f"[{m}] {txt}" for txt, m, p, t in rows])
    prompt = f"""
    You are ManoMitra, a gentle companion that helps users reflect on their day.
    Based on these conversations, summarize their emotional day in 3-5 sentences.
    Focus on kindness, emotional trends, and gentle encouragement.

    Entries:
    {user_entries}
    """

    try:
        model = genai.GenerativeModel(GEN_MODEL)
        response = model.generate_content(prompt)
        summary = (response.text or "").strip()
    except Exception as e:
        summary = f"Could not generate summary: {e}"

    return jsonify({"summary": summary})


# -------------------------------
# 6️⃣ Entry Point for Render
# -------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Render sets PORT automatically
    print(f"✅ ManoMitra running on port {port}")
    app.run(host="0.0.0.0", port=port)
