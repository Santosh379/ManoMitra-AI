# 🌿 ManoMitra – AI Mental Wellness Companion

“Your mind’s safe space — to express, reflect, and heal.”

---

## 🧠 About the Project

ManoMitra is an AI-powered mental wellness companion that provides empathetic emotional support, journaling, and relaxation tools through natural conversation.

It is built using Flask, Google Gemini API, and an emotion-based frontend design. The app helps users manage stress, express emotions safely, and build mindful habits through AI-guided interaction.

---

## 🎯 Features

- 💬 Emotion-Aware Chatbot – Detects mood and responds empathetically using AI.  
- 📓 Daily Journal – Allows users to record their thoughts and emotions securely.  
- 🌈 Dynamic Themes – Interface color and glow adapt based on user emotion.  
- 🎧 Relaxation Tools – Includes calming sounds, breathing exercises, and affirmations.  
- 📊 Mood Tracker – Displays daily and weekly emotion summaries.  
- ☁️ Cloud Hosting – Runs continuously on Render for 24/7 accessibility.  
- 🔒 Privacy Focused – No personal user data is collected or shared.

---

## 🏗️ Tech Stack

**Frontend:** HTML, CSS, JavaScript  
**Backend:** Flask (Python)  
**AI Model:** Google Gemini 2.5 Pro  
**Sentiment Analysis:** TextBlob  
**Database:** SQLite  
**Deployment Platform:** Render  
**Monitoring Tools:** UptimeRobot, BetterStack  

---

## ⚙️ Installation & Setup

1️⃣ Clone the project folder.  
2️⃣ Create and activate a virtual environment.  
3️⃣ Install required Python packages using the requirements file.  
4️⃣ Create a .env file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
5️⃣ Run the Flask application:
   ```
   python app.py
   ```
6️⃣ Open the app in your browser at http://127.0.0.1:8000  

---

## 🚀 Deployment (For Reference)

- The application can be deployed on cloud platforms such as Render.  
- Use the following commands:
  - Build Command: `pip install -r requirements.txt`  
  - Start Command: `gunicorn app:app`  
- Add environment variable: `GEMINI_API_KEY`  

---

## 🧩 System Workflow

User → Frontend (HTML, CSS, JS)  
→ Flask Backend (Python)  
→ Gemini API (AI Response)  
→ TextBlob (Emotion Analysis)  
→ SQLite (Journal and Mood Storage)

---

## 🌱 Future Scope

- 🎙️ Add voice-based chat interaction.  
- 🌐 Introduce support for regional languages.  
- 📶 Enable offline functionality for rural areas.  
- 📊 Add advanced emotional analytics.  
- 🧠 Connect users to real mental health professionals.

---

## 🧾 References

1. Google Gemini API Documentation  
2. Flask Framework Documentation  
3. TextBlob Sentiment Analysis Library  
4. Render Deployment Guides  
5. Bootstrap 5.3 Framework  
6. UptimeRobot and BetterStack Monitoring Tools  
7. SQLite Database Documentation

---

## 💙 Acknowledgements

This project was developed as part of the IBM SkillsBuild – AICTE Capstone Project.  
It combines AI technology and emotional intelligence to promote better mental well-being for all.

---

## 👨‍💻 Author

**Santosh Darisi**  
Vellore Institute of Technology (VIT)  
Department of Computer Science and Engineering  

---

🧘‍♂️ “Small steps toward awareness can lead to big changes in peace of mind.”
