import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  cohortId: {
    type: String,
    default: 'cohort-1',
    index: true
  },
  linkedinUrl: {
    type: String,
    required: true,
    trim: true
  },
  instagramUrl: {
    type: String,
    required: true,
    trim: true
  },
  consent: {
    type: Boolean,
    required: true,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'analyzing', 'analyzed', 'failed'],
    default: 'pending'
  },
  authorizedContent: {
    linkedin: { type: String, default: null },
    instagram: { type: String, default: null }
  },
  sourceProvenance: {
    linkedinStatus: { type: String, default: 'unavailable' },
    instagramStatus: { type: String, default: 'unavailable' },
    retrievedAt: { type: Date, default: null }
  }
}, { timestamps: true });

// Prevent duplicate participant records in the same cohort
participantSchema.index({ cohortId: 1, linkedinUrl: 1 }, { unique: true });

export const Participant = mongoose.model('Participant', participantSchema);
