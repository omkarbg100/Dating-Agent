import axios from "axios";
// Resolve API Base dynamically from .env (VITE_API_BASE_URL)
const isProd = Boolean(import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')));
const defaultBase = isProd ? 'https://dating-agent-backend2.onrender.com/api' : '/api';
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultBase;


const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  // Dashboard
  getDashboardStats: async () => {
    const res = await client.get('/dashboard/stats');
    return res.data;
  },

  // Participants
  getParticipants: async (cohortId) => {
    const params = cohortId ? { cohortId } : {};
    const res = await client.get('/participants', { params });
    return res.data;
  },

  createParticipant: async (data) => {
    const res = await client.post('/participants', data);
    return res.data;
  },

  getParticipantProfile: async (id) => {
    const res = await client.get(`/participants/${id}/profile`);
    return res.data;
  },

  analyzeParticipant: async (id) => {
    const res = await client.post(`/participants/${id}/analyze`);
    return res.data;
  },

  // Matchmaking & Runs
  runMatchmaking: async (data) => {
    const res = await client.post('/matchmaking/run', data);
    return res.data;
  },

  getRunStatus: async (id) => {
    const res = await client.get(`/runs/${id}`);
    return res.data;
  },

  getParticipantRankings: async (id, runId) => {
    const params = runId ? { runId } : {};
    const res = await client.get(`/participants/${id}/rankings`, { params });
    return res.data;
  },

  getDatingSession: async (id) => {
    const res = await client.get(`/dates/${id}`);
    return res.data;
  },

  seedDemoCohort: async () => {
    const res = await client.post('/cohorts/seed-demo');
    return res.data;
  }
};

export default api;
