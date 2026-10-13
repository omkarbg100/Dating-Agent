import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import (
    WorkflowRunRequest,
    SingleAnalysisRequest,
    ParticipantInput,
    StructuredProfile
)
from app.graph import build_dating_graph
from app.nodes import (
    node_1_validate_input,
    node_2_retrieve_profile_content,
    node_3_analyze_person
)

load_dotenv()

app = FastAPI(
    title="Agentic Dating AI Service",
    description="Python FastAPI service running a 6-node LangGraph dating & compatibility workflow",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile graph once
graph = build_dating_graph()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "llm_configured": bool(os.getenv("GROQ_API_KEY")),
        "llm_model": os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    }


@app.post("/api/analyze-profile")
def analyze_single_profile(req: SingleAnalysisRequest):
    """
    Executes profile content retrieval and structured extraction (Nodes 1, 2, 3)
    for an individual participant.
    """
    try:
        p_dict = req.participant.model_dump()
        initial_state = {
            "rawParticipants": [p_dict]
        }
        
        # Run node 1
        s1 = node_1_validate_input(initial_state)
        if s1.get("validationErrors"):
            raise HTTPException(status_code=400, detail={"errors": s1["validationErrors"]})
        
        # Run node 2
        s2 = node_2_retrieve_profile_content(s1)
        
        # Run node 3
        s3 = node_3_analyze_person(s2)
        
        p_id = p_dict["id"]
        profile_data = s3.get("analyzedProfiles", {}).get(p_id)
        if not profile_data:
            raise HTTPException(status_code=500, detail="Profile analysis yielded no result.")
            
        return {
            "participantId": p_id,
            "retrievedSources": s2.get("retrievedContents", {}).get(p_id, {}),
            "profile": profile_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/run-workflow")
def run_matchmaking_workflow(req: WorkflowRunRequest):
    """
    Executes the complete 6-node LangGraph matchmaking workflow:
    Validate -> Retrieve -> Analyze -> Prepare Pairs -> Agent Dating -> Score & Rank
    """
    try:
        raw_list = [p.model_dump() for p in req.participants]
        if len(raw_list) < 2:
            raise HTTPException(status_code=400, detail="At least 2 participants are required to run matchmaking.")

        initial_state = {
            "rawParticipants": raw_list,
            "validParticipants": [],
            "validationErrors": [],
            "retrievedContents": {},
            "analyzedProfiles": {},
            "eligiblePairs": [],
            "datingSessions": [],
            "rankings": {},
            "status": "running",
            "errors": []
        }

        # Invoke the compiled 6-node LangGraph workflow
        final_state = graph.invoke(initial_state)

        return {
            "runId": req.runId,
            "cohortId": req.cohortId,
            "status": final_state.get("status", "completed"),
            "validationErrors": final_state.get("validationErrors", []),
            "validParticipantsCount": len(final_state.get("validParticipants", [])),
            "analyzedProfiles": final_state.get("analyzedProfiles", {}),
            "retrievedContents": final_state.get("retrievedContents", {}),
            "eligiblePairsCount": len(final_state.get("eligiblePairs", [])),
            "datingSessions": final_state.get("datingSessions", []),
            "rankings": final_state.get("rankings", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Workflow failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
