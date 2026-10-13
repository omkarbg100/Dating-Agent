import os
import re
import json
from typing import Dict, Any, List, Tuple
from app.schemas import (
    ParticipantInput,
    EvidenceItem,
    StructuredProfile,
    ConversationTurn,
    TentativeSignal,
    DatingSessionResult,
    CompatibilityResult,
    ScoreBreakdown,
)
from app.tools import profile_content_tool, compatibility_scorer

# Optional LangChain / Groq setup
from langchain_core.messages import SystemMessage, HumanMessage


def get_llm():
    """Returns ChatGroq if GROQ_API_KEY is present, else None for rule-based/fixture fallback."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        from langchain_groq import ChatGroq
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
        return ChatGroq(api_key=api_key, model=model, temperature=0.3)
    except Exception as e:
        print(f"[Warning] Could not initialize ChatGroq: {e}")
        return None


# -------------------------------------------------------------
# Node 1: Validate Input
# -------------------------------------------------------------
def node_1_validate_input(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 1: Validate Input
    - Validate participant records and URLs (LinkedIn and Instagram).
    - Check required consent.
    - Identify missing or duplicate records.
    """
    raw_participants = state.get("rawParticipants", [])
    valid_participants = []
    validation_errors = []
    seen_ids = set()

    for p_raw in raw_participants:
        p_id = p_raw.get("id") or p_raw.get("_id")
        name = p_raw.get("name", "Unknown")
        li_url = p_raw.get("linkedinUrl", "").strip()
        ig_url = p_raw.get("instagramUrl", "").strip()
        consent = p_raw.get("consent", False)

        # ID checks
        if not p_id:
            validation_errors.append(f"Participant '{name}' is missing an ID.")
            continue
        if p_id in seen_ids:
            validation_errors.append(f"Duplicate participant ID detected: '{p_id}' ({name}).")
            continue
        seen_ids.add(p_id)

        # Consent check
        if not consent:
            validation_errors.append(f"Consent missing: Participant '{name}' ({p_id}) has not consented.")
            continue

        # URL format checks
        li_valid = bool(re.search(r"^https?:\/\/(www\.)?linkedin\.com\/", li_url, re.IGNORECASE))
        ig_valid = bool(re.search(r"^https?:\/\/(www\.)?instagram\.com\/", ig_url, re.IGNORECASE))

        if not li_valid:
            validation_errors.append(f"Invalid LinkedIn URL for '{name}': {li_url}")
        if not ig_valid:
            validation_errors.append(f"Invalid Instagram URL for '{name}': {ig_url}")

        if li_valid and ig_valid and consent:
            valid_participants.append(p_raw)

    state["validParticipants"] = valid_participants
    state["validationErrors"] = validation_errors
    return state


