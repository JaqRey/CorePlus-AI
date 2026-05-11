// ── ARIA Dashboard JS ────────────────────────────────────────────────

let chatHistory = [];
let currentUser = null;

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();
  await loadHomeStats();
  updateDateBadge();
  restoreSessionOutputs();   // reload any outputs saved this session
});

async function loadUserProfile() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) { window.location.href = "/login"; return; }
    currentUser = await res.json();

    const name    = currentUser.name || currentUser.username || "Athlete";
    const goal    = currentUser.profile?.goal || "general fitness";
    const initial = name.charAt(0).toUpperCase();

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("greeting-name",    name.split(" ")[0]);
    setEl("user-name-display", name);
    setEl("user-goal-display", goal);
    setEl("user-avatar",       initial);

    const ma = document.getElementById("mobile-avatar");
    if (ma) ma.textContent = initial;

    prefillForms(currentUser.profile);
  } catch (e) {
    console.error("Failed to load profile:", e);
  }
}

function prefillForms(profile) {
  if (!profile) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set("w-goal",      profile.goal);
  set("w-level",     profile.level);
  set("w-equipment", profile.equipment);
  set("w-days",      profile.days || "3");
  set("d-goal",      profile.goal);
  set("d-diet",      profile.diet_type);
}

async function loadHomeStats() {
  try {
    const res = await fetch("/api/analytics/summary", { credentials: "include" });
    if (!res.ok) return;
    const d = await res.json();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("stat-sessions", d.total_sessions ?? 0);
    set("stat-hours",    d.total_hours    ?? 0);
    set("stat-calories", (d.total_calories ?? 0).toLocaleString());
    set("stat-streak",   d.streak ? `${d.streak}🔥` : "0");
  } catch (e) { /* silent */ }
}

function updateDateBadge() {
  const el = document.getElementById("today-date");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
}

// ══════════════════════════════════════════════════
// SESSION STORAGE  (survives tab-switching, lost on close)
// ══════════════════════════════════════════════════

const SESSION_KEYS = {
  workout:  "aria_session_workout",
  diet:     "aria_session_diet",
  wellness: "aria_session_wellness",
};

/**
 * Save raw markdown text + form values to sessionStorage.
 */
function saveToSession(type, rawText, formValues = {}) {
  sessionStorage.setItem(SESSION_KEYS[type], JSON.stringify({
    text: rawText,
    form: formValues,
    savedAt: new Date().toISOString(),
  }));
}

/**
 * On page load, restore any outputs that were generated this session.
 */
function restoreSessionOutputs() {
  const configs = [
    { type: "workout",  outputId: "workout-output",  resultId: "workout-result"  },
    { type: "diet",     outputId: "diet-output",      resultId: "diet-result"     },
    { type: "wellness", outputId: "wellness-output",  resultId: "wellness-result" },
  ];

  for (const { type, outputId, resultId } of configs) {
    const raw = sessionStorage.getItem(SESSION_KEYS[type]);
    if (!raw) continue;
    try {
      const { text } = JSON.parse(raw);
      const output = document.getElementById(outputId);
      const result = document.getElementById(resultId);
      if (output && result && text) {
        result.innerHTML = renderMarkdown(text);
        output.style.display = "block";
        // Show a "restored" badge
        showRestoredBadge(outputId);
      }
    } catch { /* ignore corrupt data */ }
  }
}

function showRestoredBadge(outputId) {
  const card = document.getElementById(outputId);
  if (!card) return;
  if (card.querySelector(".restored-badge")) return; // already shown
  const badge = document.createElement("div");
  badge.className = "restored-badge";
  badge.textContent = "⚡ Restored from this session";
  card.insertBefore(badge, card.firstChild);
}

// ══════════════════════════════════════════════════
// TAB NAVIGATION
// ══════════════════════════════════════════════════

