import mongoose from 'mongoose';

const evidenceItemSchema = new mongoose.Schema({
  attribute: { type: String, required: true },
  value: { type: String, required: true },
  source: { type: String, enum: ['LinkedIn', 'Instagram'], required: true },
  reference: { type: String, required: true }
}, { _id: false });

const agentProfileSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true,
    unique: true,
    index: true
  },
  personId: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  interests: [{ type: String }],
  hobbies: [{ type: String }],
  values: [{ type: String }],
  datingPreferences: [{ type: String }],
  communicationStyle: {
    type: String,
    default: 'Unknown'
  },
  evidence: [evidenceItemSchema],
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  missingInformation: [{ type: String }]
}, { timestamps: true });

export const AgentProfile = mongoose.model('AgentProfile', agentProfileSchema);
