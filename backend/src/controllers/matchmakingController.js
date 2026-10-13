import { Participant } from '../models/Participant.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { DatingSession } from '../models/DatingSession.js';
import { Ranking } from '../models/Ranking.js';
import { AgentRun } from '../models/AgentRun.js';
import { callAIRunWorkflow } from '../services/aiService.js';

export const runMatchmaking = async (req, res) => {
  try {
    const { cohortId = 'cohort-1', participantIds } = req.body;
    let participants = [];

    if (participantIds && participantIds.length >= 2) {
      participants = await Participant.find({ _id: { $in: participantIds } });
    } else {
      participants = await Participant.find({ cohortId }).limit(10); // Default to up to 10 for interactive speed
    }

    if (participants.length < 2) {
      return res.status(400).json({ error: 'At least 2 participants with consent are required to start matchmaking.' });
    }

    const runId = `run_${Date.now()}`;
    const agentRun = new AgentRun({
      runId,
      cohortId,
      status: 'running',
      currentStep: 'Starting LangGraph 6-Node Pipeline',
      totalParticipants: participants.length,
      totalPairs: (participants.length * (participants.length - 1)) / 2
    });
    await agentRun.save();

    // Send immediate response or run asynchronously
    // Since prompt mentions "The Node.js backend should validate requests, store records, call the Python AI service, and return results to React. Use ordinary asynchronous requests and status polling."
    // Let's execute the workflow and update the run status so polling can observe progress!
    (async () => {
      try {
        console.log(`[Run ${runId}] Invoking LangGraph workflow with ${participants.length} participants...`);
        agentRun.currentStep = 'Executing LangGraph 6-Node Workflow';
        await agentRun.save();

        const workflowOutput = await callAIRunWorkflow({
          runId,
          cohortId,
          participants
        });

        console.log(`[Run ${runId}] Workflow completed. Persisting results to MongoDB...`);

        // 1. Persist/Update Agent Profiles
        const analyzedProfiles = workflowOutput.analyzedProfiles || {};
        for (const [pId, pData] of Object.entries(analyzedProfiles)) {
          await AgentProfile.findOneAndUpdate(
            { participantId: pId },
            {
              participantId: pId,
              personId: pId,
              summary: pData.summary,
              interests: pData.interests || [],
              hobbies: pData.hobbies || [],
              values: pData.values || [],
              datingPreferences: pData.datingPreferences || [],
              communicationStyle: pData.communicationStyle || 'Unknown',
              evidence: pData.evidence || [],
              confidence: pData.confidence || 0,
              missingInformation: pData.missingInformation || []
            },
            { upsert: true }
          );
          await Participant.findByIdAndUpdate(pId, { processingStatus: 'analyzed' });
        }

        // 2. Persist Dating Sessions
        const datingSessions = workflowOutput.datingSessions || [];
        for (const session of datingSessions) {
          await DatingSession.findOneAndUpdate(
            { runId, pairId: session.pairId },
            {
              runId,
              pairId: session.pairId,
              participant1Id: session.participant1Id,
              participant2Id: session.participant2Id,
              conversationTurns: session.conversationTurns,
              sharedInterestsDiscovered: session.sharedInterestsDiscovered,
              unresolvedQuestions: session.unresolvedQuestions,
              tentativeSignals: session.tentativeSignals,
              sessionStatus: 'completed'
            },
            { upsert: true }
          );
        }

        // 3. Persist Rankings
        const rankingsByParticipant = workflowOutput.rankings || {};
        for (const [pId, candidates] of Object.entries(rankingsByParticipant)) {
          for (const cand of candidates) {
            await Ranking.findOneAndUpdate(
              { runId, participantId: pId, candidateId: cand.candidateId },
              {
                runId,
                participantId: pId,
                candidateId: cand.candidateId,
                directionalScore: cand.directionalScore,
                candidateDirectionalScore: cand.candidateDirectionalScore,
                reciprocalScore: cand.reciprocalScore,
                scoreBreakdown: cand.scoreBreakdown,
                explanation: cand.explanation,
                confidence: cand.confidence,
                missingDataWarnings: cand.missingDataWarnings || [],
                datingSessionId: cand.datingSessionId,
                rank: cand.rank
              },
              { upsert: true }
            );
          }
        }

        agentRun.status = 'completed';
        agentRun.currentStep = 'Completed all 6 workflow nodes';
        agentRun.completedPairs = datingSessions.length;
        await agentRun.save();
        console.log(`[Run ${runId}] All records successfully persisted to MongoDB.`);
      } catch (err) {
        console.error(`[Run ${runId}] Error executing matchmaking workflow:`, err);
        agentRun.status = 'failed';
        agentRun.currentStep = 'Workflow execution failed';
        agentRun.errors = [err.message];
        await agentRun.save();
      }
    })();

    return res.status(202).json({
      message: 'Matchmaking run initiated.',
      runId,
      status: 'running',
      totalParticipants: participants.length
    });
  } catch (error) {
    console.error('Error initiating matchmaking run:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getRunStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const run = await AgentRun.findOne({ runId: id });
    if (!run) {
      return res.status(404).json({ error: 'Run not found.' });
    }
    return res.json(run);
  } catch (error) {
    console.error('Error fetching run status:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getParticipantRankings = async (req, res) => {
  try {
    const { id } = req.params;
    const { runId } = req.query;

    const query = { participantId: id };
    if (runId) {
      query.runId = runId;
    }

    // Sort descending by reciprocalScore
    const rankings = await Ranking.find(query)
      .populate('candidateId', 'name linkedinUrl instagramUrl')
      .populate('participantId', 'name')
      .sort({ rank: 1, reciprocalScore: -1 });

    return res.json(rankings);
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getDatingSession = async (req, res) => {
  try {
    const { id } = req.params;
    // Search by pairId or _id
    let session = await DatingSession.findOne({
      $or: [{ pairId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    })
      .populate('participant1Id', 'name linkedinUrl instagramUrl')
      .populate('participant2Id', 'name linkedinUrl instagramUrl');

    if (!session) {
      // Also allow querying by two participant IDs in format `p1_p2`
      const parts = id.replace('date_', '').split('_');
      if (parts.length === 2) {
        session = await DatingSession.findOne({
          $or: [
            { participant1Id: parts[0], participant2Id: parts[1] },
            { participant1Id: parts[1], participant2Id: parts[0] }
          ]
        })
          .populate('participant1Id', 'name linkedinUrl instagramUrl')
          .populate('participant2Id', 'name linkedinUrl instagramUrl');
      }
    }

    if (!session) {
      return res.status(404).json({ error: 'Dating conversation transcript not found.' });
    }

    return res.json(session);
  } catch (error) {
    console.error('Error fetching dating session:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments();
    const analyzedProfiles = await AgentProfile.countDocuments();
    const completedDatingSessions = await DatingSession.countDocuments();
    const completedRankings = await Ranking.countDocuments();
    const recentRuns = await AgentRun.find().sort({ createdAt: -1 }).limit(5);

    return res.json({
      totalParticipants,
      analyzedProfiles,
      completedDatingSessions,
      completedRankings,
      recentRuns
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: error.message });
  }
};
