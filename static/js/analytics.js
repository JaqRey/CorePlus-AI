// ── ARIA Analytics JS ────────────────────────────────────────────────

let caloriesChart = null;
let hoursChart    = null;
let streakChart   = null;
let allLogs       = [];
let dailyData     = [];   // full daily_chart from API (up to 30 days)
let currentRange  = 14;

document.addEventListener("DOMContentLoaded", () => {
  loadSidebarUser();
  loadAnalytics();
});

// ══════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════

async function loadSidebarUser() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) { window.location.href = "/login"; return; }
    const user = await res.json();
    const name = user.name || user.username || "—";
    const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("user-name-display", name);
    set("user-goal-display", user.profile?.goal || "—");
    set("user-avatar",       name.charAt(0).toUpperCase());
    const ma = document.getElementById("mobile-avatar");
    if (ma) ma.textContent = name.charAt(0).toUpperCase();
  } catch (e) { console.error(e); }
}

// ══════════════════════════════════════════════════
// MAIN LOAD
// ══════════════════════════════════════════════════

async function loadAnalytics() {
  await Promise.all([loadSummary(), loadLogs()]);
}

// ══════════════════════════════════════════════════
// SUMMARY + CHARTS
// ══════════════════════════════════════════════════

async function loadSummary() {
  try {
    const res = await fetch("/api/analytics/summary", { credentials: "include" });
    if (!res.ok) return;
    const d = await res.json();

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("a-sessions", d.total_sessions ?? 0);
    set("a-hours",    d.total_hours    ?? 0);
    set("a-calories", (d.total_calories ?? 0).toLocaleString());
    set("a-streak",   d.streak ? `${d.streak} day${d.streak !== 1 ? "s" : ""}` : "0 days");
    set("a-avg",      d.avg_duration ?? 0);
    set("a-most",     d.most_used ?? "—");
    set("streak-inline", d.streak ?? 0);

    // Store full 30-day daily data then draw charts for current range
    dailyData = d.daily_chart || [];
    drawAllCharts();

  } catch (e) { console.error("Summary error:", e); }
}

// ── Range selector ────────────────────────────────
function setRange(days, btn) {
  currentRange = days;
  document.querySelectorAll(".rtog").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  drawAllCharts();
}

// ── Draw all three charts with current range ──────
function drawAllCharts() {
  const slice = dailyData.slice(-currentRange);
  renderCaloriesChart(slice);
  renderHoursChart(slice);
  renderStreakChart(slice);
}

// ── Shared chart config helpers ───────────────────
function chartLabels(data) {
  return data.map(d => {
    const dt = new Date(d.date + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

const tooltipDefaults = {
  backgroundColor: "#11151e",
  borderColor: "rgba(255,255,255,0.1)",
  borderWidth: 1,
  titleColor: "#e8eaf0",
  bodyColor: "#7a8299",
  padding: 10,
};

function baseBarOptions(yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipDefaults, callbacks: {
        label: ctx => ` ${ctx.parsed.y.toLocaleString()} ${yLabel}`
      }}
    },
    scales: {
      x: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7a8299", font: { size: 10 }, maxRotation: 45 }
      },
      y: {
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7a8299" },
        beginAtZero: true,
      }
    }
  };
}

// ══════════════════════════════════════════════════
// CHART 1 — CALORIES BURNED (orange bars)
// ══════════════════════════════════════════════════

function renderCaloriesChart(data) {
  const ctx = document.getElementById("caloriesChart");
  if (!ctx) return;

  const labels = chartLabels(data);
  const values = data.map(d => d.calories ?? 0);
  const total  = values.reduce((a, b) => a + b, 0);

  const totalEl = document.getElementById("chart-total-cal");
  if (totalEl) totalEl.textContent = `${total.toLocaleString()} kcal total`;

  if (caloriesChart) caloriesChart.destroy();

  caloriesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Calories",
        data: values,
        backgroundColor: values.map(v =>
          v > 0 ? "rgba(255,140,50,0.7)" : "rgba(255,255,255,0.04)"
        ),
        borderColor: values.map(v =>
          v > 0 ? "rgba(255,140,50,1)" : "rgba(255,255,255,0.07)"
        ),
        borderWidth: 1,
        borderRadius: 5,
      }]
    },
    options: baseBarOptions("kcal"),
  });
}

// ══════════════════════════════════════════════════
// CHART 2 — HOURS TRAINED (blue line + fill)
// ══════════════════════════════════════════════════

function renderHoursChart(data) {
  const ctx = document.getElementById("hoursChart");
  if (!ctx) return;

  const labels = chartLabels(data);
  const values = data.map(d => d.minutes ? +(d.minutes / 60).toFixed(2) : 0);
  const total  = +(values.reduce((a, b) => a + b, 0)).toFixed(1);

  const totalEl = document.getElementById("chart-total-hrs");
  if (totalEl) totalEl.textContent = `${total} hrs total`;

  if (hoursChart) hoursChart.destroy();

  hoursChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Hours",
        data: values,
        borderColor: "rgba(90,159,254,1)",
        backgroundColor: "rgba(90,159,254,0.12)",
        borderWidth: 2.5,
        pointBackgroundColor: values.map(v =>
          v > 0 ? "rgba(90,159,254,1)" : "transparent"
        ),
        pointBorderColor: "rgba(90,159,254,1)",
        pointRadius: values.map(v => v > 0 ? 4 : 0),
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipDefaults, callbacks: {
          label: ctx => ` ${ctx.parsed.y.toFixed(2)} hrs`
        }}
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7a8299", font: { size: 10 }, maxRotation: 45 }
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7a8299", callback: v => `${v}h` },
          beginAtZero: true,
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════
// CHART 3 — DAILY STREAK (green heatmap bars)
// ══════════════════════════════════════════════════

