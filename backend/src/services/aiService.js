import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

export const callAIAnalyzeProfile = async (participant) => {
  try {
    const payload = {
      participant: {
        id: participant._id.toString(),
        name: participant.name,
        cohortId: participant.cohortId,
        linkedinUrl: participant.linkedinUrl,
        instagramUrl: participant.instagramUrl,
        consent: participant.consent,
        authorizedContent: participant.authorizedContent || { linkedin: null, instagram: null }
      }
    };
    const response = await axios.post(`${AI_SERVICE_URL}/api/analyze-profile`, payload, {
      timeout: 60000
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    throw new Error(`AI Service Profile Analysis Failed: ${JSON.stringify(errorMsg)}`);
  }
};

export const callAIRunWorkflow = async ({ runId, cohortId, participants }) => {
  try {
    const payload = {
      runId,
      cohortId,
      participants: participants.map(p => ({
        id: p._id.toString(),
        name: p.name,
        cohortId: p.cohortId,
        linkedinUrl: p.linkedinUrl,
        instagramUrl: p.instagramUrl,
        consent: p.consent,
        authorizedContent: p.authorizedContent || { linkedin: null, instagram: null }
      }))
    };
    const response = await axios.post(`${AI_SERVICE_URL}/api/run-workflow`, payload, {
      timeout: 180000
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.detail || error.message;
    throw new Error(`AI Service Workflow Execution Failed: ${JSON.stringify(errorMsg)}`);
  }
};
