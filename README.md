# CorePlus AI — AI Fitness Companion

### Artificial Recreation & fitness Intelligence Assistant
#### Full-Stack AI-Powered Personal Fitness Web Application
#### Powered by Google Gemini 1.5 Flash · Python Flask · Localhost

---

> **⚠️ Disclaimer:** CorePlus AI is a general wellness and fitness guidance tool only. It is **not** a medical application. All AI-generated content is for informational purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before beginning any new fitness or diet programme, especially if you have pre-existing conditions or injuries.

---


| Requirement | Version | Check Command |
| :--- | :--- | :--- |
| Python | 3.11 or higher | `python3 --version` |
| pip | Latest | `pip3 --version` |
| A Gemini API key | — | See Step 2 below |
| A modern browser | Chrome, Safari, Firefox | — |

---

### Step 1 — Install Python

Download from [https://python.org/downloads](https://python.org/downloads)

**macOS (recommended via Homebrew):**
```bash
brew install python
```

**Verify the installation:**
```bash
python3 --version
# Expected: Python 3.11.x or higher
```

---

### Step 2 — Get Your Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and store it somewhere safe

---

### Step 3 — Set Up the Project

```bash
# Navigate into the project folder
cd ai-fitness-companion

# (Recommended) Create a virtual environment
python3 -m venv venv
source venv/bin/activate      # macOS / Linux
# venv\Scripts\activate       # Windows

# Install all dependencies
pip3 install -r requirements.txt
```

---

### Step 4 — Configure Environment Variables

Create a file called `.env` in the root project folder:

```
GEMINI_API_KEY=your_actual_key_here
SECRET_KEY=any-random-string-you-choose-123
```

> **Do not share your `.env` file or commit it to version control.**

---

### Step 5 — Add Your Logo

Place your `logo.png` file at:
```
static/images/logo.png
```

---

### Step 6 — Run the Application

```bash
python3 app.py
```

You should see:
```
==================================================
  AI Fitness Companion  →  http://127.0.0.1:5000
==================================================
```

Open your browser and navigate to **http://127.0.0.1:5000**

The `data/` folder and all JSON files are created automatically on the first run.

---

### Verifying API Connectivity

To confirm that your Gemini API key is working, create a file `test_api.py`:

```python
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

response = model.generate_content("Say hello and confirm you are Gemini AI.")
print("STATUS: 200 OK")
print(response.text)
```

Run it:
```bash
python3 test_api.py
```

A successful response confirms backend-to-AI connectivity.

---

## 8. User Manual

### 8.1 Getting Started — Registration

1. Open the app at `http://127.0.0.1:5000` — you will be redirected to the login page
2. Click **Create one** to go to the registration page
3. Complete the **3-step registration wizard:**

**Step 1 — Account:**
- Full Name, Username, Email, Password (minimum 6 characters)

**Step 2 — Body Stats:**
- Age, Weight (kg), Height (cm)
- Any injuries or physical limitations (or type "none")

**Step 3 — Goals & Preferences:**
- Primary Goal (Fat Loss, Muscle Gain, Maintenance, Endurance, General Fitness)
- Fitness Level (Beginner / Intermediate / Advanced)
- Days per week available for training
- Dietary preference (Balanced, Vegetarian, Vegan, Keto, High Protein)
- Equipment access
- Food allergies or restrictions

4. Click **Create Account** — you will be taken directly to the dashboard

> All profile values pre-fill the AI prompt forms throughout the app, so your plans are personalised from the first generation.

---

### 8.2 Logging In

1. Enter your registered email and password
2. Click **Sign In**
3. Use the eye icon to toggle password visibility
4. You will be redirected to the dashboard on success

---

### 8.3 Dashboard Overview

The dashboard is organised into tabs accessible from the left sidebar:

| Tab | Icon | Purpose |
| :--- | :--- | :--- |
| Dashboard | ⊞ | Home — quick access cards and fitness stats |
| Workout Plan | 🏋 | Generate AI workout routines |
| Diet Plan | 🍵 | Generate AI meal plans |
| Wellness | ♥ | Get AI wellness and recovery advice |
| AI Chat | 💬 | Conversational fitness assistant |
| Log Workout | 📄 | Manually record a training session |
| My Plans | 🔖 | View all permanently saved AI plans |
| Analytics | 📊 | Progress charts and session history |
| Settings | ⚙ | Update profile and preferences |

The **home tab** displays four summary stat cards showing your logged workout totals: Total Sessions, Hours Trained, Calories Burned, and Day Streak.

---

### 8.4 Generating a Workout Plan

1. Click **Workout Plan** in the sidebar
2. Adjust the four dropdown fields:
   - **Goal** — what you are training for
   - **Level** — your current fitness experience
   - **Days/Week** — how many training days you can commit to
   - **Equipment** — what you have available
3. Click **🏋️ Generate Workout Plan**
4. A loading overlay appears while ARIA generates your plan
5. The plan appears below, formatted with headings, tables (exercises with sets/reps/rest), and tips

**Available actions on the output:**
- **📋 Copy** — copies plain text to clipboard
- **💾 Save Plan** — saves permanently to your account
- **⬇ PDF** — exports to PDF via browser print dialog
- **✕ Clear** — removes the output and clears it from session cache

> The output is automatically saved to `sessionStorage` — if you switch tabs and come back, it will be restored with a blue "⚡ Restored from this session" badge.

---

### 8.5 Generating a Diet Plan

1. Click **Diet Plan** in the sidebar
2. Select your Goal, Diet Type, and Budget level
3. Click **🥗 Generate Diet Plan**
4. ARIA returns a meal plan including:
   - Daily calorie and macronutrient targets
   - 3-day sample meal plan (breakfast, lunch, dinner, snacks)
   - Hydration recommendations
   - Meal prep tips

The same Copy / Save / PDF / Clear actions are available.

---

### 8.6 Getting Wellness Advice

1. Click **Wellness** in the sidebar
2. Set your current Stress Level and average Sleep hours
3. Type your wellness question in the text box
   - Examples: *"How do I recover faster after leg day?"*, *"What should I eat on rest days?"*
4. Click **🧘 Get Wellness Advice**

ARIA responds with direct advice, actionable tips, how it connects to your fitness goal, and a motivational closing note.

---

### 8.7 Chatting with ARIA

1. Click **AI Chat** in the sidebar
2. Type any fitness-related question in the text box at the bottom
3. Press **Enter** (or **Shift+Enter** for a new line) or click the send button
4. ARIA responds with contextual, conversational advice
5. The conversation maintains the last 6 messages as context for continuity

Use the **Clear Chat** button in the page header to reset the conversation.

> Chat history is held in memory only — it is not saved to disk and will be lost on page refresh.

---

### 8.8 Logging a Workout

1. Click **Log Workout** in the sidebar
2. Fill in the form:
   - **Activity Type** — Strength Training, Cardio, Yoga, Sports, Walk/Run
   - **Duration** — in minutes
   - **Calories Burned** — estimated (optional but recommended for analytics)
   - **Exercise Name** — e.g. "Bench Press", "5K Run"
   - **Notes** — any personal notes, PRs, how it felt
3. Click **💾 Save Session**

Logged sessions are saved permanently to `data/fitness_logs.json` and immediately reflected in the Analytics page and the home stat cards.

---

### 8.9 My Saved Plans

1. Click **My Plans** in the sidebar (or on the home quick-card)
2. All permanently saved AI plans appear as collapsible cards
3. Click any card header to **expand** the full plan content
4. Each plan card has:
   - **⬇ PDF** — export this plan as a PDF
   - **🗑 Delete** — permanently remove the plan (confirmation required)
5. Use the **↺ Refresh** button to reload from the server

> Plans are saved per user — each account has its own plan library.

---

### 8.10 Analytics & Progress

Navigate to **Analytics** via the sidebar.

**Summary stat cards** (top row):
- Total Sessions logged
- Total Hours Trained
- Total Calories Burned
- Current Day Streak
- Average Session Duration (minutes)
- Top Activity (most logged type)

**Time range selector:** Choose **7 days**, **14 days**, or **30 days** — all three charts update instantly.

**Three dedicated charts:**

| Chart | Type | Colour | What it shows |
| :--- | :--- | :--- | :--- |
| 🔥 Calories Burned | Bar | Orange | kcal logged per day |
| ⏱️ Hours Trained | Line + fill | Blue | Workout hours per day |
| 📅 Daily Streak | Stacked bar | Green | Active days (green) vs rest days (dark) |

Hovering over the streak chart shows the running streak count for that day.

**All Sessions table** (bottom):
- Every logged session with Type, Exercise, Duration, Calories, Notes, Date
- Filter by activity type using the dropdown
- **🗑 Delete** any session (permanently removes it and refreshes all stats/charts)
- Footer shows totals for the currently filtered view

---

### 8.11 Settings & Profile

Navigate to **Settings** via the sidebar. Three tabs are available:

**👤 Profile tab:**
Update your display name, age, weight, height, and injury notes. These values are used in AI prompt context injection.

**🏋️ Fitness tab:**
Update your primary goal, fitness level, training days, dietary preference, equipment access, and allergies. These are the core values that shape every AI-generated plan.

**🔒 Security tab:**
Change your account password. You must provide your current password to confirm the change. Your username, email, and join date are displayed as read-only account information.

---

### 8.12 Clearing & Resetting Outputs

**Per-output clear (✕ Clear button):**
Each AI output card (Workout, Diet, Wellness) has a red **✕ Clear** button. Clicking it:
- Hides the output card
- Clears the content from the display
- Removes it from `sessionStorage` so it will not be restored on tab switch

**Global reset (↺ button in sidebar footer):**
The circular arrow button in the sidebar (between the user chip and logout) opens a confirmation modal. After confirming:
- All three AI output cards are cleared
- The chat history is wiped
- All session storage caches are removed
- You are returned to the home tab
- A toast notification confirms the reset

> Saved plans and workout logs are **never** affected by the clear or reset functions.

---

### 8.13 Exporting Plans to PDF

Any AI-generated plan can be exported as a formatted PDF:

1. Generate a plan or open a saved plan
2. Click **⬇ PDF** (on the output card) or **⬇ PDF** (on a saved plan card)
3. Your browser's **Print** dialog opens
4. Select **"Save as PDF"** as the destination (macOS: use the PDF dropdown at the bottom-left of the print dialog)
5. Click **Save**

The exported PDF includes:
- ARIA branded header with your name, goal, and date
- The full plan with formatted headings, tables, and lists
- A footer with a medical disclaimer

---