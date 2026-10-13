import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.schemas import StructuredProfile, DatingSessionResult, CompatibilityResult, ScoreBreakdown


def profile_content_tool(
    linkedin_url: str,
    instagram_url: str,
    authorized_content: Optional[Dict[str, Optional[str]]] = None
) -> Dict[str, Any]:
    """
    Tool 1: profile_content_tool
    Retrieves authorized LinkedIn and Instagram content or processes participant-provided
    content associated with those links. Returns source-separated content and provenance.
    Never invents missing information or uses external third-party sites.
    """
    authorized_content = authorized_content or {}
    li_provided = authorized_content.get("linkedin")
    ig_provided = authorized_content.get("instagram")

    results = {
        "linkedin": {
            "url": linkedin_url,
            "status": "unavailable",
            "content": None,
            "provenance": {
                "source": "LinkedIn",
                "retrievedAt": datetime.now(timezone.utc).isoformat(),
                "method": "unauthorized_or_unavailable",
                "referenceUrl": linkedin_url
            }
        },
        "instagram": {
            "url": instagram_url,
            "status": "unavailable",
            "content": None,
            "provenance": {
                "source": "Instagram",
                "retrievedAt": datetime.now(timezone.utc).isoformat(),
                "method": "unauthorized_or_unavailable",
                "referenceUrl": instagram_url
            }
        }
    }

    # Validate and process LinkedIn
    if linkedin_url and "linkedin.com" in linkedin_url.lower():
        if li_provided and li_provided.strip():
            results["linkedin"]["status"] = "available"
            results["linkedin"]["content"] = li_provided.strip()
            results["linkedin"]["provenance"]["method"] = "participant_authorized_content"
        else:
            # Public URLs without authorized content cannot be scraped without authentication/consent tokens
            results["linkedin"]["status"] = "unavailable"
            results["linkedin"]["content"] = None
            results["linkedin"]["provenance"]["notes"] = "No authorized text or consent token supplied for LinkedIn URL."

    # Validate and process Instagram
    if instagram_url and "instagram.com" in instagram_url.lower():
        if ig_provided and ig_provided.strip():
            results["instagram"]["status"] = "available"
            results["instagram"]["content"] = ig_provided.strip()
            results["instagram"]["provenance"]["method"] = "participant_authorized_content"
        else:
            results["instagram"]["status"] = "unavailable"
            results["instagram"]["content"] = None
            results["instagram"]["provenance"]["notes"] = "No authorized text or media caption stream supplied for Instagram URL."

    return results


def _calculate_overlap_ratio(list_a: List[str], list_b: List[str]) -> float:
    """Helper to compute semantic / lexical token overlap between two lists of items."""
    if not list_a or not list_b:
        return 0.0
    
    set_a = set()
    for item in list_a:
        tokens = set(re.findall(r"\b\w{3,}\b", item.lower()))
        set_a.update(tokens)

    set_b = set()
    for item in list_b:
        tokens = set(re.findall(r"\b\w{3,}\b", item.lower()))
        set_b.update(tokens)

    if not set_a or not set_b:
        return 0.0

    intersection = set_a.intersection(set_b)
    # Jaccard or overlap coefficient
    union = set_a.union(set_b)
    return len(intersection) / len(union) if union else 0.0