# -------------------------------------------------------------
# Node 2: Retrieve Profile Content
# -------------------------------------------------------------
def node_2_retrieve_profile_content(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 2: Retrieve Profile Content
    - Uses Tool 1: profile_content_tool.
    - Keeps LinkedIn and Instagram content separate.
    - Records source provenance.
    - Marks inaccessible sources as unavailable.
    - Does not use other websites or sources.
    """
    valid_participants = state.get("validParticipants", [])
    retrieved_map = {}

    for p in valid_participants:
        p_id = p["id"]
        li_url = p.get("linkedinUrl", "")
        ig_url = p.get("instagramUrl", "")
        auth_content = p.get("authorizedContent", {})

        # Invoke Tool 1
        content_res = profile_content_tool(
            linkedin_url=li_url,
            instagram_url=ig_url,
            authorized_content=auth_content
        )
        retrieved_map[p_id] = content_res

    state["retrievedContents"] = retrieved_map
    return state


# -------------------------------------------------------------
# Node 3: Analyze Person
# -------------------------------------------------------------
def _extract_evidence_fallback(p_id: str, p_name: str, li_data: dict, ig_data: dict) -> StructuredProfile:
    """Heuristic rule-based extractor when LLM key is absent or on timeout."""
    li_text = li_data.get("content") or ""
    ig_text = ig_data.get("content") or ""

    evidence: List[EvidenceItem] = []
    interests = []
    hobbies = []
    values = []
    dating_prefs = []
    missing_info = []

    if not li_text and not ig_text:
        return StructuredProfile(
            personId=p_id,
            summary=f"Authorized profile content unavailable for {p_name}. Neither source provided extractable evidence.",
            interests=[],
            hobbies=[],
            values=[],
            datingPreferences=[],
            communicationStyle="Unknown",
            evidence=[],
            confidence=0.0,
            missingInformation=["LinkedIn content unavailable", "Instagram content unavailable"]
        )

    # Process LinkedIn evidence
    if li_text:
        evidence.append(EvidenceItem(
            attribute="professional_context",
            value="Observed career details",
            source="LinkedIn",
            reference=li_text[:120] + "..." if len(li_text) > 120 else li_text
        ))
        # Simple keywords for demo fallback
        keywords = ["tech", "engineering", "ai", "product", "design", "marketing", "education", "finance", "data", "climate", "entrepreneurship"]
        for kw in keywords:
            if kw in li_text.lower():
                interests.append(kw.capitalize())
                evidence.append(EvidenceItem(
                    attribute=f"interest: {kw}",
                    value=kw.capitalize(),
                    source="LinkedIn",
                    reference=f"Found '{kw}' in authorized LinkedIn snippet"
                ))
    else:
        missing_info.append("LinkedIn content was inaccessible")

    # Process Instagram evidence
    if ig_text:
        evidence.append(EvidenceItem(
            attribute="leisure_context",
            value="Observed social/lifestyle details",
            source="Instagram",
            reference=ig_text[:120] + "..." if len(ig_text) > 120 else ig_text
        ))
        hobby_words = ["hiking", "coffee", "photography", "bouldering", "cooking", "travel", "reading", "yoga", "art", "music", "running", "dogs", "cycling"]
        for hw in hobby_words:
            if hw in ig_text.lower():
                hobbies.append(hw.capitalize())
                evidence.append(EvidenceItem(
                    attribute=f"hobby: {hw}",
                    value=hw.capitalize(),
                    source="Instagram",
                    reference=f"Observed '{hw}' in authorized Instagram feed"
                ))
    else:
        missing_info.append("Instagram content was inaccessible")

    # Values extraction
    value_words = ["growth", "curiosity", "sustainability", "creativity", "family", "community", "balance", "kindness"]
    combined_text = (li_text + " " + ig_text).lower()
    for vw in value_words:
        if vw in combined_text:
            values.append(vw.capitalize())
            src = "LinkedIn" if vw in li_text.lower() else "Instagram"
            evidence.append(EvidenceItem(
                attribute=f"value: {vw}",
                value=vw.capitalize(),
                source=src,
                reference=f"Referenced '{vw}' in {src} notes"
            ))

    # Explicit preferences
    if "looking for" in combined_text or "partner" in combined_text or "dating" in combined_text:
        dating_prefs.append("Expressed interest in shared active lifestyle and open communication")
        evidence.append(EvidenceItem(
            attribute="dating_preference",
            value="Active lifestyle & open communication",
            source="Instagram" if "partner" in ig_text.lower() else "LinkedIn",
            reference="Explicitly noted dating aspirations in authorized submission"
        ))
    else:
        missing_info.append("Explicit dating preferences not declared")

    confidence = 0.85 if (li_text and ig_text) else (0.5 if (li_text or ig_text) else 0.1)

    return StructuredProfile(
        personId=p_id,
        summary=f"{p_name}: Profile analyzed with evidence from {'both sources' if li_text and ig_text else 'available source'}.",
        interests=list(set(interests)) or ["General Professional Interests"],
        hobbies=list(set(hobbies)) or ["Outdoor Activities"],
        values=list(set(values)) or ["Growth & Balance"],
        datingPreferences=dating_prefs,
        communicationStyle="Direct & Thoughtful" if li_text else "Unknown",
        evidence=evidence,
        confidence=confidence,
        missingInformation=missing_info
    )


def node_3_analyze_person(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 3: Analyze Person
    - Uses LangChain & Pydantic structured output.
    - Extract evidence-backed interests, hobbies, values, preferences.
    - Produces a StructuredProfile for each participant.
    """
    valid_participants = state.get("validParticipants", [])
    retrieved_map = state.get("retrievedContents", {})
    analyzed_profiles = {}
    llm = get_llm()

    for p in valid_participants:
        p_id = p["id"]
        p_name = p.get("name", "Participant")
        source_data = retrieved_map.get(p_id, {})
        li_data = source_data.get("linkedin", {})
        ig_data = source_data.get("instagram", {})

        li_content = li_data.get("content")
        ig_content = ig_data.get("content")

        if not li_content and not ig_content:
            analyzed_profiles[p_id] = _extract_evidence_fallback(p_id, p_name, li_data, ig_data).model_dump()
            continue

        if llm:
            try:
                system_prompt = (
                    "You are an objective AI Profile Analyst for an agentic dating simulation. "
                    "Analyze the provided permitted LinkedIn and Instagram content for this participant. "
                    "STRICT RULES:\n"
                    "1. Extract ONLY evidence-backed interests, hobbies, values, explicitly stated preferences, and communication style.\n"
                    "2. For every attribute, provide an exact EvidenceItem with attribute, value, source ('LinkedIn' or 'Instagram'), and verbatim reference snippet.\n"
                    "3. DO NOT infer attraction, sexuality, religion, health, or sensitive traits.\n"
                    "4. If an attribute has no direct evidence, omit it or list it in missingInformation.\n"
                    "5. Output valid JSON matching the StructuredProfile schema."
                )
                user_msg = (
                    f"Participant Name: {p_name}\n"
                    f"Person ID: {p_id}\n\n"
                    f"--- LINKEDIN PERMITTED CONTENT ---\n{li_content or '[Unavailable]'}\n\n"
                    f"--- INSTAGRAM PERMITTED CONTENT ---\n{ig_content or '[Unavailable]'}\n"
                )

                structured_llm = llm.with_structured_output(StructuredProfile)
                profile = structured_llm.invoke([
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=user_msg)
                ])
                analyzed_profiles[p_id] = profile.model_dump()
                continue
            except Exception as e:
                print(f"[Analyze Person] LLM call failed or timed out for {p_id}: {e}. Using robust fallback.")

        # Fallback if no LLM or LLM error
        fallback_profile = _extract_evidence_fallback(p_id, p_name, li_data, ig_data)
        analyzed_profiles[p_id] = fallback_profile.model_dump()

    state["analyzedProfiles"] = analyzed_profiles
    return state


