import mongoose from 'mongoose';

const conversationTurnSchema = new mongoose.Schema({
  speakerId: { type: String, required: true },
  speakerName: { type: String, required: true },
  turnIndex: { type: Number, required: true },
  message: { type: String, required: true }
}, { _id: false });

const tentativeSignalSchema = new mongoose.Schema({
  signal: { type: String, required: true },
  evidence: { type: String, required: true }
}, { _id: false });

const datingSessionSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    index: true
  },
  pairId: {
    type: String,
    required: true
  },
  participant1Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  participant2Id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  conversationTurns: [conversationTurnSchema],
  sharedInterestsDiscovered: [{ type: String }],
  unresolvedQuestions: [{ type: String }],
  tentativeSignals: [tentativeSignalSchema],
  sessionStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'completed'
  }
}, { timestamps: true });

// Prevent duplicate dating sessions within the same run
datingSessionSchema.index({ runId: 1, pairId: 1 }, { unique: true });

export const DatingSession = mongoose.model('DatingSession', datingSessionSchema);
