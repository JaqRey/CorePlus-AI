// ── ARIA Login & Register JS ─────────────────────────────────────────

function showMsg(id, text, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `msg msg-${type}`;
  el.style.display = "block";
  if (type === "success") setTimeout(() => el.style.display = "none", 4000);
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}

function togglePassword() {
  const input = document.getElementById("password");
  input.type = input.type === "password" ? "text" : "password";
}

function toggleRegPassword() {
  const input = document.getElementById("reg-password");
  input.type = input.type === "password" ? "text" : "password";
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");
  btn.disabled = loading;
  if (text) text.style.display = loading ? "none" : "inline";
  if (loader) loader.style.display = loading ? "inline" : "none";
}

// ── LOGIN ───────────────────────────────────────────────────────────
async function handleLogin() {
  hideMsg("error-msg");
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    showMsg("error-msg", "Please fill in all fields.");
    return;
  }

  setLoading("login-btn", true);

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      showMsg("success-msg", `Welcome back, ${data.name}! Redirecting…`, "success");
      setTimeout(() => window.location.href = "/dashboard", 1000);
    } else {
      showMsg("error-msg", data.error || "Login failed.");
    }
  } catch (err) {
    showMsg("error-msg", "Could not reach server. Make sure Flask is running.");
  } finally {
    setLoading("login-btn", false);
  }
}

// ── REGISTER ─────────────────────────────────────────────────────────
let currentStep = 1;

function nextStep(from) {
  if (from === 1) {
    const name = document.getElementById("reg-name")?.value.trim();
    const username = document.getElementById("reg-username")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;

    if (!name || !username || !email || !password) {
      showMsg("error-msg", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      showMsg("error-msg", "Password must be at least 6 characters.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      showMsg("error-msg", "Please enter a valid email address.");
      return;
    }
    hideMsg("error-msg");
  }
  goToStep(from + 1);
}

function prevStep(from) {
  goToStep(from - 1);
}

function goToStep(step) {
  document.querySelectorAll(".form-step").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".step").forEach(s => {
    const n = parseInt(s.dataset.step);
    s.classList.remove("active", "done");
    if (n < step) s.classList.add("done");
    if (n === step) s.classList.add("active");
  });
  document.getElementById(`step-${step}`)?.classList.add("active");
  currentStep = step;
}

async function handleRegister() {
  hideMsg("error-msg");
  const btn = document.getElementById("register-btn");

  const payload = {
    name: document.getElementById("reg-name")?.value.trim(),
    username: document.getElementById("reg-username")?.value.trim(),
    email: document.getElementById("reg-email")?.value.trim(),
    password: document.getElementById("reg-password")?.value,
    age: document.getElementById("reg-age")?.value,
    weight: document.getElementById("reg-weight")?.value,
    height: document.getElementById("reg-height")?.value,
    injuries: document.getElementById("reg-injuries")?.value.trim() || "none",
    goal: document.getElementById("reg-goal")?.value,
    level: document.getElementById("reg-level")?.value,
    days: document.getElementById("reg-days")?.value,
    diet_type: document.getElementById("reg-diet")?.value,
    equipment: document.getElementById("reg-equipment")?.value,
    allergies: document.getElementById("reg-allergies")?.value.trim() || "none",
  };

  setLoading("register-btn", true);

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      showMsg("success-msg", "Account created! Taking you to your dashboard…", "success");
      setTimeout(() => window.location.href = "/dashboard", 1200);
    } else {
      showMsg("error-msg", data.error || "Registration failed.");
    }
  } catch (err) {
    showMsg("error-msg", "Could not reach server. Make sure Flask is running.");
  } finally {
    setLoading("register-btn", false);
  }
}

// Enter key on login form
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("login-btn")) {
    handleLogin();
  }
});
