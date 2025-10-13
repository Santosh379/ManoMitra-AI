document.addEventListener("DOMContentLoaded", () => {

  /* ============================
     ELEMENT CACHE + USER NAME
     ============================ */
  const chatWindow = document.getElementById("chatWindow");
  const intro = document.getElementById("intro");
  const sendBtn = document.getElementById("sendBtn");
  const userInput = document.getElementById("userInput");
  const moodIndicator = document.getElementById("moodIndicator");
  const themeToggle = document.getElementById("themeToggle");
  const relaxOutput = document.getElementById("relaxOutput");
  const ambientContainer = document.getElementById("ambientContainer");

  // Personalized name (asks once, stored in localStorage)
  let userName = localStorage.getItem("userName");
  if (!userName) {
    try {
      const p = prompt("Hi there! What’s your name? 😊");
      if (p && p.trim()) {
        userName = p.trim();
        localStorage.setItem("userName", userName);
      }
    } catch (e) { /* prompt can be blocked in some contexts */ }
  }

  /* ============================
     CHAT UI HELPERS
     ============================ */

  function appendMessage(text, who) {
    const div = document.createElement("div");
    div.className = "message " + (who === "user" ? "user" : "bot");

    // Bot avatar for bot messages
    if (who === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "bot-avatar";
      avatar.textContent = "🤖";
      div.appendChild(avatar);
    }

    const msgSpan = document.createElement("span");
    msgSpan.textContent = text;
    div.appendChild(msgSpan);

    if (chatWindow) {
      chatWindow.appendChild(div);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    return div;
  }

  function createTypingBubble() {
    const d = document.createElement("div");
    d.className = "message bot thinking";
    d.innerHTML = `
      <div class="bot-avatar">🤖</div>
      <span class="thinking-text">ManoMitra is thinking<span class="dots">...</span></span>
    `;
    if (chatWindow) {
      chatWindow.appendChild(d);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    return d;
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  /* ============================
     THEME APPLY (define early so other code can wrap it)
     ============================ */
  function applyTheme(theme) {
    document.body.classList.add("theme-transition");

    document.body.classList.remove(
      "theme-mint", "theme-cool", "theme-warm",
      "theme-softPurple", "theme-redGlow", "theme-blueGray"
    );

    if (theme === "cool") document.body.classList.add("theme-cool");
    else if (theme === "warm") document.body.classList.add("theme-warm");
    else if (theme === "softPurple") document.body.classList.add("theme-softPurple");
    else if (theme === "redGlow") document.body.classList.add("theme-redGlow");
    else if (theme === "blueGray") document.body.classList.add("theme-blueGray");
    else document.body.classList.add("theme-mint");

    if (moodIndicator) {
      try {
        moodIndicator.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }],
          { duration: 800, easing: "ease-in-out" }
        );
      } catch (e) { /* some browsers may throw on animate */ }
    }

    setTimeout(() => document.body.classList.remove("theme-transition"), 1000);
  }

  /* ============================
     RESET CHAT BUTTON (attach to existing HTML button)
     ============================ */
  const resetBtn = document.getElementById("resetChat");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Clear all messages and start fresh?")) {
        // clear messages
        document.querySelectorAll(".message, .chat-bubble, .welcome-bubble, .ai-summary-card")
          .forEach(m => m.remove());

        // clear welcome + name so it re-prompts
        sessionStorage.removeItem("welcomed");
        localStorage.removeItem("userName");

        appendMessage("Chat cleared! 🌿 Hello again, I’m ManoMitra.", "bot");

        // re-prompt for name after reset
        setTimeout(() => {
          try {
            const newName = prompt("Hi there! What’s your name? 😊");
            if (newName && newName.trim()) {
              localStorage.setItem("userName", newName.trim());
              appendMessage(`Welcome back, ${newName.trim()}! 🌿`, "bot");
            }
          } catch (e) { /* ignore */ }
        }, 700);
      }
    });
  }

  /* ---------------- WELCOME BUBBLE ON FIRST OPEN ---------------- */
  window.addEventListener("load", () => {
    if (chatWindow && !sessionStorage.getItem("welcomed")) {
      const bubble = document.createElement("div");
      bubble.className = "welcome-bubble";
      bubble.innerHTML = `<strong>ManoMitra AI:</strong> Hey ${userName || "friend"} 🌿 How are you feeling today?`;
      chatWindow.appendChild(bubble);
      sessionStorage.setItem("welcomed", "1");
    }
  });

  /* ---------------- INTRO TRANSITION ---------------- */
  (function startIntro() {
    if (!intro) return;
    setTimeout(() => {
      intro.style.transition = "opacity 1s ease, transform 1s ease";
      intro.style.opacity = "0";
      intro.style.transform = "scale(0.96)";
      setTimeout(() => intro.remove(), 1000);
    }, 5000);
  })();

  /* ---------------- NAVBAR / PANE LOGIC ---------------- */
  const navBtns = document.querySelectorAll(".nav-btn");
  const panes = document.querySelectorAll(".tab-pane");
  function activatePane(id) {
    panes.forEach(p => {
      if (p.id === id) p.classList.add("active");
      else p.classList.remove("active");
    });
  }
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activatePane(btn.dataset.target);
    });
  });
  document.getElementById("openMood")?.addEventListener("click", () => {
    document.querySelector('.nav-btn[data-target="mood"]')?.click();
  });

  /* ============================
     SEND MESSAGE / FETCH
     ============================ */
  sendBtn?.addEventListener('click', sendMessage);
  userInput?.addEventListener('keypress', e => { if (e.key === "Enter") sendMessage(); });

  async function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;
    appendMessage(msg, "user");
    userInput.value = "";
    userInput.disabled = true;
    sendBtn.disabled = true;

    const typingBubble = createTypingBubble();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      typingBubble.remove();
      const replyText = data.reply || "I’m here for you. Tell me more if you'd like.";
      appendMessage(replyText, "bot");

      // wellness tip + emotion UI
      if (Math.random() < 0.2) showRandomTip();
      if (data.mood) {
        if (moodIndicator) moodIndicator.textContent = capitalize(data.mood);
        updateEmotionTheme(data.mood);
      }
      if (data.theme) applyTheme(data.theme);

      await initMoodChart();

    } catch (err) {
      console.error("Chat API error:", err);
      typingBubble.remove();
      appendMessage("I’m having trouble replying right now. Please check your connection.", "bot");
    } finally {
      userInput.disabled = false;
      sendBtn.disabled = false;
      userInput.focus();
    }
  }

  /* ============================
     RELAXATION TOOLS LOADER
     ============================ */
  let audioEl = null;
  let currentBtn = null;

  async function loadRelax() {
    try {
      const res = await fetch("/api/relaxation");
      const json = await res.json();
      const grid = document.querySelector(".relax-grid");
      if (!grid) return;
      grid.innerHTML = "";

      json.tools.forEach(t => {
        const card = document.createElement("div");
        card.className = "tool-card";
        const icon =
          t.type === "audio" ? "🎵" :
          t.type === "guided" ? "🧘" :
          t.type === "text" ? "💬" : "🌿";

        card.innerHTML = `<h4>${icon} ${t.title}</h4><p>${t.text || ""}</p>`;

        const btn = document.createElement("button");
        btn.className = "pill";
        btn.textContent = t.type === "audio" ? "Play" : "Try";

        btn.addEventListener("click", () => {
          if (t.type === "audio") {
            if (audioEl && !audioEl.paused && currentBtn === btn) {
              audioEl.pause();
              audioEl.currentTime = 0;
              btn.textContent = "Play";
              relaxOutput.innerText = "🔇 Audio stopped.";
              currentBtn = null;
            } else {
              if (audioEl) audioEl.pause();
              audioEl = new Audio(t.file);
              audioEl.loop = true;
              audioEl.play();
              btn.textContent = "Stop";
              relaxOutput.innerText = `🎧 Playing ${t.title}...`;
              currentBtn && (currentBtn.textContent = "Play");
              currentBtn = btn;
            }
          } else if (t.type === "guided") {
            relaxOutput.innerText = t.text || "Follow this mindfulness exercise 🌿";
            if (t.title.toLowerCase().includes("breathing")) {
              startBreathingPopup();
            }
          } else if (t.type === "text") {
            relaxOutput.innerText = t.text;
          }

          relaxOutput.classList.add("active");
          setTimeout(() => relaxOutput.classList.remove("active"), 1200);
        });

        card.appendChild(btn);
        grid.appendChild(card);
      });

      // Bonus card (Kind Prompt)
      const bonus = document.createElement("div");
      bonus.className = "tool-card";
      bonus.innerHTML = `<h4>💭 Kind Prompt</h4><p id="promptText">Need a gentle thought?</p>`;
      const bbtn = document.createElement("button");
      bbtn.className = "pill";
      bbtn.textContent = "Show Prompt";
      const prompts = [
        "Take a moment to notice your breath — that’s life flowing through you.",
        "You deserve kindness today.",
        "Let your shoulders drop — relax the tension you don’t need.",
        "Think of one good thing that happened today — even small counts."
      ];
      bbtn.onclick = () => {
        document.getElementById("promptText").textContent =
          prompts[Math.floor(Math.random() * prompts.length)];
      };
      bonus.appendChild(bbtn);
      grid.appendChild(bonus);

    } catch (err) {
      console.error("Relaxation tools load error:", err);
    }
  }
  loadRelax();

  /* ============================
     JOURNAL SAVE (RESTORED)
     ============================ */
  const saveBtn = document.getElementById("saveJournal");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const txt = document.getElementById("journalText").value.trim();
      if (!txt) return alert("Write something to save first.");
      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: txt })
        });
        if (res.ok) {
          appendMessage("🪶 Journal entry saved successfully.", "bot");
          document.getElementById("journalText").value = "";
        } else {
          appendMessage("⚠️ Could not save entry, please try again later.", "bot");
        }
      } catch (err) {
        console.error("Save journal error:", err);
        appendMessage("💥 Error saving journal. Check connection.", "bot");
      }
    });
  }

  /* ============================
     BREATHING POPUP
     ============================ */
  function startBreathingPopup() {
    const modal = document.getElementById("breathModal");
    const circle = document.getElementById("breathCircle");
    const text = document.getElementById("breathText");
    const closeBtn = document.getElementById("closeBreath");
    if (!modal) return;

    modal.classList.remove("hidden");
    let cycle = 0;

    function breathCycle() {
      if (cycle >= 3) {
        text.textContent = "Well done 🌿";
        circle.style.animation = "none";
        setTimeout(() => modal.classList.add("hidden"), 1500);
        return;
      }

      text.textContent = "Breathe In...";
      circle.style.animation = "breathInOut 4s ease-in-out";
      setTimeout(() => { text.textContent = "Hold..."; }, 4000);
      setTimeout(() => { text.textContent = "Breathe Out..."; }, 6000);

      cycle++;
      setTimeout(breathCycle, 9000);
    }
    breathCycle();
    closeBtn && (closeBtn.onclick = () => modal.classList.add("hidden"));
  }

  /* ============================
     MOOD CHART
     ============================ */
  async function initMoodChart() {
    const canvas = document.getElementById("moodChart");
    if (!canvas || typeof Chart === "undefined") return;
    try {
      const res = await fetch("/api/moods");
      if (!res.ok) throw new Error("Fetch fail");
      const moods = await res.json();
      const labels = moods.map(m => m.date);
      const scores = moods.map(m => m.score);
      const colors = moods.map(m => m.mood === "happy" ? "#ffb74d" :
        m.mood === "sad" ? "#42a5f5" :
        m.mood === "anxious" ? "#b388ff" : "#80cbc4");
      new Chart(canvas, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Mood Polarity",
            data: scores,
            borderColor: "#00bfa5",
            backgroundColor: colors,
            tension: 0.3,
            fill: true,
          }]
        },
        options: {
          scales: {
            y: { beginAtZero: true, suggestedMin: -1, suggestedMax: 1 },
            x: { ticks: { maxRotation: 0 } }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch (err) { console.error("Mood chart error:", err); }
  }
  initMoodChart();

  /* ============================
     SHOW SUMMARIES
     ============================ */
  async function showSummaries() {
    try {
      document.querySelectorAll(".ai-summary-card").forEach(e => e.remove());
      const [dailyRes, weeklyRes] = await Promise.all([
        fetch("/api/summary/daily_ai"),
        fetch("/api/summary/weekly")
      ]);
      const dailyData = await dailyRes.json();
      const weeklyData = await weeklyRes.json();

      const summaryBox = document.createElement("div");
      summaryBox.className = "ai-summary-card";

      const weeklySummary = weeklyData.length
        ? weeklyData.map(w => `<li>Week ${w.week}: ${w.mood} (${w.avg_score})</li>`).join("")
        : "<li>No weekly data yet.</li>";

      summaryBox.innerHTML = `
        <h4>🌿 AI Mood Summaries</h4>
        <div class="summary-section">
          <h5>🪷 Daily Summary</h5>
          <p>${dailyData.summary || "No recent daily summary available."}</p>
        </div>
        <div class="summary-section">
          <h5>📅 Weekly Summary</h5>
          <ul>${weeklySummary}</ul>
        </div>
      `;

      document.querySelector(".journal-actions")?.appendChild(summaryBox);
      summaryBox.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-in-out" });

    } catch (err) {
      console.error(err);
      alert("Error generating summaries.");
    }
  }
  document.getElementById("dailySummary")?.addEventListener("click", showSummaries);
  document.getElementById("weeklySummary")?.addEventListener("click", showSummaries);

  /* ============================
     AMBIENT ORBS (visuals)
     ============================ */
  function generateOrbs(count = 5) {
    if (!ambientContainer) return;
    ambientContainer.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const orb = document.createElement("div");
      orb.classList.add("orb");
      const size = Math.floor(Math.random() * 200) + 180;
      orb.style.width = `${size}px`;
      orb.style.height = `${size}px`;
      orb.style.left = `${Math.random() * 100}%`;
      orb.style.top = `${Math.random() * 100}%`;
      orb.style.animationDelay = `${Math.random() * 8}s`;
      ambientContainer.appendChild(orb);
    }
  }
  generateOrbs(6);

  function refreshOrbs() {
    generateOrbs(6);
    ambientContainer.animate(
      [{ opacity: 0.4 }, { opacity: 0.9 }, { opacity: 0.5 }],
      { duration: 2000, easing: "ease-in-out" }
    );
  }

  /* attach refresh to applyTheme (decorate function) */
  const oldApplyTheme = applyTheme;
  applyTheme = function (theme) {
    oldApplyTheme(theme);
    refreshOrbs();
  };

  /* ============================
     WELLNESS TIPS + STREAK + EMOTION
     ============================ */
  const wellnessTips = [
    "Take a 5-minute stretch break! Your body will thank you.",
    "Drink a glass of water right now 💧",
    "Go outside for a minute — sunlight boosts your mood ☀️",
    "Remember to breathe deeply — in... out... 🌬️",
    "Try writing down one good thing about your day ✨",
    "A small walk = a big refresh 🌿",
    "Establish regular exercise routines in your life",
    "Connect with a friend or loved one today ❤️",
    "Practice gratitude — it can shift your mindset positively 🙏",
    "Limit screen time before bed for better sleep 🛌",
    "Listen to your favorite uplifting song 🎶",
    "Take a moment to meditate or practice mindfulness 🧘",
    "Set a small, achievable goal for today and celebrate it! 🎯",
    "Declutter a small space around you — it can clear your mind too 🧹",
    "Laugh! Watch a funny video or recall a joyful memory 😂"
    
  ];

  function showRandomTip() {
    const tip = wellnessTips[Math.floor(Math.random() * wellnessTips.length)];
    const tipBubble = document.createElement("div");
    tipBubble.className = "chat-bubble bot tip";
    tipBubble.innerHTML = `<b>🌱 Wellness Tip:</b> ${tip}`;
    if (chatWindow) {
      chatWindow.appendChild(tipBubble);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  }

  // Streak tracker
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem("lastActiveDate");
  let streak = parseInt(localStorage.getItem("streak")) || 0;
  let isNewDay = false;
  if (lastDate !== today) {
    streak += 1;
    localStorage.setItem("streak", streak);
    localStorage.setItem("lastActiveDate", today);
    isNewDay = true;
  }
  (function showStreakBanner() {
    const existing = document.querySelector(".streak-banner");
    if (existing) existing.remove();
    const streakBanner = document.createElement("div");
    streakBanner.className = "streak-banner";
    streakBanner.innerHTML = `🔥 <b>Streak:</b> ${streak} day${streak > 1 ? "s" : ""} strong!`;
    if (isNewDay) streakBanner.classList.add("new-day");
    if (chatWindow) chatWindow.prepend(streakBanner);
  })();

  function updateEmotionTheme(emotion) {
    if (!chatWindow) return;
    chatWindow.classList.remove("happy", "sad", "angry", "neutral");
    if (emotion) chatWindow.classList.add(emotion);
  }

  /* ============================
     END DOMContentLoaded
     ============================ */
}); // end DOMContentLoaded

