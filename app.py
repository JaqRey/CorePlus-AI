"""
AI Fitness Companion - Flask Backend
RESTful API with Gemini AI Integration
"""

from flask import Flask, request, jsonify, session, render_template, redirect, url_for, send_file
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json
import bcrypt
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ── Load environment variables ────────────────────────────────────────
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fitness-companion-secret-2024")
app.permanent_session_lifetime = timedelta(days=7)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"]  = True
CORS(app, supports_credentials=True)

# ── Gemini AI Setup ───────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-flash-lite-latest")

# ── Data file paths ───────────────────────────────────────────────────
DATA_DIR  = "data"
USERS_FILE = os.path.join(DATA_DIR, "users.json")
LOGS_FILE  = os.path.join(DATA_DIR, "fitness_logs.json")
PLANS_FILE = os.path.join(DATA_DIR, "plans.json")

# ── JSON helpers ──────────────────────────────────────────────────────
def read_json(filepath):
    if not os.path.exists(filepath):
        return {}
    with open(filepath, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def write_json(filepath, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def get_users(): return read_json(USERS_FILE)
def save_users(u): write_json(USERS_FILE, u)
def get_logs():  return read_json(LOGS_FILE)
def save_logs(l): write_json(LOGS_FILE, l)
def get_plans(): return read_json(PLANS_FILE)
def save_plans(p): write_json(PLANS_FILE, p)

# ── Prompt templates ──────────────────────────────────────────────────
PROMPT_TEMPLATES = {
    "workout": """You are an expert certified personal trainer and fitness coach.
A user needs a personalized workout plan based on the following information:

- Name: {name}
- Age: {age}
- Weight: {weight} kg
- Height: {height} cm
- Fitness Goal: {goal}
- Fitness Level: {level}
- Available Equipment: {equipment}
- Days per week available: {days}
- Any injuries/limitations: {injuries}

Please provide:
1. A structured weekly workout plan (Day 1–{days})
2. For each day: exercise name, sets, reps, rest time, and a brief tip
3. Warm-up and cool-down recommendations
4. One key motivational note

Format clearly with headers. Keep it practical and safe. This is NOT medical advice.""",

    "diet": """You are a certified nutritionist and diet coach.
Create a personalized meal plan for this user:

- Name: {name}
- Age: {age}
- Weight: {weight} kg
- Height: {height} cm
- Fitness Goal: {goal}
- Dietary Preference: {diet_type}
- Allergies/Restrictions: {allergies}
- Budget level: {budget}

Please provide:
1. Daily calorie and macronutrient targets (protein, carbs, fats)
2. A sample 3-day meal plan (breakfast, lunch, dinner, snacks)
3. Hydration recommendations
4. 3 practical meal prep tips

This is NOT medical advice. Always consult a healthcare professional for medical concerns.""",

    "wellness": """You are a holistic wellness coach specializing in fitness and mental health.
A user is asking for wellness advice:

User Profile:
- Goal: {goal}
- Stress Level: {stress}
- Sleep Hours: {sleep}
- Activity Level: {activity}

User Question: {question}

Provide a warm, encouraging, and practical response covering:
1. Direct answer to their question
2. Actionable wellness tips
3. How this connects to their fitness goal
4. A motivational closing message

This is for general wellness only, NOT medical advice.""",

    "chat": """You are CORA (AI Fitness & Recreation Intelligence Assistant), a friendly,
knowledgeable personal fitness companion. You help users with:
- Workout plans and exercise form
- Diet and nutrition guidance
- Motivation and goal setting
- Recovery and injury prevention tips
- General wellness advice

User Profile:
- Name: {name}
- Goal: {goal}
- Fitness Level: {level}

Conversation History:
{history}

User's latest message: {message}

Respond in a friendly, encouraging tone. Be specific and practical.
If asked about medical conditions, always recommend consulting a healthcare professional.
Keep responses concise but helpful (2-4 paragraphs max)."""
}

def build_prompt(key, **kwargs):
    t = PROMPT_TEMPLATES.get(key, "")
    try:
        return t.format(**kwargs)
    except KeyError:
        return t

def generate_ai_response(prompt):
    try:
        return model.generate_content(prompt).text
    except Exception as e:
        return f"AI service temporarily unavailable. Error: {str(e)}"

# ════════════════════════════════════════════════════════════════════
# PAGE ROUTES
# ════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    # Always go to login first; redirect to dashboard only if already logged in
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return redirect(url_for("login_page"))

@app.route("/login")
def login_page():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/register")
def register_page():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("register.html")

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("dashboard.html")

@app.route("/analytics")
def analytics():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("analytics.html")

@app.route("/settings")
def settings_page():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("settings.html")

# ════════════════════════════════════════════════════════════════════
# AUTH API
# ════════════════════════════════════════════════════════════════════

@app.route("/api/auth/register", methods=["POST"])
def api_register():
    data = request.get_json()
    for field in ["username", "email", "password", "name"]:
        if not data.get(field):
            return jsonify({"error": f"'{field}' is required."}), 400

    users = get_users()
    for u in users.values():
        if u["email"] == data["email"]:
            return jsonify({"error": "Email already registered."}), 409
        if u["username"] == data["username"]:
            return jsonify({"error": "Username already taken."}), 409

    hashed_pw = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    users[user_id] = {
        "id": user_id,
        "username": data["username"],
        "email": data["email"],
        "password": hashed_pw,
        "name": data["name"],
        "profile": {
            "age": data.get("age", ""),
            "weight": data.get("weight", ""),
            "height": data.get("height", ""),
            "goal": data.get("goal", "general fitness"),
            "level": data.get("level", "beginner"),
            "diet_type": data.get("diet_type", "balanced"),
            "allergies": data.get("allergies", "none"),
            "equipment": data.get("equipment", "none"),
            "injuries": data.get("injuries", "none"),
            "days": data.get("days", "3"),
        },
        "created_at": datetime.now().isoformat()
    }
    save_users(users)
    session.permanent = True
    session["user_id"] = user_id
    session["username"] = data["username"]
    return jsonify({"message": "Registration successful!", "username": data["username"]}), 201


@app.route("/api/auth/login", methods=["POST"])
def api_login():
    data = request.get_json()
    if not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email and password required."}), 400
    users = get_users()
    for user_id, user in users.items():
        if user["email"] == data["email"]:
            if bcrypt.checkpw(data["password"].encode(), user["password"].encode()):
                session.permanent = True
                session["user_id"] = user_id
                session["username"] = user["username"]
                return jsonify({"message": "Login successful!", "username": user["username"], "name": user["name"]})
            return jsonify({"error": "Incorrect password."}), 401
    return jsonify({"error": "Email not found."}), 404


@app.route("/api/auth/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."})


@app.route("/api/auth/me", methods=["GET"])
def api_me():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    users = get_users()
    user = users.get(session["user_id"], {})
    return jsonify({k: v for k, v in user.items() if k != "password"})


@app.route("/api/auth/profile", methods=["PUT"])
def api_update_profile():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json()
    users = get_users()
    user = users.get(session["user_id"])
    if not user:
        return jsonify({"error": "User not found."}), 404

    # Update top-level fields
    for field in ["name"]:
        if field in data:
            user[field] = data[field]

    # Update profile sub-fields
    profile_fields = ["age", "weight", "height", "goal", "level",
                      "diet_type", "allergies", "equipment", "injuries", "days"]
    for field in profile_fields:
        if field in data:
            user["profile"][field] = data[field]

    save_users(users)
    return jsonify({"message": "Profile updated!", "profile": user["profile"], "name": user["name"]})


@app.route("/api/auth/change-password", methods=["PUT"])
def api_change_password():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json()
    current_pw = data.get("current_password", "")
    new_pw     = data.get("new_password", "")
    if not current_pw or not new_pw:
        return jsonify({"error": "Both current and new password are required."}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400

    users = get_users()
    user  = users.get(session["user_id"])
    if not bcrypt.checkpw(current_pw.encode(), user["password"].encode()):
        return jsonify({"error": "Current password is incorrect."}), 401

    user["password"] = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    save_users(users)
    return jsonify({"message": "Password changed successfully!"})

# ════════════════════════════════════════════════════════════════════
# AI API
# ════════════════════════════════════════════════════════════════════

@app.route("/api/ai/workout", methods=["POST"])
def ai_workout():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    users   = get_users()
    user    = users.get(session["user_id"])
    profile = user.get("profile", {})
    data    = request.get_json() or {}

    prompt = build_prompt("workout",
        name=user.get("name", "User"),
        age=profile.get("age", "unknown"),
        weight=profile.get("weight", "unknown"),
        height=profile.get("height", "unknown"),
        goal=data.get("goal", profile.get("goal", "general fitness")),
        level=data.get("level", profile.get("level", "beginner")),
        equipment=data.get("equipment", profile.get("equipment", "none")),
        days=data.get("days", profile.get("days", "3")),
        injuries=profile.get("injuries", "none")
    )
    return jsonify({"response": generate_ai_response(prompt), "prompt_used": "workout"})


@app.route("/api/ai/diet", methods=["POST"])
def ai_diet():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    users   = get_users()
    user    = users.get(session["user_id"])
    profile = user.get("profile", {})
    data    = request.get_json() or {}

    prompt = build_prompt("diet",
        name=user.get("name", "User"),
        age=profile.get("age", "unknown"),
        weight=profile.get("weight", "unknown"),
        height=profile.get("height", "unknown"),
        goal=data.get("goal", profile.get("goal", "general fitness")),
        diet_type=data.get("diet_type", profile.get("diet_type", "balanced")),
        allergies=profile.get("allergies", "none"),
        budget=data.get("budget", "moderate")
    )
    return jsonify({"response": generate_ai_response(prompt), "prompt_used": "diet"})


@app.route("/api/ai/wellness", methods=["POST"])
def ai_wellness():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    users   = get_users()
    user    = users.get(session["user_id"])
    profile = user.get("profile", {})
    data    = request.get_json() or {}

    prompt = build_prompt("wellness",
        goal=profile.get("goal", "general fitness"),
        stress=data.get("stress", "moderate"),
        sleep=data.get("sleep", "7"),
        activity=profile.get("level", "moderate"),
        question=data.get("question", "How can I improve my overall wellness?")
    )
    return jsonify({"response": generate_ai_response(prompt), "prompt_used": "wellness"})


@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    users   = get_users()
    user    = users.get(session["user_id"])
    profile = user.get("profile", {})
    data    = request.get_json() or {}

    history = data.get("history", [])
    history_text = "\n".join([
        f"{'User' if m['role'] == 'user' else 'CorePlus AI'}: {m['content']}"
        for m in history[-6:]
    ])
    prompt = build_prompt("chat",
        name=user.get("name", "Friend"),
        goal=profile.get("goal", "general fitness"),
        level=profile.get("level", "beginner"),
        history=history_text or "No previous messages.",
        message=data.get("message", "Hello!")
    )
    return jsonify({"response": generate_ai_response(prompt)})

# ════════════════════════════════════════════════════════════════════
# FITNESS LOG & ANALYTICS API
# ════════════════════════════════════════════════════════════════════

@app.route("/api/analytics/log", methods=["POST"])
def manual_log():
    """Save a manually logged workout session."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json() or {}

    # Validate required fields
    if not data.get("exercise") or not data.get("duration"):
        return jsonify({"error": "Exercise name and duration are required."}), 400

    logs = get_logs()
    uid  = session["user_id"]
    if uid not in logs:
        logs[uid] = []

    logs[uid].append({
        "id":        str(uuid.uuid4()),
        "type":      data.get("type", "workout"),
        "exercise":  data.get("exercise", ""),
        "duration":  int(data.get("duration", 0)),   # minutes
        "calories":  int(data.get("calories", 0)) if data.get("calories") else 0,
        "notes":     data.get("notes", ""),
        "timestamp": datetime.now().isoformat()
    })
    save_logs(logs)
    return jsonify({"message": "Session logged successfully!"})


@app.route("/api/analytics/logs", methods=["GET"])
def get_user_logs():
    """Return all workout logs for the current user, newest first."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401

    logs      = get_logs()
    user_logs = list(reversed(logs.get(session["user_id"], [])))

    # Optional filter
    log_type = request.args.get("type")
    if log_type:
        user_logs = [l for l in user_logs if l.get("type") == log_type]

    return jsonify({"logs": user_logs, "total": len(user_logs)})


@app.route("/api/analytics/log/<log_id>", methods=["DELETE"])
def delete_log(log_id):
    """Delete a single log entry by id."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    logs = get_logs()
    uid  = session["user_id"]
    before = len(logs.get(uid, []))
    logs[uid] = [l for l in logs.get(uid, []) if l.get("id") != log_id]
    if len(logs[uid]) == before:
        return jsonify({"error": "Log not found."}), 404
    save_logs(logs)
    return jsonify({"message": "Log deleted."})


@app.route("/api/analytics/summary", methods=["GET"])
def get_analytics_summary():
    """
    Returns real fitness progress stats derived exclusively from
    manually logged workout sessions (not AI feature usage).
    """
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401

    logs      = get_logs()
    user_logs = logs.get(session["user_id"], [])

    total_sessions  = len(user_logs)
    total_minutes   = sum(int(l.get("duration", 0)) for l in user_logs)
    total_calories  = sum(int(l.get("calories",  0)) for l in user_logs)
    total_hours     = round(total_minutes / 60, 1)

    # Breakdown by activity type
    type_counts    = {}
    type_minutes   = {}
    type_calories  = {}
    daily_minutes  = {}
    daily_calories = {}
    daily_sessions = {}

    for l in user_logs:
        t    = l.get("type", "workout")
        mins = int(l.get("duration", 0))
        cals = int(l.get("calories",  0))
        date = l.get("timestamp", "")[:10]

        type_counts[t]   = type_counts.get(t, 0) + 1
        type_minutes[t]  = type_minutes.get(t, 0) + mins
        type_calories[t] = type_calories.get(t, 0) + cals

        daily_minutes[date]  = daily_minutes.get(date, 0) + mins
        daily_calories[date] = daily_calories.get(date, 0) + cals
        daily_sessions[date] = daily_sessions.get(date, 0) + 1

    # Last 30 days chart data (JS slices to 7/14/30 based on user selection)
    today   = datetime.now().date()
    last_30 = [(today - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
    daily_chart = [{
        "date":     d,
        "minutes":  daily_minutes.get(d, 0),
        "calories": daily_calories.get(d, 0),
        "sessions": daily_sessions.get(d, 0),
    } for d in last_30]

    # Streak (consecutive days with ≥1 session)
    streak = 0
    for i in range(365):
        d = (today - timedelta(days=i)).isoformat()
        if daily_sessions.get(d, 0) > 0:
            streak += 1
        else:
            break

    # Most trained activity
    most_used = max(type_counts, key=type_counts.get) if type_counts else "—"

    # Average session duration
    avg_duration = round(total_minutes / total_sessions, 1) if total_sessions else 0

    return jsonify({
        "total_sessions":  total_sessions,
        "total_hours":     total_hours,
        "total_minutes":   total_minutes,
        "total_calories":  total_calories,
        "avg_duration":    avg_duration,
        "streak":          streak,
        "most_used":       most_used,
        "by_type":         type_counts,
        "type_minutes":    type_minutes,
        "type_calories":   type_calories,
        "daily_chart":     daily_chart,
    })


# ════════════════════════════════════════════════════════════════════
# PLANS API
# ════════════════════════════════════════════════════════════════════

@app.route("/api/plans/save", methods=["POST"])
def save_plan():
    """Save an AI-generated plan (workout, diet, or wellness)."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json() or {}

    # Validate required fields
    if not data.get("type") or not data.get("title") or not data.get("content"):
        return jsonify({"error": "Type, title, and content are required."}), 400

    plans = get_plans()
    uid = session["user_id"]
    if uid not in plans:
        plans[uid] = []

    plans[uid].append({
        "id":        str(uuid.uuid4()),
        "type":      data.get("type"),
        "title":     data.get("title"),
        "content":   data.get("content"),
        "saved_at":  datetime.now().isoformat()
    })
    save_plans(plans)
    return jsonify({"message": "Plan saved successfully!", "plans": plans.get(uid, [])}), 201


@app.route("/api/plans", methods=["GET"])
def get_user_plans():
    """Retrieve all saved plans for the current user."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401

    plans = get_plans()
    user_plans = list(reversed(plans.get(session["user_id"], [])))

    # Optional filter by type
    plan_type = request.args.get("type")
    if plan_type:
        user_plans = [p for p in user_plans if p.get("type") == plan_type]

    return jsonify({"plans": user_plans, "total": len(user_plans)})


@app.route("/api/plans/<plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    """Delete a single saved plan by id."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    plans = get_plans()
    uid = session["user_id"]
    before = len(plans.get(uid, []))
    plans[uid] = [p for p in plans.get(uid, []) if p.get("id") != plan_id]
    if len(plans[uid]) == before:
        return jsonify({"error": "Plan not found."}), 404
    save_plans(plans)
    return jsonify({"message": "Plan deleted."})


@app.route("/api/plans/<plan_id>/export-pdf", methods=["GET"])
def export_plan_pdf(plan_id):
    """Export a saved plan as PDF."""
    if "user_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    
    plans = get_plans()
    uid = session["user_id"]
    user_plans = plans.get(uid, [])
    
    plan = None
    for p in user_plans:
        if p.get("id") == plan_id:
            plan = p
            break
    
    if not plan:
        return jsonify({"error": "Plan not found."}), 404
    
    try:
        users = get_users()
        user = users.get(uid, {})
        
        # Create PDF in memory
        pdf_buffer = BytesIO()
        doc = SimpleDocTemplate(pdf_buffer, pagesize=letter,
                                topMargin=0.5*inch, bottomMargin=0.5*inch,
                                leftMargin=0.75*inch, rightMargin=0.75*inch)
        
        styles = getSampleStyleSheet()
        story = []
        
        # Header
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=24,
            textColor='#FF6B35',
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph("▲ ARIA", header_style))
        story.append(Paragraph("AI Fitness Companion", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Meta info
        now = datetime.now().strftime("%B %d, %Y")
        user_name = user.get("name", "User")
        user_goal = user.get("profile", {}).get("goal", "general fitness")
        
        meta_style = ParagraphStyle(
            'Meta',
            parent=styles['Normal'],
            fontSize=10,
            textColor='#666666',
            alignment=TA_CENTER,
            spaceAfter=12
        )
        story.append(Paragraph(f"<b>Name:</b> {user_name} | <b>Goal:</b> {user_goal} | <b>Date:</b> {now}", meta_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Title
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading2'],
            fontSize=18,
            textColor='#333333',
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        story.append(Paragraph(plan.get("title", "Fitness Plan"), title_style))
        story.append(Spacer(1, 0.15*inch))
        
        # Content - parse markdown-like content
        content = plan.get("content", "")
        lines = content.split('\n')
        
        body_style = styles['BodyText']
        body_style.fontSize = 11
        body_style.leading = 14
        
        for line in lines:
            line = line.strip()
            if not line:
                story.append(Spacer(1, 0.1*inch))
            elif line.startswith("##"):
                h2_style = ParagraphStyle(
                    'H2',
                    parent=styles['Heading2'],
                    fontSize=14,
                    textColor='#333333',
                    spaceAfter=8,
                    spaceBefore=8,
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(line.replace("##", "").strip(), h2_style))
            elif line.startswith("#"):
                h1_style = ParagraphStyle(
                    'H1',
                    parent=styles['Heading1'],
                    fontSize=16,
                    textColor='#333333',
                    spaceAfter=10,
                    spaceBefore=10,
                    fontName='Helvetica-Bold'
                )
                story.append(Paragraph(line.replace("#", "").strip(), h1_style))
            else:
                story.append(Paragraph(line, body_style))
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=9,
            textColor='#999999',
            alignment=TA_CENTER
        )
        story.append(Paragraph("Generated by ARIA AI Fitness Companion &nbsp;·&nbsp; <i>This is not medical advice.</i>", footer_style))
        
        # Build PDF
        doc.build(story)
        pdf_buffer.seek(0)
        
        filename = f"fitness_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500


# ════════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    print("=" * 50)
    print("  AI Fitness Companion  →  http://127.0.0.1:5000")
    print("=" * 50)
    app.run(debug=True, host="127.0.0.1", port=5000)