def compatibility_scorer(
    profile_a: StructuredProfile,
    profile_b: StructuredProfile,
    dating_session: Optional[DatingSessionResult] = None,
    weights: Optional[Dict[str, float]] = None
) -> CompatibilityResult:
    """
    Tool 2: compatibility_scorer
    Calculates interpretable compatibility scores from structured profile features,
    explicit preferences, and supported conversation signals.
    Start weights:
      - Shared interests: 35%
      - Explicitly stated values: 25%
      - Explicit preference alignment: 25%
      - Reciprocal conversation signals: 15%
    If evidence for a component is missing, normalizes over available weights and
    lowers confidence accordingly. Never treats missing information as a mismatch.
    """
    default_weights = {
        "sharedInterests": 0.35,
        "statedValues": 0.25,
        "preferenceAlignment": 0.25,
        "conversationSignals": 0.15
    }
    w = weights or default_weights

    missing_warnings = []
    
    # 1. Shared Interests Component
    has_interests_a = bool(profile_a.interests or profile_a.hobbies)
    has_interests_b = bool(profile_b.interests or profile_b.hobbies)
    
    interests_available = has_interests_a and has_interests_b
    if not interests_available:
        missing_warnings.append("Insufficient observed interest/hobby evidence on one or both profiles.")

    all_interests_a = (profile_a.interests or []) + (profile_a.hobbies or [])
    all_interests_b = (profile_b.interests or []) + (profile_b.hobbies or [])
    raw_interest_ratio = _calculate_overlap_ratio(all_interests_a, all_interests_b)
    # Scale from 0-1 to 0-100 with a gentle non-linear curve for realistic pairing
    interest_score = min(100.0, raw_interest_ratio * 125.0) if interests_available else 50.0

    # 2. Stated Values Component
    has_values_a = bool(profile_a.values)
    has_values_b = bool(profile_b.values)
    values_available = has_values_a and has_values_b
    if not values_available:
        missing_warnings.append("Explicit values missing from one or both participant profiles.")
    
    raw_values_ratio = _calculate_overlap_ratio(profile_a.values or [], profile_b.values or [])
    values_score = min(100.0, raw_values_ratio * 130.0) if values_available else 50.0

    # 3. Preference Alignment Component
    has_prefs_a = bool(profile_a.datingPreferences)
    has_prefs_b = bool(profile_b.datingPreferences)
    prefs_available = has_prefs_a and has_prefs_b
    if not prefs_available:
        missing_warnings.append("Explicit dating preferences not declared on one or both profiles.")
    
    # Evaluate if A's preferences match B's profile and vice versa
    pref_score_a_to_b = 60.0
    pref_score_b_to_a = 60.0
    if prefs_available:
        # Check lexical match of A's preferences in B's summary/interests/values
        b_text = " ".join((profile_b.interests or []) + (profile_b.values or []) + [profile_b.summary or ""])
        a_prefs = " ".join(profile_a.datingPreferences or [])
        match_a = _calculate_overlap_ratio([a_prefs], [b_text])
        pref_score_a_to_b = min(100.0, 40.0 + match_a * 100.0)

        a_text = " ".join((profile_a.interests or []) + (profile_a.values or []) + [profile_a.summary or ""])
        b_prefs = " ".join(profile_b.datingPreferences or [])
        match_b = _calculate_overlap_ratio([b_prefs], [a_text])
        pref_score_b_to_a = min(100.0, 40.0 + match_b * 100.0)

    # 4. Conversation Signals Component
    signals_available = dating_session is not None and bool(dating_session.conversationTurns)
    if not signals_available:
        missing_warnings.append("No completed agent dating conversation transcript available.")
    
    conv_signals_count = len(dating_session.tentativeSignals) if dating_session else 0
    shared_discovered_count = len(dating_session.sharedInterestsDiscovered) if dating_session else 0
    # Score 50 base + 15 per positive signal up to 100
    conv_score = min(100.0, 50.0 + (conv_signals_count * 15.0) + (shared_discovered_count * 10.0)) if signals_available else 50.0

    # Normalization over available weights (never penalize missing information as a mismatch)
    active_weights_a = {}
    active_weights_b = {}

    if interests_available:
        active_weights_a["sharedInterests"] = w["sharedInterests"]
        active_weights_b["sharedInterests"] = w["sharedInterests"]
    if values_available:
        active_weights_a["statedValues"] = w["statedValues"]
        active_weights_b["statedValues"] = w["statedValues"]
    if prefs_available:
        active_weights_a["preferenceAlignment"] = w["preferenceAlignment"]
        active_weights_b["preferenceAlignment"] = w["preferenceAlignment"]
    if signals_available:
        active_weights_a["conversationSignals"] = w["conversationSignals"]
        active_weights_b["conversationSignals"] = w["conversationSignals"]

    sum_weights = sum(active_weights_a.values())
    if sum_weights == 0:
        sum_weights = 1.0
        active_weights_a = {"default": 1.0}
        active_weights_b = {"default": 1.0}

    # Directional score A -> B
    dir_score_a = 0.0
    if interests_available:
        dir_score_a += (interest_score * active_weights_a["sharedInterests"])
    if values_available:
        dir_score_a += (values_score * active_weights_a["statedValues"])
    if prefs_available:
        dir_score_a += (pref_score_a_to_b * active_weights_a["preferenceAlignment"])
    if signals_available:
        dir_score_a += (conv_score * active_weights_a["conversationSignals"])
    
    dir_score_a = round(dir_score_a / sum_weights, 1)

    # Directional score B -> A
    dir_score_b = 0.0
    if interests_available:
        dir_score_b += (interest_score * active_weights_b["sharedInterests"])
    if values_available:
        dir_score_b += (values_score * active_weights_b["statedValues"])
    if prefs_available:
        dir_score_b += (pref_score_b_to_a * active_weights_b["preferenceAlignment"])
    if signals_available:
        dir_score_b += (conv_score * active_weights_b["conversationSignals"])
    
    dir_score_b = round(dir_score_b / sum_weights, 1)

    reciprocal_score = round((dir_score_a + dir_score_b) / 2.0, 1)

    # Confidence calculation: product of individual profile confidences & data completeness
    completeness_factor = sum(w for k, w in active_weights_a.items() if k in default_weights)
    overall_confidence = round(min(1.0, (profile_a.confidence * profile_b.confidence * 0.7) + (completeness_factor * 0.3)), 2)

    # Breakdown contributions
    breakdown = ScoreBreakdown(
        sharedInterests=round(interest_score if interests_available else 0.0, 1),
        statedValues=round(values_score if values_available else 0.0, 1),
        preferenceAlignment=round((pref_score_a_to_b + pref_score_b_to_a) / 2.0 if prefs_available else 0.0, 1),
        conversationSignals=round(conv_score if signals_available else 0.0, 1)
    )

    # Short evidence-based explanation
    explanation_parts = []
    if interests_available and interest_score > 60:
        explanation_parts.append(f"Strong overlap observed in activities/interests ({len(all_interests_a)} and {len(all_interests_b)} recorded).")
    elif not interests_available:
        explanation_parts.append("Interest alignment estimated from limited profile observations.")
    
    if signals_available and conv_signals_count > 0:
        explanation_parts.append(f"Simulated dialogue revealed {conv_signals_count} mutual interest signal(s) during exchange.")
    
    if not explanation_parts:
        explanation_parts.append("Compatibility evaluated on available profile dimensions without assuming unevidenced traits.")

    explanation = " ".join(explanation_parts)

    return CompatibilityResult(
        participantId=profile_a.personId,
        candidateId=profile_b.personId,
        directionalScore=dir_score_a,
        candidateDirectionalScore=dir_score_b,
        reciprocalScore=reciprocal_score,
        scoreBreakdown=breakdown,
        explanation=explanation,
        confidence=overall_confidence,
        missingDataWarnings=missing_warnings,
        datingSessionId=dating_session.pairId if dating_session else None
    )
