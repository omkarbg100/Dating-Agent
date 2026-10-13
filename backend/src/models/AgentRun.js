import mongoose from 'mongoose';

const agentRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  cohortId: {
    type: String,
    default: 'cohort-1'
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  currentStep: {
    type: String,
    default: 'initialized'
  },
  totalParticipants: {
    type: Number,
    default: 0
  },
  totalPairs: {
    type: Number,
    default: 0
  },
  completedPairs: {
    type: Number,
    default: 0
  },
  errors: [{ type: String }],
  validationErrors: [{ type: String }]
}, { timestamps: true });

export const AgentRun = mongoose.model('AgentRun', agentRunSchema);
