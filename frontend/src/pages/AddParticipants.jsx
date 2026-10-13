import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  UserPlus,
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  RotateCw,
  Info
} from 'lucide-react';
import { LinkedinIcon, InstagramIcon } from '../components/SocialIcons';

export const AddParticipants = () => {
  const [formData, setFormData] = useState({
    name: '',
    cohortId: 'cohort-1',
    linkedinUrl: '',
    instagramUrl: '',
    consent: false,
    authorizedLinkedin: '',
    authorizedInstagram: ''
  });

  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchParticipants = async () => {
    try {
      setLoadingList(true);
      const data = await api.getParticipants();
      setParticipants(data);
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Front-end validation
    if (!formData.name.trim()) {
      setError('Please enter a participant name or demo identifier.');
      return;
    }
    if (!formData.linkedinUrl.includes('linkedin.com')) {
      setError('LinkedIn URL must be a valid link containing "linkedin.com".');
      return;
    }
    if (!formData.instagramUrl.includes('instagram.com')) {
      setError('Instagram URL must be a valid link containing "instagram.com".');
      return;
    }
    if (!formData.consent) {
      setError('Explicit participant consent is mandatory to participate in simulated agentic dating.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        cohortId: formData.cohortId.trim() || 'cohort-1',
        linkedinUrl: formData.linkedinUrl.trim(),
        instagramUrl: formData.instagramUrl.trim(),
        consent: formData.consent,
        authorizedContent: {
          linkedin: formData.authorizedLinkedin.trim() || null,
          instagram: formData.authorizedInstagram.trim() || null
        }
      };

      const res = await api.createParticipant(payload);
      setSuccess(`Participant "${res.name}" added successfully to cohort "${res.cohortId}"!`);
      // Reset form
      setFormData({
        name: '',
        cohortId: formData.cohortId,
        linkedinUrl: '',
        instagramUrl: '',
        consent: false,
        authorizedLinkedin: '',
        authorizedInstagram: ''
      });
      fetchParticipants();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error adding participant.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#292329] flex items-center gap-2.5">
          <UserPlus className="w-6 h-6 text-[#E8A4B4]" />
          Add Cohort Participants
        </h1>
        <p className="text-xs sm:text-sm text-[#827780] mt-1">
          Register consenting participants with exact LinkedIn and Instagram public links and authorized source excerpts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-[#F0E4E7] shadow-xs space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-[#FDF2F3] border border-[#F3CDD3] text-[#C96D78] text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#C96D78] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-[#F4F9F6] border border-[#CDE5D8] text-[#54866A] text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#54866A] shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name & Cohort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#292329] mb-1.5">
                  Participant Name / Identifier *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Jordan Lee"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292329] mb-1.5">
                  Cohort ID
                </label>
                <input
                  type="text"
                  name="cohortId"
                  value={formData.cohortId}
                  onChange={handleChange}
                  placeholder="e.g. cohort-1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-xs font-semibold text-[#292329] mb-1.5 flex items-center gap-1.5">
                <LinkedinIcon className="w-3.5 h-3.5 text-[#827780]" />
                LinkedIn Public Profile URL *
              </label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                placeholder="https://www.linkedin.com/in/jordanlee"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs sm:text-sm"
                required
              />
            </div>

            {/* Instagram URL */}
            <div>
              <label className="block text-xs font-semibold text-[#292329] mb-1.5 flex items-center gap-1.5">
                <InstagramIcon className="w-3.5 h-3.5 text-[#827780]" />
                Instagram Public Profile URL *
              </label>
              <input
                type="url"
                name="instagramUrl"
                value={formData.instagramUrl}
                onChange={handleChange}
                placeholder="https://www.instagram.com/jordanlee"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs sm:text-sm"
                required
              />
            </div>

            {/* Source Access Requirement Note */}
            <div className="p-3.5 rounded-xl bg-[#FFF1F4] border border-[#F0E4E7] text-xs text-[#827780] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#E8A4B4] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#292329]">Source Access Note:</strong> A URL alone does not provide unrestricted access without participant credentials or tokens. Supply verified excerpt text below for authentic extraction.
              </span>
            </div>

            {/* Authorized Content Snippets */}
            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-[#292329] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#827780]" />
                  Authorized LinkedIn Content Excerpt (Optional / Recommended)
                </label>
                <textarea
                  name="authorizedLinkedin"
                  value={formData.authorizedLinkedin}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Paste headline, bio, experience, or skills verified from LinkedIn..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292329] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#827780]" />
                  Authorized Instagram Content Excerpt (Optional / Recommended)
                </label>
                <textarea
                  name="authorizedInstagram"
                  value={formData.authorizedInstagram}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Paste bio, hobbies, photography captions, or leisure notes verified from Instagram..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] text-[#292329] placeholder-[#827780]/60 focus:outline-none focus:border-[#E8A4B4] focus:ring-1 focus:ring-[#E8A4B4] text-xs"
                />
              </div>
            </div>

            {/* Consent Confirmation */}
            <div className="pt-2 border-t border-[#F0E4E7]">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className="mt-0.5 w-4 h-4 rounded border-[#F0E4E7] text-[#E8A4B4] focus:ring-[#E8A4B4] cursor-pointer"
                  required
                />
                <span className="text-xs text-[#827780] group-hover:text-[#292329] leading-relaxed">
                  I confirm that this participant has given explicit consent to be represented by an AI agent in simulated dating conversations, using only verified content from these two sources.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-pink w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? <RotateCw className="w-4 h-4 animate-spin text-[#292329]" /> : <ShieldCheck className="w-4 h-4 text-[#292329]" />}
              <span>{submitting ? 'Registering Participant...' : 'Register Consenting Participant'}</span>
            </button>
          </form>
        </div>

        {/* Existing Cohort List Column (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#F0E4E7] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0E4E7] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[#292329] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#827780]" />
                Registered Participants ({participants.length})
              </h2>
              <p className="text-xs text-[#827780]">Cohort members ready for agent simulation</p>
            </div>
            <button
              onClick={fetchParticipants}
              className="p-1 rounded-lg hover:bg-[#FFF1F4] text-[#827780] cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingList ? (
            <div className="py-8 text-center text-[#827780] text-xs">Loading participants...</div>
          ) : participants.length === 0 ? (
            <div className="py-8 text-center text-[#827780] text-xs">
              No participants added yet. Register your first participant or load the demo cohort on the Dashboard.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {participants.map((p) => (
                <div
                  key={p._id}
                  className="p-3.5 rounded-xl bg-[#FFFCFC] border border-[#F0E4E7] hover:border-[#E8A4B4] transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#292329]">{p.name}</span>
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
                  </div>

                  <div className="space-y-1 text-[#827780] text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <LinkedinIcon className="w-3 h-3 text-[#827780] shrink-0" />
                      <span className="truncate">{p.linkedinUrl}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <InstagramIcon className="w-3 h-3 text-[#827780] shrink-0" />
                      <span className="truncate">{p.instagramUrl}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#F0E4E7] text-[10px] text-[#827780]">
                    <span>Cohort: {p.cohortId}</span>
                    <span className="text-[#54866A] font-medium">Consent Confirmed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddParticipants;
