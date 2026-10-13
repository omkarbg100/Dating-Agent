import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Cpu,
  BrainCircuit,
  Search,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Tag,
  Heart,
  MessageCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { LinkedinIcon, InstagramIcon } from '../components/SocialIcons';

export const ProfileLab = () => {
  const [participants, setParticipants] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadParticipants = async () => {
      try {
        const data = await api.getParticipants();
        // Sort: analyzed first, then by name
        const sorted = [...(data || [])].sort((a, b) => {
          if (a.processingStatus === 'analyzed' && b.processingStatus !== 'analyzed') return -1;
          if (a.processingStatus !== 'analyzed' && b.processingStatus === 'analyzed') return 1;
          return a.name.localeCompare(b.name);
        });
        setParticipants(sorted);
        if (sorted.length > 0) {
          const defaultParticipant =
            sorted.find((p) => p.name.includes('Alex Chen') && p.processingStatus === 'analyzed') ||
            sorted.find((p) => p.processingStatus === 'analyzed') ||
            sorted[0];
          setSelectedId(defaultParticipant._id);
        }
      } catch (err) {
        console.error('Failed to load participants:', err);
      }
    };
    loadParticipants();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getParticipantProfile(selectedId);
        setProfileData(data);
      } catch (err) {
        setProfileData(null);
        if (err.response?.status === 404) {
          setError('Profile has not yet been analyzed for this participant.');
        } else {
          setError(err.response?.data?.error || err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [selectedId]);

  const handleRunAnalysis = async () => {
    if (!selectedId) return;
    try {
      setAnalyzing(true);
      setError(null);
      const res = await api.analyzeParticipant(selectedId);
      setProfileData(res);
      // Update local participants list status
      setParticipants((prev) =>
        prev.map((p) => (p._id === selectedId ? { ...p, processingStatus: 'analyzed' } : p))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedParticipant = participants.find((p) => p._id === selectedId);
  const profile = profileData?.profile;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Participant Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#292329] flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-[#E8A4B4]" />
            Profile Lab
          </h1>
          <p className="text-xs sm:text-sm text-[#827780] mt-1">
            Audit evidence-backed attributes extracted exclusively from LinkedIn and Instagram sources.
          </p>
        </div>

        {/* Selector & Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#F0E4E7] text-[#292329] text-xs sm:text-sm focus:outline-none focus:border-[#E8A4B4] cursor-pointer min-w-[240px] shadow-xs"
          >
            {participants.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.processingStatus})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || !selectedId}
            className="btn-primary-pink px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            {analyzing ? <RotateCw className="w-4 h-4 animate-spin text-[#292329]" /> : <BrainCircuit className="w-4 h-4 text-[#292329]" />}
            <span>{analyzing ? 'Analyzing...' : 'Analyze Profile'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[#827780] text-sm">Loading participant profile...</div>
      ) : !profile ? (
        /* Empty / Unanalyzed State */
        <div className="bg-white rounded-2xl p-10 text-center border border-[#F0E4E7] shadow-xs space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#FFF1F4] border border-[#F0E4E7] flex items-center justify-center mx-auto text-[#E8A4B4]">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-[#292329]">Profile Not Yet Analyzed</h2>
          <p className="text-xs text-[#827780] leading-relaxed">
            {selectedParticipant?.name} has not had their LinkedIn and Instagram content processed through LangGraph nodes 1-3. Click &quot;Analyze Profile&quot; to execute the extraction.
          </p>
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="btn-primary-pink px-5 py-2 rounded-xl text-xs font-medium cursor-pointer"
          >
            {analyzing ? 'Processing Sources...' : 'Start Profile Extraction'}
          </button>
        </div>
      ) : (
        /* Analyzed Profile Inspection View */
        <div className="space-y-6">
          {/* Top Card: Summary & Verified Provenance */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#F0E4E7] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0E4E7] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#292329]">{selectedParticipant?.name}</h2>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F9F6] text-[#54866A] border border-[#CDE5D8]">
                    Verified Consenting Participant
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#827780]">
                  <span className="flex items-center gap-1.5">
                    <LinkedinIcon className="w-3.5 h-3.5 text-[#827780]" /> LinkedIn
                  </span>
                  <span className="flex items-center gap-1.5">
                    <InstagramIcon className="w-3.5 h-3.5 text-[#827780]" /> Instagram
                  </span>
                </div>
              </div>

              {/* Confidence Score Indicator */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FFF1F4] border border-[#F0E4E7]">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#827780] font-medium">Evidence Confidence</div>
                  <div className="text-base font-semibold text-[#292329]">
                    {Math.round((profile.confidence || 0) * 100)}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-[#E8A4B4]/50 flex items-center justify-center text-xs font-semibold text-[#292329]">
                  {Math.round((profile.confidence || 0) * 100)}
                </div>
              </div>
            </div>

            {/* Light-Pink Highlight Box for AI Summary */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#827780] uppercase tracking-wider">
                Factual Profile Summary
              </span>
              <p className="text-xs sm:text-sm text-[#292329] leading-relaxed bg-[#FFF1F4] p-3.5 rounded-xl border border-[#F0E4E7]">
                {profile.summary}
              </p>
            </div>
          </div>

          {/* Grid of Extracted Attributes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Interests (Pale-pink tags) */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                <Tag className="w-3.5 h-3.5 text-[#E8A4B4]" />
                Observed Interests
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests?.length > 0 ? (
                  profile.interests.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFF1F4] text-[#292329] border border-[#F0E4E7]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#827780] italic">No explicit interests recorded</span>
                )}
              </div>
            </div>

            {/* Hobbies (Pale-pink tags) */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-[#E8A4B4]" />
                Observed Hobbies
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.hobbies?.length > 0 ? (
                  profile.hobbies.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFF1F4] text-[#292329] border border-[#F0E4E7]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#827780] italic">No explicit hobbies recorded</span>
                )}
              </div>
            </div>

            {/* Supported Values */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#54866A]" />
                Supported Values
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {profile.values?.length > 0 ? (
                  profile.values.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#FFF1F4] text-[#292329] border border-[#F0E4E7]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#827780] italic">No values evidenced</span>
                )}
              </div>
            </div>

            {/* Dating Preferences */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-[#E8A4B4]" />
                Stated Preferences
              </h3>
              {profile.datingPreferences?.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#292329]">
                  {profile.datingPreferences.map((pref, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8A4B4] mt-1.5 shrink-0"></span>
                      <span>{pref}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 rounded-xl bg-[#FFF1F4]/50 border border-[#F0E4E7] text-xs text-[#827780] italic">
                  Not explicitly stated in source records. Unstated attributes are not invented.
                </div>
              )}
            </div>

            {/* Communication Style */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#292329] flex items-center gap-1.5 uppercase tracking-wider">
                <MessageCircle className="w-3.5 h-3.5 text-[#827780]" />
                Communication Style
              </h3>
              <div className="p-3 rounded-xl bg-[#FFF1F4]/50 border border-[#F0E4E7] text-xs text-[#292329]">
                {profile.communicationStyle || 'Unknown'}
              </div>
            </div>

            {/* Missing Information / Boundaries */}
            <div className="bg-white rounded-2xl p-5 border border-[#F0E4E7] shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-[#C96D78] flex items-center gap-1.5 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-[#C96D78]" />
                Missing Information
              </h3>
              {profile.missingInformation?.length > 0 ? (
                <ul className="space-y-1 text-xs text-[#827780]">
                  {profile.missingInformation.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#C96D78]"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-[#827780]">No missing data flags recorded.</span>
              )}
            </div>
          </div>

          {/* Evidence Audit Trail Table */}
          <div className="bg-white rounded-2xl p-6 border border-[#F0E4E7] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0E4E7] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#292329] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#827780]" />
                  Evidence Audit Trail
                </h3>
                <p className="text-xs text-[#827780]">Direct source provenance for each extracted attribute</p>
              </div>
              <span className="text-xs text-[#827780] font-mono">
                {profile.evidence?.length || 0} Records
              </span>
            </div>

            {profile.evidence?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#292329]">
                  <thead className="bg-[#FFF1F4]/70 text-[#827780] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg font-medium">Attribute</th>
                      <th className="py-2.5 px-3 font-medium">Extracted Observation</th>
                      <th className="py-2.5 px-3 font-medium">Source</th>
                      <th className="py-2.5 px-3 rounded-r-lg font-medium">Verbatim Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E4E7]/70 text-xs">
                    {profile.evidence.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-[#FFF1F4]/30">
                        <td className="py-2.5 px-3 font-medium text-[#292329]">{ev.attribute}</td>
                        <td className="py-2.5 px-3 text-[#292329]">{ev.value}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              ev.source === 'LinkedIn'
                                ? 'bg-white text-[#827780] border-[#F0E4E7]'
                                : 'bg-[#FFF1F4] text-[#C96D78] border-[#F0E4E7]'
                            }`}
                          >
                            {ev.source}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#827780] italic max-w-md truncate">
                          &quot;{ev.reference}&quot;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#827780] italic">
                No granular evidence records logged.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileLab;
