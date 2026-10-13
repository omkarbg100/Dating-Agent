import express from 'express';
import {
  createParticipant,
  getParticipants,
  getParticipantProfile,
  analyzeParticipant,
  seedDemoCohort
} from '../controllers/participantController.js';
import {
  runMatchmaking,
  getRunStatus,
  getParticipantRankings,
  getDatingSession,
  getDashboardStats
} from '../controllers/matchmakingController.js';

const router = express.Router();

// Participant management endpoints
router.post('/participants', createParticipant);
router.get('/participants', getParticipants);
router.get('/participants/:id/profile', getParticipantProfile);
router.post('/participants/:id/analyze', analyzeParticipant);

// Matchmaking and agent run endpoints
router.post('/matchmaking/run', runMatchmaking);
router.get('/runs/:id', getRunStatus);
router.get('/participants/:id/rankings', getParticipantRankings);
router.get('/dates/:id', getDatingSession);

// Additional demo & statistics utilities
router.post('/cohorts/seed-demo', seedDemoCohort);
router.get('/dashboard/stats', getDashboardStats);

export default router;
