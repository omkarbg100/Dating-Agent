# Agentic Dating — Evidence-Based AI Matchmaking Platform

A demo-ready agentic dating website where consenting participants are represented by autonomous AI agents. Profiles are built strictly from authorized public content from two sources: **LinkedIn** and **Instagram**. The system conducts simulated agent-to-agent dating conversations and computes multi-factor compatibility rankings.

---

## 1. Key Highlights & Architectural Guarantees

- **Exactly Two Profile Sources**: LinkedIn public profile URL and Instagram public profile URL.
- **Truthful AI Personas**: Agents speak strictly from evidence extracted from permitted source content. Unsupported attributes are marked as unknown; sensitive characteristics (religion, sexuality, health, etc.) are never inferred.
- **AI Simulation Notice**: Prominently labeled across all dialogue views and ranking cards.
- **6-Node LangGraph Architecture**: Sequential deterministic pipeline orchestrating validation, extraction, pairing, conversation simulation, and scoring.
- **The Two Mandatory Tools**:
  1. `profile_content_tool`: Retrieves authorized LinkedIn and Instagram content or processes participant-provided excerpts with full provenance audit trail.
  2. `compatibility_scorer`: Calculates interpretable directional and reciprocal compatibility scores with configurable weights (35% Shared Interests, 25% Stated Values, 25% Preference Alignment, 15% Conversation Signals).

---

## 2. Technology Stack

- **Frontend**: React.js (JavaScript only, no TypeScript), Vite, Tailwind CSS, React Router (`react-router-dom`), Axios, Lucide React.
  - Dark-mode-first aesthetic: Deep navy background (`#070B14`), purple, indigo, pink, and teal accents, glassmorphic cards, soft glows.
- **Backend**: Node.js, Express.js, Mongoose, MongoDB.
- **AI Service**: Python 3.11+, FastAPI, Uvicorn, LangChain, LangGraph, Pydantic, ChatGroq.
- **LLM**: Groq API (`GROQ_API_KEY`, default model: `llama-3.3-70b-versatile`).

---

## 3. LangGraph Workflow — Exactly Six Nodes

The AI service executes a linear state graph composed of exactly six nodes:

```
[START]
   │
   ▼
1. Validate Input (Checks URLs, explicit consent, filters duplicates)
   │
   ▼
2. Retrieve Profile Content (Executes Tool 1: profile_content_tool)
   │
   ▼
3. Analyze Person (Pydantic StructuredProfile, extracts evidence audit trail)
   │
   ▼
4. Prepare Dating Pairs (Excludes self-matches, checks consent, prepares candidate pairs)
   │
   ▼
5. Agent-to-Agent Dating (Runs 4-turn alternating conversation, extracts mutual signals)
   │
   ▼
6. Score and Rank (Executes Tool 2: compatibility_scorer, computes reciprocal rankings)
   │
   ▼
 [END]
```

---

## 4. Project Structure

```text
Canada Labs/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── SimulationBanner.jsx
│   │   │   └── SocialIcons.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AddParticipants.jsx
│   │   │   ├── ProfileLab.jsx
│   │   │   └── DatingArenaAndRankings.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── matchmakingController.js
│   │   │   └── participantController.js
│   │   ├── data/
│   │   │   └── demoCohort.js
│   │   ├── models/
│   │   │   ├── AgentProfile.js
│   │   │   ├── AgentRun.js
│   │   │   ├── DatingSession.js
│   │   │   ├── Participant.js
│   │   │   └── Ranking.js
│   │   ├── routes/
│   │   │   └── api.js
│   │   ├── services/
│   │   │   └── aiService.js
│   │   └── app.js
│   ├── package.json
│   └── .env.example
├── ai-service/
│   ├── app/
│   │   ├── graph.py
│   │   ├── main.py
│   │   ├── nodes.py
│   │   ├── schemas.py
│   │   └── tools.py
│   ├── requirements.txt
│   └── .env.example
└── README.md
```

---

## 5. Quickstart & How to Run

### Step 1: AI Service (Python FastAPI)

1. Navigate to `ai-service/`:
   ```bash
   cd ai-service
   ```
2. Set your Groq API key in `ai-service/.env`:
   ```ini
   PORT=8000
   GROQ_API_KEY=gsk_your_groq_api_key_here
   LLM_MODEL=llama-3.3-70b-versatile
   ```
3. Activate the virtual environment and start Uvicorn:
   ```bash
   .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000
   ```
   *Health endpoint:* `http://127.0.0.1:8000/health`

### Step 2: Backend (Node.js & Express)

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Configure `backend/.env`:
   ```ini
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/agentic_dating
   AI_SERVICE_URL=http://127.0.0.1:8000
   ```
   *(Note: The backend automatically falls back to an embedded in-memory MongoDB server if no external daemon is running, guaranteeing zero-config demo readiness!)*
3. Start the server:
   ```bash
   npm start
   ```
   *Health endpoint:* `http://localhost:5000/health`

### Step 3: Frontend (React & Vite)

1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
3. Open your browser at `http://127.0.0.1:5173/`

---

## 6. End-to-End Verification Flow

1. **Dashboard**:
   - View live counters: Cohort Participants, Analyzed Profiles, Completed Dating Sessions, Completed Rankings.
   - Click **"Load 25 Consenting Demo Fixtures"** to instantly seed 25 realistic, consenting participants with authorized LinkedIn & Instagram snippets.
2. **Add Participants**:
   - Register new custom participants with URL validation, explicit consent confirmations, and authorized source content excerpts.
3. **Profile Lab**:
   - Select any participant from the dropdown.
   - Click **"Analyze Profile"** to execute nodes 1-3.
   - Inspect summary, observed interests, hobbies, values, communication style, and the **Evidence Audit Trail** with source badges.
4. **Start Matchmaking**:
   - Click **"Start Matchmaking Run"** from the Dashboard.
   - The 6-node LangGraph pipeline pairs candidates, simulates 4-turn dialogues, and calculates directional and reciprocal compatibility scores.
5. **Dating Arena & Rankings**:
   - Inspect candidate rankings in descending order for any selected participant.
   - Click **"View Dialogue"** on any ranked pair to step into the **Dating Arena** and read the actual 4-turn autonomous agent dialogue.