function openTab(tabName) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.classList.add("active");
  else document.getElementById("tab-home")?.classList.add("active");

  // Load saved plans whenever that tab is opened
  if (tabName === "plans") loadSavedPlans();

  if (window.innerWidth <= 768) {
    document.getElementById("sidebar")?.classList.remove("open");
  }
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

// ══════════════════════════════════════════════════
// LOADING OVERLAY
// ══════════════════════════════════════════════════

function showLoading(text = "ARIA is thinking…") {
  const overlay = document.getElementById("loading-overlay");
  const textEl  = document.getElementById("loading-text");
  if (overlay) overlay.style.display = "flex";
  if (textEl)  textEl.textContent = text;
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.style.display = "none";
}

// ══════════════════════════════════════════════════
// AI GENERATORS
// ══════════════════════════════════════════════════

async function generateWorkout() {
  showLoading("Generating your workout plan…");
  const payload = {
    goal:      document.getElementById("w-goal")?.value,
    level:     document.getElementById("w-level")?.value,
    equipment: document.getElementById("w-equipment")?.value,
    days:      document.getElementById("w-days")?.value,
  };

  try {
    const res  = await fetch("/api/ai/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      const output = document.getElementById("workout-output");
      const result = document.getElementById("workout-result");
      if (output) output.style.display = "block";
      if (result) result.innerHTML = renderMarkdown(data.response);
      // Remove old restored badge if present
      output?.querySelector(".restored-badge")?.remove();
      output?.scrollIntoView({ behavior: "smooth" });
      // ── Auto-save to session ──
      saveToSession("workout", data.response, payload);
    } else {
      alert(data.error || "Failed to generate workout.");
    }
  } catch (e) {
    alert("Server error. Make sure Flask is running.");
  } finally {
    hideLoading();
    await loadHomeStats();
  }
}

async function generateDiet() {
  showLoading("Creating your personalized meal plan…");
  const payload = {
    goal:      document.getElementById("d-goal")?.value,
    diet_type: document.getElementById("d-diet")?.value,
    budget:    document.getElementById("d-budget")?.value,
  };

  try {
    const res  = await fetch("/api/ai/diet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      const output = document.getElementById("diet-output");
      const result = document.getElementById("diet-result");
      if (output) output.style.display = "block";
      if (result) result.innerHTML = renderMarkdown(data.response);
      output?.querySelector(".restored-badge")?.remove();
      output?.scrollIntoView({ behavior: "smooth" });
      // ── Auto-save to session ──
      saveToSession("diet", data.response, payload);
    } else {
      alert(data.error || "Failed to generate diet plan.");
    }
  } catch (e) {
    alert("Server error. Make sure Flask is running.");
  } finally {
    hideLoading();
    await loadHomeStats();
  }
}

async function generateWellness() {
  const question = document.getElementById("well-question")?.value.trim();
  if (!question) { alert("Please enter a wellness question."); return; }

  showLoading("ARIA is preparing your wellness advice…");
  const payload = {
    stress:   document.getElementById("well-stress")?.value,
    sleep:    document.getElementById("well-sleep")?.value,
    question,
  };

  try {
    const res  = await fetch("/api/ai/wellness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      const output = document.getElementById("wellness-output");
      const result = document.getElementById("wellness-result");
      if (output) output.style.display = "block";
      if (result) result.innerHTML = renderMarkdown(data.response);
      output?.querySelector(".restored-badge")?.remove();
      output?.scrollIntoView({ behavior: "smooth" });
      // ── Auto-save to session ──
      saveToSession("wellness", data.response, payload);
    } else {
      alert(data.error || "Failed to generate wellness advice.");
    }
  } catch (e) {
    alert("Server error. Make sure Flask is running.");
  } finally {
    hideLoading();
    await loadHomeStats();
  }
}

// ══════════════════════════════════════════════════
// PERMANENT PLAN SAVING
// ══════════════════════════════════════════════════

/**
 * savePlan(type, title)
 * Reads the current session output text and POSTs it to the backend
 * to be saved permanently in plans.json.
 */