function renderStreakChart(data) {
  const ctx = document.getElementById("streakChart");
  if (!ctx) return;

  const labels = chartLabels(data);

  // For each day compute cumulative running streak up to that day
  // Values: 1 = worked out, 0 = rest day  (for the bar height)
  const active = data.map(d => (d.sessions ?? 0) > 0 ? 1 : 0);

  // Build running streak array
  const runningStreak = [];
  let s = 0;
  for (const a of active) {
    s = a > 0 ? s + 1 : 0;
    runningStreak.push(s);
  }

  const activeDays = active.filter(v => v > 0).length;
  const totalEl = document.getElementById("chart-total-days");
  if (totalEl) totalEl.textContent = `${activeDays} active day${activeDays !== 1 ? "s" : ""}`;

  if (streakChart) streakChart.destroy();

  streakChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          // Background: dim bar showing the day exists
          label: "Rest Day",
          data: active.map(v => v === 0 ? 1 : 0),
          backgroundColor: "rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderRadius: 5,
          stack: "days",
        },
        {
          // Foreground: bright bar = active day
          label: "Active Day",
          data: active,
          backgroundColor: active.map(v =>
            v > 0 ? "rgba(78,240,170,0.75)" : "transparent"
          ),
          borderColor: active.map(v =>
            v > 0 ? "rgba(78,240,170,1)" : "transparent"
          ),
          borderWidth: 1,
          borderRadius: 5,
          stack: "days",
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipDefaults,
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => {
              const idx   = ctx.dataIndex;
              const isOn  = active[idx] > 0;
              const streak = runningStreak[idx];
              return isOn
                ? ` ✅ Workout day  (streak: ${streak})`
                : ` 💤 Rest day`;
            },
            // Only show one tooltip item per day
            filter: (item) => item.datasetIndex === 1 || active[item.dataIndex] === 0,
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#7a8299", font: { size: 10 }, maxRotation: 45 }
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { display: false },
          max: 1.4,
          beginAtZero: true,
        }
      }
    }
  });
}

// ══════════════════════════════════════════════════
// SESSIONS TABLE
// ══════════════════════════════════════════════════

async function loadLogs() {
  try {
    const res = await fetch("/api/analytics/logs", { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    allLogs = data.logs || [];
    renderLogs(allLogs);
  } catch (e) { console.error("Logs error:", e); }
}

function renderLogs(logs) {
  const tbody  = document.getElementById("logs-tbody");
  const footer = document.getElementById("table-footer");
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">
      No sessions logged yet. Go to
      <a href="/dashboard">Dashboard → Log Workout</a> to record your first session!
    </td></tr>`;
    if (footer) footer.innerHTML = "";
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const dt      = new Date(log.timestamp);
    const timeStr = dt.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
    const dur   = log.duration ? `${log.duration} min` : "—";
    const cal   = log.calories ? `${log.calories} kcal` : "—";
    const notes = log.notes    ? escapeHtml(log.notes)  : "<span class='text-muted'>—</span>";

    return `<tr data-id="${log.id}">
      <td><span class="type-badge ${log.type}">${typeIcon(log.type)} ${log.type}</span></td>
      <td class="log-exercise">${escapeHtml(log.exercise || "—")}</td>
      <td class="log-num">${dur}</td>
      <td class="log-num">${cal}</td>
      <td class="log-notes">${notes}</td>
      <td class="log-time">${timeStr}</td>
      <td><button class="del-btn" onclick="deleteLog('${log.id}')" title="Delete">🗑</button></td>
    </tr>`;
  }).join("");

  if (footer) {
    const totalMin = logs.reduce((s, l) => s + (l.duration || 0), 0);
    const totalCal = logs.reduce((s, l) => s + (l.calories || 0), 0);
    footer.innerHTML = `
      <span>Showing <strong>${logs.length}</strong> session${logs.length !== 1 ? "s" : ""}</span>
      <span>Total: <strong>${totalMin} min</strong> &nbsp;·&nbsp;
            <strong>${totalCal.toLocaleString()} kcal</strong></span>
    `;
  }
}

function filterLogs(type) {
  renderLogs(type ? allLogs.filter(l => l.type === type) : allLogs);
}

async function deleteLog(id) {
  if (!confirm("Delete this session? This cannot be undone.")) return;
  try {
    const res = await fetch(`/api/analytics/log/${id}`, {
      method: "DELETE", credentials: "include"
    });
    if (res.ok) {
      allLogs = allLogs.filter(l => l.id !== id);
      renderLogs(allLogs);
      await loadSummary();   // refresh stats + charts
    } else {
      alert("Could not delete session.");
    }
  } catch (e) {
    alert("Server error.");
  }
}

// ══════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════

function typeIcon(type) {
  return { workout: "🏋️", cardio: "🏃", yoga: "🧘", sports: "⚽", walk: "🚶" }[type] || "📊";
}

function escapeHtml(text) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(String(text)));
  return d.innerHTML;
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "/login";
}
