// ── ARIA Settings JS ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserData();
});

async function loadUserData() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) { window.location.href = "/login"; return; }
    const user = await res.json();
    populateAll(user);
  } catch (e) {
    console.error("Failed to load user:", e);
  }
}

function populateAll(user) {
  const p    = user.profile || {};
  const name = user.name || user.username || "—";
  const set  = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
  const text = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || "—"; };

  // Sidebar
  text("user-name-display", name);
  text("user-goal-display", p.goal);
  const av = document.getElementById("user-avatar");
  if (av) av.textContent = name.charAt(0).toUpperCase();
  const ma = document.getElementById("mobile-avatar");
  if (ma) ma.textContent = name.charAt(0).toUpperCase();

  // Profile card header
  const ba = document.getElementById("big-avatar");
  if (ba) ba.textContent = name.charAt(0).toUpperCase();
  text("display-name",   name);
  text("display-email",  user.email);
  text("display-joined", user.created_at
    ? "Member since " + new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "");

  // Profile tab fields
  set("s-name",    user.name);
  set("s-age",     p.age);
  set("s-weight",  p.weight);
  set("s-height",  p.height);
  set("s-injuries",p.injuries);

  // Fitness tab fields
  set("s-goal",      p.goal);
  set("s-level",     p.level);
  set("s-days",      p.days);
  set("s-diet",      p.diet_type);
  set("s-equipment", p.equipment);
  set("s-allergies", p.allergies);

  // Security info
  text("info-username", user.username);
  text("info-email",    user.email);
  text("info-joined",   user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { dateStyle: "long" })
    : "—");
}

// ── Tab switching ─────────────────────────────────────────────────
function switchSettingsTab(name, btn) {
  document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".stab").forEach(b => b.classList.remove("active"));
  document.getElementById(`stab-${name}`)?.classList.add("active");
  btn.classList.add("active");
}

// ── Save profile ──────────────────────────────────────────────────
async function saveProfile() {
  const payload = {
    name:     document.getElementById("s-name")?.value.trim(),
    age:      document.getElementById("s-age")?.value,
    weight:   document.getElementById("s-weight")?.value,
    height:   document.getElementById("s-height")?.value,
    injuries: document.getElementById("s-injuries")?.value.trim(),
  };

  if (!payload.name) {
    showMsg("profile-msg", "Name is required.", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("profile-msg", "✅ Profile saved!", "success");
      // Update sidebar name live
      const newName = payload.name;
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("user-name-display", newName);
      set("display-name", newName);
      const av = document.getElementById("user-avatar");
      const ba = document.getElementById("big-avatar");
      if (av) av.textContent = newName.charAt(0).toUpperCase();
      if (ba) ba.textContent = newName.charAt(0).toUpperCase();
    } else {
      showMsg("profile-msg", data.error || "Failed to save.", "error");
    }
  } catch (e) {
    showMsg("profile-msg", "Server error.", "error");
  }
}

// ── Save fitness prefs ────────────────────────────────────────────
async function saveFitness() {
  const payload = {
    goal:      document.getElementById("s-goal")?.value,
    level:     document.getElementById("s-level")?.value,
    days:      document.getElementById("s-days")?.value,
    diet_type: document.getElementById("s-diet")?.value,
    equipment: document.getElementById("s-equipment")?.value,
    allergies: document.getElementById("s-allergies")?.value.trim(),
  };

  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("fitness-msg", "✅ Fitness settings saved!", "success");
      const el = document.getElementById("user-goal-display");
      if (el) el.textContent = payload.goal;
    } else {
      showMsg("fitness-msg", data.error || "Failed to save.", "error");
    }
  } catch (e) {
    showMsg("fitness-msg", "Server error.", "error");
  }
}

// ── Change password ───────────────────────────────────────────────
async function changePassword() {
  const curPw  = document.getElementById("s-cur-pw")?.value;
  const newPw  = document.getElementById("s-new-pw")?.value;
  const confPw = document.getElementById("s-confirm-pw")?.value;

  if (!curPw || !newPw || !confPw) {
    showMsg("security-msg", "All three fields are required.", "error"); return;
  }
  if (newPw !== confPw) {
    showMsg("security-msg", "New passwords do not match.", "error"); return;
  }
  if (newPw.length < 6) {
    showMsg("security-msg", "New password must be at least 6 characters.", "error"); return;
  }

  try {
    const res = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ current_password: curPw, new_password: newPw })
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("security-msg", "✅ Password updated!", "success");
      ["s-cur-pw", "s-new-pw", "s-confirm-pw"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
    } else {
      showMsg("security-msg", data.error || "Failed to update.", "error");
    }
  } catch (e) {
    showMsg("security-msg", "Server error.", "error");
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `msg msg-${type}`;
  el.style.display = "block";
  if (type === "success") setTimeout(() => el.style.display = "none", 3500);
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  window.location.href = "/login";
}