async function savePlan(type, title) {
  const resultId = `${type}-result`;
  const el = document.getElementById(resultId);
  if (!el || !el.innerText.trim()) {
    alert("Nothing to save yet. Generate a plan first!");
    return;
  }

  // Read raw text from sessionStorage (cleaner than scraping innerHTML)
  let rawText = "";
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS[type]);
    if (stored) rawText = JSON.parse(stored).text;
  } catch { /* fall back to innerText */ }
  if (!rawText) rawText = el.innerText;

  const btn = event.target.closest("button");
  const origText = btn.innerHTML;
  btn.innerHTML = "Saving…";
  btn.disabled = true;

  try {
    const res = await fetch("/api/plans/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type, title, content: rawText })
    });
    const data = await res.json();

    if (res.ok) {
      btn.innerHTML = "✅ Saved!";
      setTimeout(() => { btn.innerHTML = origText; btn.disabled = false; }, 2500);
    } else {
      alert(data.error || "Failed to save plan.");
      btn.innerHTML = origText;
      btn.disabled = false;
    }
  } catch (e) {
    alert("Server error.");
    btn.innerHTML = origText;
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════
// SAVED PLANS TAB
// ══════════════════════════════════════════════════

async function loadSavedPlans() {
  const container = document.getElementById("saved-plans-list");
  if (!container) return;
  container.innerHTML = `<p class="plans-loading">Loading your saved plans…</p>`;

  try {
    const res  = await fetch("/api/plans", { credentials: "include" });
    const data = await res.json();
    const plans = data.plans || [];

    if (plans.length === 0) {
      container.innerHTML = `
        <div class="plans-empty">
          <div class="plans-empty-icon">📋</div>
          <p>No saved plans yet.</p>
          <p class="plans-empty-sub">Generate a Workout, Diet, or Wellness plan and click <strong>💾 Save Plan</strong> to store it here.</p>
        </div>`;
      return;
    }

    container.innerHTML = plans.map(plan => {
      const dt = new Date(plan.saved_at).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
      const icon = { workout: "🏋️", diet: "🥗", wellness: "🧘" }[plan.type] || "📋";
      return `
        <div class="plan-card" id="plan-${plan.id}">
          <div class="plan-card-header" onclick="togglePlan('${plan.id}')">
            <div class="plan-card-left">
              <span class="plan-icon">${icon}</span>
              <div>
                <h4 class="plan-title">${escapeHtml(plan.title)}</h4>
                <span class="plan-meta">${escapeHtml(plan.type)} &nbsp;·&nbsp; ${dt}</span>
              </div>
            </div>
            <div class="plan-card-actions">
              <button class="plan-action-btn" onclick="event.stopPropagation(); exportSavedPlanPDF('${plan.id}')" title="Export PDF">⬇ PDF</button>
              <button class="plan-action-btn danger" onclick="event.stopPropagation(); deletePlan('${plan.id}')" title="Delete">🗑</button>
              <span class="plan-chevron" id="chevron-${plan.id}">▼</span>
            </div>
          </div>
          <div class="plan-body" id="planbody-${plan.id}" style="display:none">
            <div class="plan-content">${renderMarkdown(plan.content)}</div>
          </div>
        </div>`;
    }).join("");

  } catch (e) {
    container.innerHTML = `<p class="plans-loading" style="color:var(--red)">Failed to load plans.</p>`;
  }
}

function togglePlan(id) {
  const body    = document.getElementById(`planbody-${id}`);
  const chevron = document.getElementById(`chevron-${id}`);
  if (!body) return;
  const isOpen = body.style.display !== "none";
  body.style.display    = isOpen ? "none" : "block";
  if (chevron) chevron.textContent = isOpen ? "▼" : "▲";
}

async function deletePlan(id) {
  if (!confirm("Delete this saved plan? This cannot be undone.")) return;
  try {
    const res = await fetch(`/api/plans/${id}`, {
      method: "DELETE", credentials: "include"
    });
    if (res.ok) {
      document.getElementById(`plan-${id}`)?.remove();
      // Show empty state if no plans left
      const container = document.getElementById("saved-plans-list");
      if (container && !container.querySelector(".plan-card")) {
        container.innerHTML = `
          <div class="plans-empty">
            <div class="plans-empty-icon">📋</div>
            <p>No saved plans yet.</p>
          </div>`;
      }
    } else {
      alert("Could not delete plan.");
    }
  } catch (e) {
    alert("Server error.");
  }
}

function exportSavedPlanPDF(planId) {
  // Call backend API to generate and download PDF
  fetch(`/api/plans/${planId}/export-pdf`, {
    credentials: "include"
  })
  .then(res => {
    if (!res.ok) {
      throw new Error("Failed to generate PDF");
    }
    return res.blob();
  })
  .then(blob => {
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitness_plan_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  })
  .catch(err => {
    console.error("PDF export failed:", err);
    alert("Failed to export PDF. Please try again.");
  });
}

// ══════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════

async function sendChat() {
  const input   = document.getElementById("chat-input");
  const message = input?.value.trim();
  if (!message) return;

  input.value = "";
  input.style.height = "auto";

  appendChatMsg("user", message);
  chatHistory.push({ role: "user", content: message });

  const typingId = appendChatMsg("aria", "", true);

  try {
    const res  = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message, history: chatHistory.slice(-8) })
    });
    const data = await res.json();

    removeMsg(typingId);

    if (res.ok) {
      appendChatMsg("aria", data.response);
      chatHistory.push({ role: "assistant", content: data.response });
      await loadHomeStats();
    } else {
      appendChatMsg("aria", "Sorry, I had trouble processing that. Please try again.");
    }
  } catch (e) {
    removeMsg(typingId);
    appendChatMsg("aria", "Connection error. Please make sure the server is running.");
  }
}