/* ============================
   DARK MODE TOGGLE (robust)
   Replaces any previous themeToggle listener
   ============================ */
(function setupDarkToggle() {
  // Try to find the actual checkbox input inside your .theme-toggle or #themeToggle wrapper
  const themeToggleInput =
    document.querySelector('.theme-toggle input[type="checkbox"]') ||
    document.querySelector('#themeToggle input[type="checkbox"]') ||
    document.querySelector('#themeToggle') || // in case the input itself has id="themeToggle"
    null;

  function setDarkMode(on) {
    if (on) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    try { localStorage.setItem('darkMode', on ? '1' : '0'); } catch (e) { /* ignore storage errors */ }
  }

  // Initialize from localStorage (if available), else keep default
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') setDarkMode(true);
    else if (saved === '0') setDarkMode(false);
  } catch (e) { /* ignore */ }

  if (!themeToggleInput) {
    // No checkbox found — try to attach to an inputless wrapper (fallback)
    const wrapper = document.querySelector('.theme-toggle') || document.getElementById('themeToggle');
    if (wrapper) {
      wrapper.style.cursor = 'pointer';
      wrapper.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        setDarkMode(isDark);
      });
    } else {
      console.warn('Theme toggle element not found. Ensure your HTML has .theme-toggle or #themeToggle.');
    }
    return;
  }

  // If the found element is a checkbox-like input
  if (themeToggleInput.type === 'checkbox') {
    // ensure the UI reflects saved state
    const stored = localStorage.getItem('darkMode');
    if (stored === '1') themeToggleInput.checked = true;
    else if (stored === '0') themeToggleInput.checked = false;

    // Apply initial visual state (in case localStorage was set)
    setDarkMode(themeToggleInput.checked);

    // Listen for changes
    themeToggleInput.addEventListener('change', (e) => {
      setDarkMode(e.target.checked);
    });
  } else {
    // If the selector returned a non-checkbox element (rare), attach click toggle
    themeToggleInput.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      setDarkMode(isDark);
      // if it is an element that can display checked, toggle it
      try { if ('checked' in themeToggleInput) themeToggleInput.checked = isDark; } catch (e) {}
    });
  }
})();

// 🌈 Welcome screen fade-out
window.addEventListener("load", () => {
  setTimeout(() => {
    const welcome = document.querySelector(".welcome-logo-container");
    welcome.style.transition = "opacity 1s ease";
    welcome.style.opacity = "0";
    setTimeout(() => {
      welcome.style.display = "none";
      document.getElementById("mainApp").style.display = "block";
    }, 1000);
  }, 3000); // visible for 3 seconds
});
