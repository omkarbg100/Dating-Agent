import mongoose from 'mongoose';

const scoreBreakdownSchema = new mongoose.Schema({
  sharedInterests: { type: Number, default: 0 },
  statedValues: { type: Number, default: 0 },
  preferenceAlignment: { type: Number, default: 0 },
  conversationSignals: { type: Number, default: 0 }
}, { _id: false });

const rankingSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    index: true
  },
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  directionalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  candidateDirectionalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  reciprocalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  scoreBreakdown: {
    type: scoreBreakdownSchema,
    required: true
  },
  explanation: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  missingDataWarnings: [{ type: String }],
  datingSessionId: {
    type: String,
    default: null
  },
  rank: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Prevent duplicate pair evaluations within the same run
rankingSchema.index({ runId: 1, participantId: 1, candidateId: 1 }, { unique: true });

export const Ranking = mongoose.model('Ranking', rankingSchema);