function appendChatMsg(role, content, isTyping = false) {
  const container = document.getElementById("chat-messages");
  if (!container) return null;

  const id  = "msg-" + Date.now();
  const div = document.createElement("div");
  div.className = `chat-msg ${role}${isTyping ? " typing-indicator" : ""}`;
  div.id = id;

  const avatarLetter  = role === "aria" ? "A" : (currentUser?.name?.charAt(0)?.toUpperCase() || "U");
  const bubbleContent = isTyping
    ? ""
    : role === "aria"
      ? renderMarkdown(content)
      : escapeHtml(content);

  div.innerHTML = `
    <div class="msg-avatar">${avatarLetter}</div>
    <div class="msg-bubble">${bubbleContent}</div>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeMsg(id) { document.getElementById(id)?.remove(); }

function clearChat() {
  chatHistory = [];
  const container = document.getElementById("chat-messages");
  if (container) container.innerHTML = `
    <div class="chat-msg aria">
      <div class="msg-avatar">A</div>
      <div class="msg-bubble">Chat cleared! 👋 What would you like to work on?</div>
    </div>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

// ══════════════════════════════════════════════════
// WORKOUT LOGGER
// ══════════════════════════════════════════════════

async function logWorkout() {
  const exercise = document.getElementById("log-exercise")?.value.trim();
  const duration = document.getElementById("log-duration")?.value;
  const type     = document.getElementById("log-type")?.value;
  const calories = document.getElementById("log-calories")?.value;
  const notes    = document.getElementById("log-notes")?.value.trim();
  const msgEl    = document.getElementById("log-msg");

  if (!exercise || !duration) {
    if (msgEl) {
      msgEl.textContent = "Please fill in activity name and duration.";
      msgEl.className   = "msg msg-error";
      msgEl.style.display = "block";
    }
    return;
  }

  try {
    const res  = await fetch("/api/analytics/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ exercise, duration, type, calories, notes })
    });
    const data = await res.json();

    if (res.ok) {
      if (msgEl) {
        msgEl.textContent   = "✅ Session logged successfully!";
        msgEl.className     = "msg msg-success";
        msgEl.style.display = "block";
      }
      ["log-exercise", "log-duration", "log-calories", "log-notes"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      await loadHomeStats();
    } else {
      if (msgEl) {
        msgEl.textContent   = data.error || "Failed to log.";
        msgEl.className     = "msg msg-error";
        msgEl.style.display = "block";
      }
    }
  } catch (e) {
    if (msgEl) {
      msgEl.textContent   = "Server error.";
      msgEl.className     = "msg msg-error";
      msgEl.style.display = "block";
    }
  }
}

// ══════════════════════════════════════════════════
// MARKDOWN RENDERER
// ══════════════════════════════════════════════════

function renderMarkdown(text) {
  if (!text) return "";

  // ── Step 1: extract and replace tables BEFORE escaping ──
  // Tables need raw pipe chars; we pull them out, process, then re-insert.
  const tablePlaceholders = [];
  text = text.replace(/^(\|.+\|\n)((\|[-:| ]+\|\n))(\|.+\|\n?)+/gm, (match) => {
    const rows = match.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return match;

    const headerCells = rows[0].split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
    const isAlignRow  = /^\|[\s\-:|]+\|$/.test(rows[1]);
    if (!isAlignRow) return match;

    // Parse alignment from separator row
    const alignRow = rows[1].split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
    const aligns   = alignRow.map(cell => {
      cell = cell.trim();
      if (cell.startsWith(":") && cell.endsWith(":")) return "center";
      if (cell.endsWith(":"))   return "right";
      return "left";
    });

    const thead = `<thead><tr>${
      headerCells.map((c, i) =>
        `<th style="text-align:${aligns[i] || "left"}">${c.trim()}</th>`
      ).join("")
    }</tr></thead>`;

    const bodyRows = rows.slice(2).map(row => {
      const cells = row.split("|").filter((_, i, a) => i > 0 && i < a.length - 1);
      return `<tr>${
        cells.map((c, i) =>
          `<td style="text-align:${aligns[i] || "left"}">${c.trim()}</td>`
        ).join("")
      }</tr>`;
    }).join("");

    const tableHtml = `<div class="md-table-wrap"><table class="md-table"><${thead}<tbody>${bodyRows}</tbody></table></div>`;
    tablePlaceholders.push(tableHtml);
    return `%%TABLE_${tablePlaceholders.length - 1}%%`;
  });

  // ── Step 2: escape HTML in the remaining text ──
  let html = escapeHtml(text);

  // ── Step 3: restore tables (unescaped) ──
  html = html.replace(/%%TABLE_(\d+)%%/g, (_, i) => tablePlaceholders[parseInt(i)]);

  // ── Step 4: block-level elements ──
  html = html.replace(/^[-*_]{3,}\s*$/gm, "<hr>");
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm,  "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm,   "<h1>$1</h1>");

  html = html.replace(/^(\d+)\.\s+(.+)$/gm,
    "<li class='ol-item'><span class='li-num'>$1</span>$2</li>");
  html = html.replace(/(<li class='ol-item'>.*<\/li>\n?)+/g, m => `<ol>${m}</ol>`);

  html = html.replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>");
  html = html.replace(/(?<!<\/ol>\n?)(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  html = html.replace(/^&gt;\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // ── Step 5: inline elements ──
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g,     "<em>$1</em>");
  html = html.replace(/_(.+?)_/g,       "<em>$1</em>");
  html = html.replace(/`(.+?)`/g,       "<code>$1</code>");

  // ── Step 6: paragraphs ──
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return "";
    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|pre|div|table)/.test(block)) return block;
    if (block.startsWith("%%") || block.includes("<table")) return block;
    return `<p>${block.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  return html;
}

// ══════════════════════════════════════════════════
// PDF EXPORT
// ══════════════════════════════════════════════════

function exportToPDF(resultId, title) {
  const sourceEl = document.getElementById(resultId);
  if (!sourceEl || !sourceEl.innerText.trim()) {
    alert("Nothing to export yet. Generate a plan first!");
    return;
  }

  let printArea = document.getElementById("aria-print-area");
  if (!printArea) {
    printArea = document.createElement("div");
    printArea.id = "aria-print-area";
    document.body.appendChild(printArea);
  }

  const now      = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  const userName = currentUser?.name || "User";
  const userGoal = currentUser?.profile?.goal || "general fitness";

  printArea.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-brand">▲ ARIA — AI Fitness Companion</div>
      <div class="pdf-meta">
        <span><strong>Name:</strong> ${escapeHtml(userName)}</span>
        <span><strong>Goal:</strong> ${escapeHtml(userGoal)}</span>
        <span><strong>Date:</strong> ${now}</span>
      </div>
    </div>
    <h1 class="pdf-title">${escapeHtml(title)}</h1>
    <div class="pdf-body">${sourceEl.innerHTML}</div>
    <div class="pdf-footer">
      Generated by ARIA AI Fitness Companion &nbsp;·&nbsp;
      <em>This is not medical advice. Consult a healthcare professional before starting any fitness programme.</em>
    </div>`;

  window.print();
}

// ══════════════════════════════════════════════════
// CLEAR / RESET FUNCTIONS
// ══════════════════════════════════════════════════

/**
 * clearOutput(type)
 * Clears a single AI output card and removes it from sessionStorage.
 * type = 'workout' | 'diet' | 'wellness'
 */
function clearOutput(type) {
  const outputEl = document.getElementById(`${type}-output`);
  const resultEl = document.getElementById(`${type}-result`);

  if (outputEl) outputEl.style.display = "none";
  if (resultEl) resultEl.innerHTML = "";

  // Remove the session cache for this output
  sessionStorage.removeItem(SESSION_KEYS[type]);
}

/**
 * confirmGlobalReset()
 * Shows a styled confirmation modal then resets everything if confirmed.
 */
function confirmGlobalReset() {
  // Build modal if it doesn't exist
  let modal = document.getElementById("reset-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "reset-modal";
    modal.innerHTML = `
      <div class="reset-modal-backdrop" onclick="closeResetModal()"></div>
      <div class="reset-modal-box">
        <div class="reset-modal-icon">↺</div>
        <h3 class="reset-modal-title">Reset All Outputs?</h3>
        <p class="reset-modal-desc">
          This will clear all current AI outputs (Workout, Diet, Wellness)
          and the chat history from this session.<br><br>
          <strong>Saved plans and workout logs are not affected.</strong>
        </p>
        <div class="reset-modal-actions">
          <button class="btn-secondary" onclick="closeResetModal()">Cancel</button>
          <button class="reset-confirm-btn" onclick="globalReset()">Reset Everything</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = "flex";
}

function closeResetModal() {
  const modal = document.getElementById("reset-modal");
  if (modal) modal.style.display = "none";
}

/**
 * globalReset()
 * Clears all three AI outputs, chat history, and all sessionStorage.
 */
function globalReset() {
  // Clear each output card
  ["workout", "diet", "wellness"].forEach(type => clearOutput(type));

  // Clear chat
  clearChat();

  // Wipe all session storage
  Object.values(SESSION_KEYS).forEach(key => sessionStorage.removeItem(key));

  closeResetModal();

  // Navigate to home and show a brief toast
  openTab("home");
  showToast("✅ All outputs and chat have been reset.");
}

/**
 * showToast(message)
 * Brief non-blocking notification at the bottom of the screen.
 */
function showToast(message) {
  let toast = document.getElementById("aria-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "aria-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

// ══════════════════════════════════════════════════
// COPY UTIL + LOGOUT
// ══════════════════════════════════════════════════

function copyOutput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent).then(() => {
    const btn  = event.target.closest("button");
    const orig = btn.textContent;
    btn.textContent = "✅ Copied!";
    setTimeout(() => btn.textContent = orig, 2000);
  });
}

async function logout() {
  sessionStorage.clear();   // wipe session outputs on logout
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "/login";
}
