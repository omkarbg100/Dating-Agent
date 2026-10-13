import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  Trophy,
  MessageSquareHeart,
  Bot,
  ShieldCheck,
  RotateCw,
  Heart,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

export const DatingArenaAndRankings = () => {
  const [activeTab, setActiveTab] = useState('rankings'); // 'rankings' or 'arena'
  const [participants, setParticipants] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [rankings, setRankings] = useState([]);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Arena states
  const [datingSession, setDatingSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [activePairId, setActivePairId] = useState('');

  // Load participants
  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const data = await api.getParticipants();
        // Sort: analyzed first, then by name
        const sorted = [...(data || [])].sort((a, b) => {
          if (a.processingStatus === 'analyzed' && b.processingStatus !== 'analyzed') return -1;
          if (a.processingStatus !== 'analyzed' && b.processingStatus === 'analyzed') return 1;
          return a.name.localeCompare(b.name);
        });
        setParticipants(sorted);
        if (sorted.length > 0) {
          const defaultParticipant =
            sorted.find((p) => p.name.includes('Alex Chen') && p.processingStatus === 'analyzed') ||
            sorted.find((p) => p.processingStatus === 'analyzed') ||
            sorted[0];
          setSelectedParticipantId(defaultParticipant._id);
        }
      } catch (err) {
        console.error('Failed to load participants:', err);
      }
    };
    loadParticipants();
  }, []);

  // Load rankings whenever selected participant changes
  useEffect(() => {
    if (!selectedParticipantId) return;

    const loadRankings = async () => {
      try {
        setLoadingRankings(true);
        const data = await api.getParticipantRankings(selectedParticipantId);
        setRankings(data);
        // If there are rankings, set the first pair as default for arena
        if (data.length > 0 && !activePairId) {
          const firstRank = data[0];
          const sessionKey = firstRank.datingSessionId || `date_${selectedParticipantId}_${firstRank.candidateId?._id || firstRank.candidateId}`;
          setActivePairId(sessionKey);
        }
      } catch (err) {
        console.error('Failed to load rankings:', err);
      } finally {
        setLoadingRankings(false);
      }
    };

    loadRankings();
  }, [selectedParticipantId]);

  // Load dating session whenever activePairId changes
  useEffect(() => {
    if (!activePairId) return;

    const loadSession = async () => {
      try {
        setLoadingSession(true);
        const session = await api.getDatingSession(activePairId);
        setDatingSession(session);
      } catch (err) {
        console.warn('Dating session transcript query returned error:', err);
        setDatingSession(null);
      } finally {
        setLoadingSession(false);
      }
    };

    loadSession();
  }, [activePairId]);

  const handleOpenArenaForPair = (pairSessionId, candId) => {
    const key = pairSessionId || `date_${selectedParticipantId}_${candId}`;
    setActivePairId(key);
    setActiveTab('arena');
  };

  const selectedParticipant = participants.find((p) => p._id === selectedParticipantId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header and Capsule Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0E4E7] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#292329] flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#E8A4B4]" />
            Dating Arena & Compatibility Rankings
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] mt-1">
            Observe simulated 4-turn dialogues between AI agent personas and inspect multi-factor compatibility scores.
          </p>
        </div>

        {/* Tab Toggle (Capsule Pill inspired by reference) */}
        <div className="flex items-center p-1 rounded-full bg-[#FFF1F4] border border-[#F0E4E7]">
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'rankings'
                ? 'bg-white text-[#292329] border border-[#F0E4E7] shadow-xs'
                : 'text-[#827780] hover:text-[#292329]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Compatibility Rankings</span>
          </button>
          <button
            onClick={() => setActiveTab('arena')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'arena'
                ? 'bg-[#FBE5EB] text-[#292329] border border-[#E8A4B4]/60 shadow-xs'
                : 'text-[#827780] hover:text-[#292329]'
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5 text-[#E8A4B4]" />
            <span>Dating Arena Simulation</span>
          </button>
        </div>
      </div>

      {/* Focus Participant Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-[#F0E4E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-[#827780]">
          <span className="font-semibold text-[#292329] uppercase tracking-wider">Focus Participant:</span>
        </div>
        <select
          value={selectedParticipantId}
          onChange={(e) => setSelectedParticipantId(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#F0E4E7] text-[#292329] text-xs sm:text-sm focus:outline-none focus:border-[#E8A4B4] cursor-pointer w-full sm:w-auto min-w-[280px]"
        >
          {participants.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} ({p.processingStatus})
            </option>
          ))}
        </select>
      </div>

      {/* VIEW 1: COMPATIBILITY RANKINGS */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#292329] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#E8A4B4]" />
              Ranked Candidates for {selectedParticipant?.name}
            </h2>
            <span className="text-xs text-[#827780] font-mono">
              {rankings.length} Evaluated Candidates
            </span>
          </div>

          {loadingRankings ? (
            <div className="py-20 text-center text-[#827780] text-sm">Computing candidate rankings...</div>
          ) : rankings.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#F0E4E7] shadow-xs space-y-3">
              <Trophy className="w-10 h-10 text-[#F0E4E7] mx-auto" />
              <h3 className="text-sm font-semibold text-[#292329]">No Rankings Available</h3>
              <p className="text-xs text-[#827780] max-w-md mx-auto">
                No matchmaking run has evaluated candidate pairs for {selectedParticipant?.name} yet. Run matchmaking from the Dashboard to generate pairwise simulations and rankings.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {rankings.map((rankItem) => {
                const candidateName = rankItem.candidateId?.name || 'Candidate';
                const candidateId = rankItem.candidateId?._id || rankItem.candidateId;
                const score = Math.round(rankItem.reciprocalScore || 0);

                return (
                  <div
                    key={rankItem._id}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-[#F0E4E7] shadow-xs hover:border-[#E8A4B4] transition-all space-y-4"
                  >
                    {/* Top Row: Rank & Scores */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E4E7] pb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] text-[#292329] font-bold flex items-center justify-center text-xs">
                          #{rankItem.rank}
                        </span>
                        <div>
                          <h3 className="text-sm sm:text-base font-semibold text-[#292329] flex items-center gap-2">
                            <span>{candidateName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFF1F4] text-[#827780] border border-[#F0E4E7]">
                              Simulated Pair
                            </span>
                          </h3>
                          <p className="text-xs text-[#827780]">
                            Evidence confidence: {Math.round((rankItem.confidence || 0) * 100)}%
                          </p>
                        </div>
                      </div>

                      {/* Score Metrics & Action */}
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-[#827780] font-medium">Reciprocal Compatibility</div>
                          <div className="text-lg sm:text-xl font-bold text-[#292329]">
                            {score}%
                          </div>
                        </div>

                        <div className="h-7 w-px bg-[#F0E4E7] hidden sm:block"></div>

                        <div className="text-right text-xs text-[#827780] hidden md:block">
                          <div>Directional ({selectedParticipant?.name} &rarr; Cand): <strong className="text-[#292329]">{rankItem.directionalScore}%</strong></div>
                          <div>Directional (Cand &rarr; {selectedParticipant?.name}): <strong className="text-[#292329]">{rankItem.candidateDirectionalScore}%</strong></div>
                        </div>

                        <button
                          onClick={() => handleOpenArenaForPair(rankItem.datingSessionId, candidateId)}
                          className="btn-primary-pink px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                        >
                          <MessageSquareHeart className="w-3.5 h-3.5 text-[#E8A4B4]" />
                          <span>View Dialogue</span>
                        </button>
                      </div>
                    </div>

                    {/* Soft-Pink Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] overflow-hidden">
                        <div
                          className="h-full bg-[#E8A4B4] rounded-full transition-all duration-500"
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Score Breakdown (35% Interests, 25% Values, 25% Prefs, 15% Signals) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FFFCFC] p-3 rounded-xl border border-[#F0E4E7] text-xs">
                      <div>
                        <span className="text-[#827780] block text-[10px] uppercase font-semibold">Shared Interests (35%)</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                          {rankItem.scoreBreakdown?.sharedInterests}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#827780] block text-[10px] uppercase font-semibold">Stated Values (25%)</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                          {rankItem.scoreBreakdown?.statedValues}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#827780] block text-[10px] uppercase font-semibold">Pref. Alignment (25%)</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                          {rankItem.scoreBreakdown?.preferenceAlignment}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[#827780] block text-[10px] uppercase font-semibold">Conv. Signals (15%)</span>
                        <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                          {rankItem.scoreBreakdown?.conversationSignals}%
                        </span>
                      </div>
                    </div>

                    {/* Evidence-Based Explanation & Missing Warnings */}
                    <div className="space-y-2 text-xs">
                      <p className="text-[#827780] leading-relaxed">
                        <strong className="text-[#292329]">Evaluation:</strong> {rankItem.explanation}
                      </p>

                      {rankItem.missingDataWarnings?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {rankItem.missingDataWarnings.map((warn, wIdx) => (
                            <span
                              key={wIdx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-[#FFF1F4] text-[#C96D78] border border-[#F0E4E7] flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{warn}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DATING ARENA SIMULATION */}
      {activeTab === 'arena' && (
        <div className="space-y-6">
          {/* Simulation Header Notice */}
          <div className="p-3.5 rounded-xl bg-[#FFF1F4] border border-[#F0E4E7] text-xs text-[#827780] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E8A4B4]" />
              <span>
                <strong className="text-[#292329]">Simulated Dating Encounter:</strong> Generated 4-turn dialogue between two distinct agent personas speaking strictly from authorized profile observations.
              </span>
            </div>
            <span className="text-[10px] font-mono bg-white border border-[#F0E4E7] px-2 py-0.5 rounded text-[#827780]">
              4-Turn Exchange
            </span>
          </div>

          {/* Conversation Pair Selector */}
          {rankings.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#F0E4E7] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[#827780]">
                <MessageSquareHeart className="w-4 h-4 text-[#E8A4B4]" />
                <span className="font-semibold text-[#292329] uppercase tracking-wider">Conversation Pair:</span>
              </div>
              <select
                value={activePairId}
                onChange={(e) => setActivePairId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#F0E4E7] text-[#292329] text-xs sm:text-sm focus:outline-none focus:border-[#E8A4B4] cursor-pointer w-full sm:w-auto min-w-[320px]"
              >
                {rankings.map((r) => {
                  const pKey = r.datingSessionId || `date_${selectedParticipantId}_${r.candidateId?._id || r.candidateId}`;
                  return (
                    <option key={r._id} value={pKey}>
                      {selectedParticipant?.name} &amp; {r.candidateId?.name || 'Candidate'} (#{r.rank} · {Math.round(r.reciprocalScore)}% Match)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {loadingSession ? (
            <div className="py-20 text-center text-[#827780] text-sm">Loading dating conversation transcript...</div>
          ) : !datingSession || !datingSession.conversationTurns || datingSession.conversationTurns.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-[#F0E4E7] shadow-xs space-y-3">
              <MessageSquareHeart className="w-10 h-10 text-[#F0E4E7] mx-auto" />
              <h3 className="text-sm font-semibold text-[#292329]">No Dating Dialogue Generated Yet</h3>
              <p className="text-xs text-[#827780] max-w-md mx-auto">
                Select an evaluated pair from the Compatibility Rankings tab, or run matchmaking from the Dashboard to generate real 4-turn dialogues.
              </p>
              <button
                onClick={() => setActiveTab('rankings')}
                className="btn-primary-pink px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Go to Rankings
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Chat Dialogue (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-[#F0E4E7] shadow-xs space-y-6">
                {/* Agent Identity Cards */}
                <div className="grid grid-cols-2 gap-4 border-b border-[#F0E4E7] pb-4">
                  {/* Agent 1 */}
                  <div className="p-3.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#827780]">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#827780] font-semibold block">Agent 1</span>
                      <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                        {datingSession.participant1Id?.name || 'Agent 1'}
                      </span>
                    </div>
                  </div>

                  {/* Agent 2 */}
                  <div className="p-3.5 rounded-xl bg-[#FFF1F4] border border-[#F0E4E7] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-[#E8A4B4]/50 flex items-center justify-center text-[#E8A4B4]">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#827780] font-semibold block">Agent 2</span>
                      <span className="text-xs sm:text-sm font-semibold text-[#292329]">
                        {datingSession.participant2Id?.name || 'Agent 2'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Turn-by-Turn Chat Stream */}
                <div className="space-y-4">
                  {datingSession.conversationTurns.map((turn, tIdx) => {
                    const isEven = turn.turnIndex % 2 === 0;

                    return (
                      <div
                        key={tIdx}
                        className={`flex flex-col ${isEven ? 'items-start' : 'items-end'} space-y-1`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-[#827780] px-1">
                          <span className="font-medium text-[#292329]">{turn.speakerName}</span>
                          <span>·</span>
                          <span className="text-[10px] uppercase font-mono">Turn {turn.turnIndex + 1} of 4</span>
                        </div>

                        {/* Light neutral bubble for Agent 1, faint-pink bubble for Agent 2 */}
                        <div
                          className={`max-w-xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isEven
                              ? 'bg-[#F9F7F8] border border-[#F0E4E7] text-[#292329] rounded-tl-sm'
                              : 'bg-[#FFF1F4] border border-[#F0E4E7] text-[#292329] rounded-tr-sm'
                          }`}
                        >
                          {turn.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Signals & Discoveries (4 cols) */}
              <div className="lg:col-span-4 space-y-5">
                {/* Discovered Shared Interests */}
                <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
                  <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                    <Heart className="w-3.5 h-3.5 text-[#E8A4B4]" />
                    Shared Interests Discovered
                  </h3>
                  {datingSession.sharedInterestsDiscovered?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {datingSession.sharedInterestsDiscovered.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFF1F4] text-[#292329] border border-[#F0E4E7]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#827780] italic">No direct overlap identified during short exchange.</p>
                  )}
                </div>

                {/* Tentative Mutual Signals */}
                <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
                  <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#E8A4B4]" />
                    Tentative Signals
                  </h3>
                  {datingSession.tentativeSignals?.length > 0 ? (
                    <div className="space-y-2">
                      {datingSession.tentativeSignals.map((sig, sIdx) => (
                        <div key={sIdx} className="p-3 rounded-xl bg-[#FFF1F4]/40 border border-[#F0E4E7] space-y-1">
                          <div className="text-xs font-medium text-[#292329] flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-[#54866A] shrink-0" />
                            <span>{sig.signal}</span>
                          </div>
                          <p className="text-[11px] text-[#827780] italic">
                            Evidence: {sig.evidence}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#827780] italic">No strong mutual signals registered.</p>
                  )}
                </div>

                {/* Unresolved Questions */}
                <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
                  <h3 className="text-xs font-semibold text-[#827780] flex items-center gap-1.5 uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-[#827780]" />
                    Unresolved Questions
                  </h3>
                  {datingSession.unresolvedQuestions?.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-[#827780]">
                      {datingSession.unresolvedQuestions.map((q, qIdx) => (
                        <li key={qIdx} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8A4B4] mt-1.5 shrink-0"></span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[#827780] italic">No unanswered questions noted.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DatingArenaAndRankings;