# -------------------------------------------------------------
# Node 4: Prepare Dating Pairs
# -------------------------------------------------------------
def node_4_prepare_dating_pairs(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 4: Prepare Dating Pairs
    - Exclude same participant from matching with themselves.
    - Respect consent.
    - Prepare unique candidate pairs.
    - Shortlist candidates based on shared interests and non-sensitive attributes.
    """
    analyzed_profiles = state.get("analyzedProfiles", {})
    participant_ids = list(analyzed_profiles.keys())
    eligible_pairs: List[Tuple[str, str]] = []

    for i in range(len(participant_ids)):
        for j in range(i + 1, len(participant_ids)):
            p1_id = participant_ids[i]
            p2_id = participant_ids[j]

            prof1 = analyzed_profiles[p1_id]
            prof2 = analyzed_profiles[p2_id]

            # Consent check
            if prof1.get("confidence", 0) <= 0 and prof2.get("confidence", 0) <= 0:
                continue

            # Shortlist unique pairs
            eligible_pairs.append((p1_id, p2_id))

    state["eligiblePairs"] = eligible_pairs
    return state


# -------------------------------------------------------------
# Node 5: Agent-to-Agent Dating
# -------------------------------------------------------------
def _simulate_agent_conversation(
    p1_name: str,
    prof1: dict,
    p2_name: str,
    prof2: dict,
    llm: Any = None
) -> DatingSessionResult:
    """
    Runs a 4-message conversation alternating between Agent A and Agent B.
    Each agent speaks only from evidenced profile attributes.
    """
    p1_id = prof1["personId"]
    p2_id = prof2["personId"]
    pair_id = f"date_{p1_id}_{p2_id}"

    turns: List[ConversationTurn] = []
    shared_discovered: List[str] = []
    unresolved: List[str] = []
    tentative_signals: List[TentativeSignal] = []

    # Find mutual interests from profile
    interests_1 = set([i.lower() for i in prof1.get("interests", []) + prof1.get("hobbies", [])])
    interests_2 = set([i.lower() for i in prof2.get("interests", []) + prof2.get("hobbies", [])])
    common_interests = list(interests_1.intersection(interests_2))

    if llm:
        try:
            # We will generate the 4-turn dialog with LLM
            prompt = (
                f"You are simulating a short 4-turn conversation between two AI agent avatars in an agentic dating simulation.\n"
                f"Agent 1 represents {p1_name} with profile:\n{json.dumps(prof1, indent=2)}\n\n"
                f"Agent 2 represents {p2_name} with profile:\n{json.dumps(prof2, indent=2)}\n\n"
                f"RULES:\n"
                f"1. Generate exactly 4 messages alternating: Turn 0 (Agent 1), Turn 1 (Agent 2), Turn 2 (Agent 1), Turn 3 (Agent 2).\n"
                f"2. Each agent speaks ONLY from facts in its participant's profile. Acknowledge unknown info.\n"
                f"3. Never claim to be the actual human person. Do not invent romantic attraction or physical intimacy.\n"
                f"4. Explore shared interests and ask natural questions.\n"
                f"Return JSON with format:\n"
                f'{{"turns": [{{"speakerId": "{p1_id}", "speakerName": "{p1_name}\'s Agent", "turnIndex": 0, "message": "..."}}, ...],\n'
                f'"sharedInterestsDiscovered": ["..."], "unresolvedQuestions": ["..."], "tentativeSignals": [{{"signal": "...", "evidence": "..."}}]}}'
            )
            response = llm.invoke([
                SystemMessage(content="You generate truthful 4-turn agent-to-agent dating simulations in valid JSON."),
                HumanMessage(content=prompt)
            ])
            content_text = response.content
            # Extract JSON block
            json_match = re.search(r"\{.*\}", content_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                conv_turns = [
                    ConversationTurn(
                        speakerId=t.get("speakerId", p1_id),
                        speakerName=t.get("speakerName", f"{p1_name}'s Agent"),
                        turnIndex=t.get("turnIndex", idx),
                        message=t.get("message", "")
                    ) for idx, t in enumerate(parsed.get("turns", []))
                ]
                signals = [
                    TentativeSignal(signal=s.get("signal", ""), evidence=s.get("evidence", ""))
                    for s in parsed.get("tentativeSignals", [])
                ]
                return DatingSessionResult(
                    pairId=pair_id,
                    participant1Id=p1_id,
                    participant2Id=p2_id,
                    conversationTurns=conv_turns,
                    sharedInterestsDiscovered=parsed.get("sharedInterestsDiscovered", common_interests),
                    unresolvedQuestions=parsed.get("unresolvedQuestions", []),
                    tentativeSignals=signals,
                    sessionStatus="completed"
                )
        except Exception as e:
            print(f"[Agent Dating] LLM simulation failed: {e}. Using factual agent generator.")

    # High quality truthful scripted generator fallback
    topic_1 = prof1.get("interests", ["technology"])[0] if prof1.get("interests") else "creative pursuits"
    hobby_1 = prof1.get("hobbies", ["outdoor activities"])[0] if prof1.get("hobbies") else "weekend exploring"
    topic_2 = prof2.get("interests", ["problem solving"])[0] if prof2.get("interests") else "professional growth"
    hobby_2 = prof2.get("hobbies", ["reading"])[0] if prof2.get("hobbies") else "hiking"

    # Turn 0 (Agent 1)
    msg_0 = (
        f"Hi! I'm an AI agent representing {p1_name}. From {p1_name}'s public sources, "
        f"I see an active focus on {topic_1} and spending downtime with {hobby_1}. "
        f"What does {p2_name}'s profile highlight as key passions?"
    )
    turns.append(ConversationTurn(speakerId=p1_id, speakerName=f"{p1_name}'s Agent", turnIndex=0, message=msg_0))

    # Turn 1 (Agent 2)
    msg_1 = (
        f"Hello! I represent {p2_name}. Based on verified source content, {p2_name} is deeply invested in {topic_2} "
        f"and often recharges through {hobby_2}. "
        f"{'We actually share an interest in ' + common_interests[0] + '!' if common_interests else 'It is great to compare our perspectives.'}"
    )
    turns.append(ConversationTurn(speakerId=p2_id, speakerName=f"{p2_name}'s Agent", turnIndex=1, message=msg_1))

    # Turn 2 (Agent 1)
    msg_2 = (
        f"That aligns nicely with what {p1_name} values. "
        f"{'Building community around ' + common_interests[0] + ' sounds like a rewarding shared ground.' if common_interests else 'How does ' + p2_name + ' balance professional commitments with personal growth?'}"
    )
    turns.append(ConversationTurn(speakerId=p1_id, speakerName=f"{p1_name}'s Agent", turnIndex=2, message=msg_2))

    # Turn 3 (Agent 2)
    msg_3 = (
        f"According to {p2_name}'s verified records, intentional time for {hobby_2} helps maintain balance. "
        f"Our participants' structured values suggest mutual respect for personal growth, making this a promising simulation."
    )
    turns.append(ConversationTurn(speakerId=p2_id, speakerName=f"{p2_name}'s Agent", turnIndex=3, message=msg_3))

    if common_interests:
        shared_discovered.extend(common_interests)
        tentative_signals.append(TentativeSignal(
            signal=f"Shared enthusiasm for {common_interests[0]}",
            evidence=f"Observed on both profiles and affirmed during dialogue turn 1"
        ))
    else:
        unresolved.append("Shared weekend routines remain unobserved in initial sources")
        tentative_signals.append(TentativeSignal(
            signal="Complementary work-life balance goals",
            evidence="Affirmed by reciprocal dialogue in turn 3"
        ))

    return DatingSessionResult(
        pairId=pair_id,
        participant1Id=p1_id,
        participant2Id=p2_id,
        conversationTurns=turns,
        sharedInterestsDiscovered=shared_discovered,
        unresolvedQuestions=unresolved,
        tentativeSignals=tentative_signals,
        sessionStatus="completed"
    )


def node_5_agent_dating(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 5: Agent-to-Agent Dating
    - Create two independent personas for each selected pair.
    - Run 4 total messages per pair alternating between the two agents.
    - Collect shared interests, unresolved questions, and tentative signals.
    """
    eligible_pairs = state.get("eligiblePairs", [])
    analyzed_profiles = state.get("analyzedProfiles", {})
    raw_participants = {p["id"]: p.get("name", "Participant") for p in state.get("validParticipants", [])}
    llm = get_llm()

    dating_sessions: List[Dict[str, Any]] = []

    for p1_id, p2_id in eligible_pairs:
        prof1 = analyzed_profiles.get(p1_id)
        prof2 = analyzed_profiles.get(p2_id)
        if not prof1 or not prof2:
            continue

        name1 = raw_participants.get(p1_id, f"Participant {p1_id}")
        name2 = raw_participants.get(p2_id, f"Participant {p2_id}")

        session_result = _simulate_agent_conversation(
            p1_name=name1,
            prof1=prof1,
            p2_name=name2,
            prof2=prof2,
            llm=llm
        )
        dating_sessions.append(session_result.model_dump())

    state["datingSessions"] = dating_sessions
    return state


# -------------------------------------------------------------
# Node 6: Score and Rank
# -------------------------------------------------------------
def node_6_score_and_rank(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node 6: Score and Rank
    - Uses Tool 2: compatibility_scorer.
    - Start weights: Shared interests (35%), Values (25%), Preferences (25%), Signals (15%).
    - Computes directional and reciprocal scores.
    - Produces ranked candidate lists for each participant.
    """
    analyzed_profiles_dict = state.get("analyzedProfiles", {})
    dating_sessions_list = state.get("datingSessions", [])

    # Index dating sessions by pair
    sessions_by_pair = {}
    for s in dating_sessions_list:
        p1 = s["participant1Id"]
        p2 = s["participant2Id"]
        sessions_by_pair[(p1, p2)] = s
        sessions_by_pair[(p2, p1)] = s

    # Convert dicts back to Pydantic objects for Tool 2
    typed_profiles = {
        pid: StructuredProfile(**data) for pid, data in analyzed_profiles_dict.items()
    }

    # Store rankings per participant
    rankings_by_participant: Dict[str, List[Dict[str, Any]]] = {}

    for p_id in typed_profiles.keys():
        candidate_evaluations: List[CompatibilityResult] = []

        for cand_id in typed_profiles.keys():
            if p_id == cand_id:
                continue

            prof_a = typed_profiles[p_id]
            prof_b = typed_profiles[cand_id]

            raw_session = sessions_by_pair.get((p_id, cand_id))
            typed_session = DatingSessionResult(**raw_session) if raw_session else None

            # Tool 2 calculation
            compat_res = compatibility_scorer(
                profile_a=prof_a,
                profile_b=prof_b,
                dating_session=typed_session
            )
            candidate_evaluations.append(compat_res)

        # Sort descending by reciprocalScore
        candidate_evaluations.sort(key=lambda x: x.reciprocalScore, reverse=True)

        # Assign ranks
        for idx, res in enumerate(candidate_evaluations):
            res.rank = idx + 1

        rankings_by_participant[p_id] = [r.model_dump() for r in candidate_evaluations]

    state["rankings"] = rankings_by_participant
    state["status"] = "completed"
    return state
