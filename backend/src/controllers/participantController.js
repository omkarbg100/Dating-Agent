import { Participant } from '../models/Participant.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { callAIAnalyzeProfile } from '../services/aiService.js';
import { demoParticipants } from '../data/demoCohort.js';

const LINKEDIN_REGEX = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;
const INSTAGRAM_REGEX = /^https?:\/\/(www\.)?instagram\.com\/.+/i;

export const createParticipant = async (req, res) => {
  try {
    const { name, cohortId = 'cohort-1', linkedinUrl, instagramUrl, consent, authorizedContent } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Participant name or demo identifier is required.' });
    }
    if (!linkedinUrl || !LINKEDIN_REGEX.test(linkedinUrl.trim())) {
      return res.status(400).json({ error: 'A valid LinkedIn public profile URL is required (e.g. https://www.linkedin.com/in/username).' });
    }
    if (!instagramUrl || !INSTAGRAM_REGEX.test(instagramUrl.trim())) {
      return res.status(400).json({ error: 'A valid Instagram public profile URL is required (e.g. https://www.instagram.com/username).' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Explicit participant consent is strictly required before proceeding.' });
    }

    // Check duplicate
    const existing = await Participant.findOne({
      cohortId,
      $or: [{ linkedinUrl: linkedinUrl.trim() }, { instagramUrl: instagramUrl.trim() }]
    });

    if (existing) {
      return res.status(409).json({ error: 'A participant with this LinkedIn or Instagram URL already exists in this cohort.' });
    }

    const participant = new Participant({
      name: name.trim(),
      cohortId,
      linkedinUrl: linkedinUrl.trim(),
      instagramUrl: instagramUrl.trim(),
      consent: true,
      processingStatus: 'pending',
      authorizedContent: {
        linkedin: authorizedContent?.linkedin?.trim() || null,
        instagram: authorizedContent?.instagram?.trim() || null
      }
    });

    await participant.save();
    return res.status(201).json(participant);
  } catch (error) {
    console.error('Error creating participant:', error);
    return res.status(500).json({ error: error.message || 'Server error while creating participant.' });
  }
};

export const getParticipants = async (req, res) => {
  try {
    const { cohortId } = req.query;
    const filter = cohortId ? { cohortId } : {};
    const participants = await Participant.find(filter).sort({ createdAt: -1 });
    return res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getParticipantProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    const profile = await AgentProfile.findOne({ participantId: id });
    if (!profile) {
      return res.status(404).json({ error: 'Profile has not yet been analyzed for this participant.', participant });
    }

    return res.json({ participant, profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const analyzeParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await Participant.findById(id);
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found.' });
    }

    participant.processingStatus = 'analyzing';
    await participant.save();

    const aiResult = await callAIAnalyzeProfile(participant);

    // Save or update AgentProfile
    const profileData = aiResult.profile;
    const updatedProfile = await AgentProfile.findOneAndUpdate(
      { participantId: id },
      {
        participantId: id,
        personId: id.toString(),
        summary: profileData.summary,
        interests: profileData.interests || [],
        hobbies: profileData.hobbies || [],
        values: profileData.values || [],
        datingPreferences: profileData.datingPreferences || [],
        communicationStyle: profileData.communicationStyle || 'Unknown',
        evidence: profileData.evidence || [],
        confidence: profileData.confidence || 0,
        missingInformation: profileData.missingInformation || []
      },
      { upsert: true, new: true }
    );

    participant.processingStatus = 'analyzed';
    participant.sourceProvenance = {
      linkedinStatus: aiResult.retrievedSources?.linkedin?.status || 'unavailable',
      instagramStatus: aiResult.retrievedSources?.instagram?.status || 'unavailable',
      retrievedAt: new Date()
    };
    await participant.save();

    return res.json({ participant, profile: updatedProfile });
  } catch (error) {
    console.error('Error analyzing participant:', error);
    await Participant.findByIdAndUpdate(req.params.id, { processingStatus: 'failed' });
    return res.status(500).json({ error: error.message || 'Profile analysis failed.' });
  }
};

export const seedDemoCohort = async (req, res) => {
  try {
    const count = await Participant.countDocuments({ cohortId: 'cohort-demo-25' });
    if (count >= 25) {
      const existingCohort = await Participant.find({ cohortId: 'cohort-demo-25' });
      return res.json({ message: 'Demo cohort already seeded.', count: existingCohort.length, participants: existingCohort });
    }

    const inserted = [];
    for (const p of demoParticipants) {
      const exists = await Participant.findOne({ cohortId: p.cohortId, linkedinUrl: p.linkedinUrl });
      if (!exists) {
        const doc = new Participant({ ...p, processingStatus: 'pending' });
        await doc.save();
        inserted.push(doc);
      }
    }

    return res.json({
      message: `Successfully seeded ${inserted.length} consenting demo participants!`,
      totalInCohort: await Participant.countDocuments({ cohortId: 'cohort-demo-25' })
    });
  } catch (error) {
    console.error('Error seeding demo cohort:', error);
    return res.status(500).json({ error: error.message });
  }
};
