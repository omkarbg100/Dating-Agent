from typing import Dict, Any, TypedDict, List
from langgraph.graph import StateGraph, START, END
from app.nodes import (
    node_1_validate_input,
    node_2_retrieve_profile_content,
    node_3_analyze_person,
    node_4_prepare_dating_pairs,
    node_5_agent_dating,
    node_6_score_and_rank
)


class DatingWorkflowState(TypedDict, total=False):
    rawParticipants: List[Dict[str, Any]]
    validParticipants: List[Dict[str, Any]]
    validationErrors: List[str]
    retrievedContents: Dict[str, Dict[str, Any]]
    analyzedProfiles: Dict[str, Dict[str, Any]]
    eligiblePairs: List[tuple]
    datingSessions: List[Dict[str, Any]]
    rankings: Dict[str, List[Dict[str, Any]]]
    status: str
    errors: List[str]


def build_dating_graph():
    """
    Constructs the 6-node LangGraph workflow:
    Node 1: Validate Input
    Node 2: Retrieve Profile Content
    Node 3: Analyze Person
    Node 4: Prepare Dating Pairs
    Node 5: Agent-to-Agent Dating
    Node 6: Score and Rank
    """
    workflow = StateGraph(DatingWorkflowState)

    # Add exactly six nodes
    workflow.add_node("validate_input", node_1_validate_input)
    workflow.add_node("retrieve_profile_content", node_2_retrieve_profile_content)
    workflow.add_node("analyze_person", node_3_analyze_person)
    workflow.add_node("prepare_dating_pairs", node_4_prepare_dating_pairs)
    workflow.add_node("agent_dating", node_5_agent_dating)
    workflow.add_node("score_and_rank", node_6_score_and_rank)

    # Define linear pipeline flow
    workflow.add_edge(START, "validate_input")
    workflow.add_edge("validate_input", "retrieve_profile_content")
    workflow.add_edge("retrieve_profile_content", "analyze_person")
    workflow.add_edge("analyze_person", "prepare_dating_pairs")
    workflow.add_edge("prepare_dating_pairs", "agent_dating")
    workflow.add_edge("agent_dating", "score_and_rank")
    workflow.add_edge("score_and_rank", END)

    return workflow.compile()
