import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Users,
  BrainCircuit,
  MessageSquareHeart,
  Trophy,
  Play,
  UserPlus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Database,
  ExternalLink
} from 'lucide-react';
import { LinkedinIcon, InstagramIcon } from '../components/SocialIcons';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalParticipants: 0,
    analyzedProfiles: 0,
    completedDatingSessions: 0,
    completedRankings: 0,
    recentRuns: []
  });
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [runningMatchmaking, setRunningMatchmaking] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, participantsData] = await Promise.all([
        api.getDashboardStats(),
        api.getParticipants()
      ]);
      setStats(statsData);
      setParticipants(participantsData || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedDemoCohort = async () => {
    try {
      setSeeding(true);
      setMessage(null);
      const res = await api.seedDemoCohort();
      setMessage({ type: 'success', text: res.message || 'Demo cohort seeded successfully!' });
      await fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSeeding(false);
    }
  };

  const handleStartMatchmaking = async () => {
    try {
      setRunningMatchmaking(true);
      setMessage(null);
      const res = await api.runMatchmaking({ cohortId: 'cohort-demo-25' });
      setMessage({ type: 'success', text: `Matchmaking run started! Run ID: ${res.runId}` });
      await fetchData();
      setTimeout(() => {
        navigate('/dating-arena');
      }, 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to start matchmaking. Ensure at least 2 participants exist.'
      });
    } finally {
      setRunningMatchmaking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Calm Hero / Intro Section */}
      <div className="bg-white rounded-2xl border border-[#F0E4E7] p-8 sm:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle faint pink accent background wash */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFF1F4] rounded-full blur-3xl opacity-60 pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] text-[#827780] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A4B4]"></span>
            Evidence-Based AI Matchmaking Simulation
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#292329] tracking-tight leading-snug">
            Autonomous agent matchmaking grounded in public profile evidence.
          </h1>
          <p className="text-[#827780] text-sm sm:text-base leading-relaxed">
            Consenting participants are represented by truthful AI agents built exclusively from permitted LinkedIn and Instagram sources. The system runs 4-turn simulated conversations and calculates reciprocal compatibility rankings.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartMatchmaking}
              disabled={runningMatchmaking || stats.totalParticipants < 2}
              className="btn-primary-pink px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runningMatchmaking ? <RotateCw className="w-4 h-4 animate-spin text-[#292329]" /> : <Play className="w-4 h-4 fill-[#292329]" />}
              <span>Start Matchmaking Run</span>
            </button>

            <button
              onClick={handleSeedDemoCohort}
              disabled={seeding}
              className="btn-secondary-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {seeding ? <RotateCw className="w-4 h-4 animate-spin text-[#E8A4B4]" /> : <Database className="w-4 h-4 text-[#827780]" />}
              <span>Load 25 Consenting Demo Fixtures</span>
            </button>

            <Link
              to="/add-participants"
              className="btn-secondary-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs"
            >
              <UserPlus className="w-4 h-4 text-[#827780]" />
              <span>Add Custom Participant</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm ${
            message.type === 'success'
              ? 'bg-[#F4F9F6] border-[#CDE5D8] text-[#54866A]'
              : 'bg-[#FDF2F3] border-[#F3CDD3] text-[#C96D78]'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#54866A]" /> : <AlertTriangle className="w-4 h-4 text-[#C96D78]" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="hover:underline cursor-pointer opacity-70">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Participants */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs minimal-card-interactive space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#827780] uppercase tracking-wider">Cohort Participants</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#E8A4B4]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#292329] tracking-tight">{stats.totalParticipants}</div>
          <div className="flex items-center justify-between text-[11px] text-[#827780] pt-1 border-t border-[#F0E4E7]/60">
            <span>Consenting pool</span>
            <Link to="/add-participants" className="text-[#292329] hover:text-[#E8A4B4] font-medium flex items-center gap-1">
              Add <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Analyzed Profiles */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs minimal-card-interactive space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#827780] uppercase tracking-wider">Profiles Analyzed</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#E8A4B4]">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#292329] tracking-tight">{stats.analyzedProfiles}</div>
          <div className="flex items-center justify-between text-[11px] text-[#827780] pt-1 border-t border-[#F0E4E7]/60">
            <span>Structured profiles</span>
            <Link to="/profile-lab" className="text-[#292329] hover:text-[#E8A4B4] font-medium flex items-center gap-1">
              Inspect <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Completed Dating Sessions */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs minimal-card-interactive space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#827780] uppercase tracking-wider">Dating Sessions</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#E8A4B4]">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#292329] tracking-tight">{stats.completedDatingSessions}</div>
          <div className="flex items-center justify-between text-[11px] text-[#827780] pt-1 border-t border-[#F0E4E7]/60">
            <span>4-turn dialogues</span>
            <Link to="/dating-arena" className="text-[#292329] hover:text-[#E8A4B4] font-medium flex items-center gap-1">
              Arena <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: Compatibility Rankings */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs minimal-card-interactive space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#827780] uppercase tracking-wider">Completed Rankings</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center text-[#E8A4B4]">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-semibold text-[#292329] tracking-tight">{stats.completedRankings}</div>
          <div className="flex items-center justify-between text-[11px] text-[#827780] pt-1 border-t border-[#F0E4E7]/60">
            <span>Directional pairs</span>
            <Link to="/dating-arena" className="text-[#292329] hover:text-[#E8A4B4] font-medium flex items-center gap-1">
              Rankings <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Cohort Participants Table & Recent Agent Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Participant Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#F0E4E7] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0E4E7] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#292329] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#827780]" />
                Cohort Participants ({participants.length})
              </h2>
              <p className="text-xs text-[#827780]">Consenting pool available for simulated pairing</p>
            </div>
            <Link
              to="/add-participants"
              className="text-xs font-medium text-[#292329] hover:text-[#E8A4B4] flex items-center gap-1"
            >
              Add New <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {participants.length === 0 ? (
            <div className="py-12 text-center text-[#827780] text-xs space-y-3">
              <Users className="w-8 h-8 mx-auto text-[#E8A4B4]" />
              <p>No participants registered yet.</p>
              <button
                onClick={handleSeedDemoCohort}
                className="btn-primary-pink px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                Load 25 Demo Profiles
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[460px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFF1F4]/70 text-[#827780] uppercase text-[10px] tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg font-medium">Participant</th>
                    <th className="py-2.5 px-3 font-medium">Sources</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 rounded-r-lg font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E4E7]/60">
                  {participants.slice(0, 15).map((p) => (
                    <tr key={p._id} className="hover:bg-[#FFF1F4]/30 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-medium text-[#292329] block">{p.name}</span>
                        <span className="text-[10px] text-[#827780]">{p.cohortId}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span title={p.linkedinUrl} className="text-[#827780]">
                            <LinkedinIcon className="w-3.5 h-3.5" />
                          </span>
                          <span title={p.instagramUrl} className="text-[#827780]">
                            <InstagramIcon className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            p.processingStatus === 'analyzed'
                              ? 'bg-[#F4F9F6] text-[#54866A] border-[#CDE5D8]'
                              : p.processingStatus === 'analyzing'
                              ? 'bg-[#FFF1F4] text-[#C96D78] border-[#F0E4E7]'
                              : 'bg-white text-[#827780] border-[#F0E4E7]'
                          }`}
                        >
                          {p.processingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          to={`/profile-lab`}
                          className="text-[11px] font-medium text-[#292329] hover:text-[#E8A4B4] underline"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Recent Agent Runs & Matchmaking Progress (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#F0E4E7] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0E4E7] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#292329] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#827780]" />
                Recent Agent Runs
              </h2>
              <p className="text-xs text-[#827780]">LangGraph 6-node execution status</p>
            </div>
            <button
              onClick={fetchData}
              className="p-1 rounded-lg hover:bg-[#FFF1F4] text-[#827780] cursor-pointer"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.recentRuns.length === 0 ? (
            <div className="py-12 text-center text-[#827780] text-xs space-y-2">
              <Clock className="w-8 h-8 mx-auto text-[#F0E4E7]" />
              <p>No recent agent runs executed yet.</p>
              <button
                onClick={handleStartMatchmaking}
                disabled={stats.totalParticipants < 2}
                className="text-xs font-medium text-[#292329] hover:text-[#E8A4B4] underline cursor-pointer"
              >
                Launch your first matchmaking run
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F0E4E7]/70">
              {stats.recentRuns.map((run) => (
                <div key={run._id || run.runId} className="py-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium text-[#292329]">{run.runId}</span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        run.status === 'completed'
                          ? 'bg-[#F4F9F6] text-[#54866A] border-[#CDE5D8]'
                          : run.status === 'running'
                          ? 'bg-[#FFF1F4] text-[#C96D78] border-[#F0E4E7]'
                          : 'bg-[#FDF2F3] text-[#C96D78] border-[#F3CDD3]'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#827780]">{run.currentStep || 'Processing'}</p>

                  <div className="flex items-center justify-between text-[11px] text-[#827780] pt-0.5">
                    <span>
                      {run.totalParticipants} Participants · {run.completedPairs} Pairs
                    </span>
                    <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LangGraph 6-Node Summary Note */}
          <div className="mt-4 p-3.5 rounded-xl bg-[#FFF1F4] border border-[#F0E4E7] text-[11px] text-[#827780] space-y-1">
            <span className="font-semibold text-[#292329] block">Sequential 6-Node Architecture</span>
            <p className="leading-relaxed">
              Validate Input &rarr; Retrieve Profile Content &rarr; Analyze Person &rarr; Prepare Dating Pairs &rarr; Agent Dating &rarr; Score & Rank.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
