from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ParticipantInput(BaseModel):
    id: str
    name: str
    cohortId: Optional[str] = "cohort-default"
    linkedinUrl: str
    instagramUrl: str
    consent: bool
    authorizedContent: Optional[Dict[str, Optional[str]]] = Field(
        default_factory=lambda: {"linkedin": None, "instagram": None}
    )


class EvidenceItem(BaseModel):
    attribute: str = Field(description="The attribute being evidenced, e.g., 'interest: hiking' or 'value: continuous learning'")
    value: str = Field(description="The identified value or observation")
    source: str = Field(description="'LinkedIn' or 'Instagram'")
    reference: str = Field(description="Direct supporting excerpt, snippet, or quote from the source")


class StructuredProfile(BaseModel):
    personId: str
    summary: str = Field(description="Concise, factual summary of the participant based only on observed source evidence")
    interests: List[str] = Field(default_factory=list, description="Evidence-backed professional and personal interests")
    hobbies: List[str] = Field(default_factory=list, description="Evidence-backed creative, athletic, or leisure hobbies")
    values: List[str] = Field(default_factory=list, description="Explicitly supported values (e.g. innovation, community, wellness)")
    datingPreferences: List[str] = Field(default_factory=list, description="Explicitly stated dating or lifestyle preferences if documented")
    communicationStyle: str = Field(default="Unknown", description="Communication preferences, ONLY when supported by concrete evidence, else 'Unknown'")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="Audit trail of evidence verifying each attribute")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Overall profile confidence score from 0.0 to 1.0 based on available source evidence")
    missingInformation: List[str] = Field(default_factory=list, description="List of unobserved or unavailable profile dimensions")


class ConversationTurn(BaseModel):
    speakerId: str
    speakerName: str
    turnIndex: int
    message: str


class TentativeSignal(BaseModel):
    signal: str
    evidence: str


class DatingSessionResult(BaseModel):
    pairId: str
    participant1Id: str
    participant2Id: str
    conversationTurns: List[ConversationTurn] = Field(default_factory=list)
    sharedInterestsDiscovered: List[str] = Field(default_factory=list)
    unresolvedQuestions: List[str] = Field(default_factory=list)
    tentativeSignals: List[TentativeSignal] = Field(default_factory=list)
    sessionStatus: str = "completed"


class ScoreBreakdown(BaseModel):
    sharedInterests: float = Field(default=0.0, description="Score contribution from shared interests (weight: 35%)")
    statedValues: float = Field(default=0.0, description="Score contribution from explicitly stated values (weight: 25%)")
    preferenceAlignment: float = Field(default=0.0, description="Score contribution from explicit preference alignment (weight: 25%)")
    conversationSignals: float = Field(default=0.0, description="Score contribution from reciprocal conversation signals (weight: 15%)")


class CompatibilityResult(BaseModel):
    participantId: str
    candidateId: str
    directionalScore: float = Field(ge=0.0, le=100.0)
    candidateDirectionalScore: float = Field(ge=0.0, le=100.0)
    reciprocalScore: float = Field(ge=0.0, le=100.0)
    scoreBreakdown: ScoreBreakdown
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0)
    missingDataWarnings: List[str] = Field(default_factory=list)
    datingSessionId: Optional[str] = None
    rank: Optional[int] = None


class WorkflowRunRequest(BaseModel):
    runId: Optional[str] = None
    cohortId: Optional[str] = "cohort-default"
    participants: List[ParticipantInput]


class SingleAnalysisRequest(BaseModel):
    participant: ParticipantInput
