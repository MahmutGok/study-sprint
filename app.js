// Uygulamanın durumunu (State) tek bir nesnede topluyoruz
const state = {
  mode: "focus",          // "focus" | "short" | "long"
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  timerId: null,
  sessionsCompleted: loadSessions(),
  tasks: loadTasks(),
};

// DOM Elemanları
const timerDisplay = document.getElementById("timer-display");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const modeButtons = document.querySelectorAll(".mode-btn");
const customForm = document.getElementById("custom-form");
const customMinutesInput = document.getElementById("custom-minutes");
const timerError = document.getElementById("timer-error");
const sessionCountEl = document.getElementById("session-count");
const resetSessionsBtn = document.getElementById("reset-sessions-btn");
const themeToggleBtn = document.getElementById("theme-toggle");

const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskError = document.getElementById("task-error");
const taskList = document.getElementById("task-list");

// --- Sayaç Fonksiyonları ---

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function updateTimerUI() {
  const formatted = formatTime(state.remainingSeconds);
  timerDisplay.textContent = formatted;
  const label = state.mode === "focus" ? "Focus" : "Break";
  document.title = `${formatted} — ${label} | StudySprint`;
}

function setRunningButtons(isRunning) {
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
}

function startTimer() {
  // Aynı anda birden fazla interval çalışmasını engelle
  if (state.timerId !== null) return;

  setRunningButtons(true);
  state.timerId = setInterval(() => {
    if (state.remainingSeconds > 0) {
      state.remainingSeconds -= 1;
      updateTimerUI();
      return;
    }

    // Süre doldu
    pauseTimer();
    playChime();
    if (state.mode === "focus") {
      state.sessionsCompleted += 1;
      saveSessions(state.sessionsCompleted);
      sessionCountEl.textContent = state.sessionsCompleted;
    }
  }, 1000);
}

function pauseTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  setRunningButtons(false);
}

function resetTimer() {
  pauseTimer();
  state.remainingSeconds = state.durationMinutes * 60;
  updateTimerUI();
}

function switchMode(mode, minutes) {
  pauseTimer();
  state.mode = mode;
  state.durationMinutes = minutes;
  state.remainingSeconds = minutes * 60;
  timerError.textContent = "";

  modeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  updateTimerUI();
}

// Tarayıcıda harici ses dosyası olmadan yumuşak uyarı sesi üretir
function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Tarayıcı ses politikası engellerse sessizce devam et
  }
}

// --- Görev Listesi ve Depolama (localStorage) ---

function loadTasks() {
  try {
    const raw = localStorage.getItem("studysprint_tasks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  try {
    localStorage.setItem("studysprint_tasks", JSON.stringify(tasks));
  } catch {
    // Depolama dolu veya engelli ise çökmeyi önle
  }
}

function loadSessions() {
  try {
    const raw = Number(localStorage.getItem("studysprint_sessions"));
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  } catch {
    return 0;
  }
}

function saveSessions(count) {
  try {
    localStorage.setItem("studysprint_sessions", String(count));
  } catch {
    // Sessizce geç
  }
}

function renderTasks() {
  taskList.innerHTML = "";

  state.tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = `task-item${task.done ? " done" : ""}`;

    const label = document.createElement("label");
    label.className = "task-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const span = document.createElement("span");
    span.textContent = task.text; // XSS güvenliği için textContent

    label.append(checkbox, span);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.type = "button";
    delBtn.ariaLabel = "Delete task";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.append(label, delBtn);
    taskList.appendChild(li);
  });
}

function toggleTask(id) {
  state.tasks = state.tasks.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
  saveTasks(state.tasks);
  renderTasks();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasks(state.tasks);
  renderTasks();
}

// --- Olay Dinleyicileri (Event Listeners) ---

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchMode(btn.dataset.mode, Number(btn.dataset.minutes));
  });
});

customForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = Number(customMinutesInput.value.trim());

  if (!Number.isInteger(value) || value < 1 || value > 180) {
    timerError.textContent = "Please enter a whole number between 1 and 180.";
    return;
  }

  timerError.textContent = "";
  pauseTimer();
  state.durationMinutes = value;
  state.remainingSeconds = value * 60;
  updateTimerUI();
  customMinutesInput.value = "";
});

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    taskError.textContent = "Please enter a task before adding.";
    return;
  }

  taskError.textContent = "";
  state.tasks.push({ id: Date.now(), text, done: false });
  saveTasks(state.tasks);
  renderTasks();
  taskInput.value = "";
});

// --- Tema Yönetimi (Theme Toggle) ---
function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("light-theme", isLight);
  themeToggleBtn.textContent = isLight ? "Dark Mode" : "Light Mode";
}

function loadTheme() {
  try {
    return localStorage.getItem("studysprint_theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

themeToggleBtn.addEventListener("click", () => {
  const next = document.body.classList.contains("light-theme") ? "dark" : "light";
  applyTheme(next);
  try {
    localStorage.setItem("studysprint_theme", next);
  } catch {
    // Sessizce geç
  }
});

resetSessionsBtn.addEventListener("click", () => {
  state.sessionsCompleted = 0;
  saveSessions(0);
  sessionCountEl.textContent = "0";
});

// Klavye kısayolları (Space: Başlat/Duraklat, R: Sıfırla)
document.addEventListener("keydown", (e) => {
  // Metin/sayı giriş alanındayken kısayolları tetikleme
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.code === "Space") {
    e.preventDefault();
    if (state.timerId !== null) {
      pauseTimer();
    } else {
      startTimer();
    }
  } else if (e.key.toLowerCase() === "r") {
    resetTimer();
  }
});

// İlk açılışta ekranı çiz
applyTheme(loadTheme());
sessionCountEl.textContent = state.sessionsCompleted;
updateTimerUI();
renderTasks();
