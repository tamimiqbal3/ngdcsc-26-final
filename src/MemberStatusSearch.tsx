import React, { useState } from 'react';
import { 
  Search, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  RotateCcw,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  CreditCard
} from 'lucide-react';
import { PublicMemberStatus } from './types';
import { searchMemberStatus } from './services/firebase';

interface MemberStatusSearchProps {
  onBackToHome: () => void;
  onGoToRegistration: () => void;
}

export default function MemberStatusSearch({
  onBackToHome,
  onGoToRegistration
}: MemberStatusSearchProps) {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [memberResult, setMemberResult] = useState<PublicMemberStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    const cleanDigits = query.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMsg('Please enter a valid phone number (01XXXXXXXXX)');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await searchMemberStatus(query);
      setMemberResult(result);
    } catch (err) {
      console.error('Error searching member status:', err);
      setErrorMsg('Failed to search member status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setSearched(false);
    setMemberResult(null);
    setErrorMsg(null);
    setCopiedId(false);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="w-full max-w-xl relative z-10 px-4 sm:px-6 pt-5 pb-8 formal-page-enter">
      {/* Navigation Top Bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-white/15 shadow-xs transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={onGoToRegistration}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>New Registration</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-slate-950/70 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Title and Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Membership Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Check Member Status
          </h1>
          <p className="text-xs text-slate-400">
            Enter your registered Phone Number
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Phone Number
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-emerald-400 pointer-events-none flex items-center">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              inputMode="tel"
              value={searchInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9+]/g, '');
                setSearchInput(val);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="01XXXXXXXXX"
              maxLength={14}
              className="w-full pl-10 pr-24 py-3 bg-slate-900/90 border border-white/20 focus:border-emerald-400 rounded-2xl text-white placeholder-slate-500 text-sm font-semibold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="absolute right-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </form>

        {/* Result Area */}
        {searched && !loading && (
          <div className="pt-2 border-t border-white/10 animate-in fade-in zoom-in-95 duration-200">
            {memberResult ? (
              <div className="space-y-4">
                {/* Result Card: Member Photo + Name + Membership ID + Status */}
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/15 shadow-md flex flex-col items-center text-center space-y-4">
                  
                  {/* Member Photo */}
                  <div className="relative">
                    <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-slate-800 border-2 border-white/20 overflow-hidden shadow-lg flex items-center justify-center">
                      {memberResult.photo ? (
                        <img 
                          src={memberResult.photo} 
                          alt={memberResult.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500 gap-1">
                          <User className="w-10 h-10" />
                          <span className="text-[10px]">No Photo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Member ID Badge */}
                  {memberResult.membershipId && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-mono text-xs font-bold shadow-xs">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ID: <strong className="text-white tracking-widest">{memberResult.membershipId}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(memberResult.membershipId!)}
                        title="Copy Membership ID"
                        className="p-1 rounded-md hover:bg-emerald-500/25 text-emerald-400 hover:text-white transition-colors cursor-pointer ml-1"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Member Name & Academic info */}
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white">
                      {memberResult.name}
                    </h2>
                    {(memberResult.batch || memberResult.section) && (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        {memberResult.batch && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/15 text-[11px] font-bold text-slate-300">
                            {memberResult.batch}
                          </span>
                        )}
                        {memberResult.section && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/15 text-[11px] font-bold text-slate-300">
                            Section {memberResult.section}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Member Status Badge & Description */}
                  <div className="w-full pt-2">
                    {memberResult.status === 'approved' && (
                      <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-400">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Status: Approved</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          Congratulations! Your club membership has been approved.
                        </p>
                      </div>
                    )}

                    {memberResult.status === 'pending' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-amber-400">
                          <Clock className="w-5 h-5 text-amber-400" />
                          <span>Status: Pending</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          Your application is currently under review by club administration.
                        </p>
                      </div>
                    )}

                    {memberResult.status === 'rejected' && (
                      <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-rose-400">
                          <XCircle className="w-5 h-5 text-rose-400" />
                          <span>Status: Rejected</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium">
                          Your application was not approved. Please contact the club or submit a new registration.
                        </p>
                        {memberResult.rejectionReason && (
                          <div className="mt-2.5 p-3 rounded-xl bg-rose-950/70 border border-rose-500/30 text-left">
                            <span className="font-bold text-rose-300 text-[11px] uppercase tracking-wider block mb-1">
                              Reason for Rejection:
                            </span>
                            <p className="text-xs text-rose-100 leading-relaxed font-sans whitespace-pre-wrap">
                              {memberResult.rejectionReason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Reset or check another button */}
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Search Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Not Found Card */
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/15 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  No Membership Record Found
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  No registration was found for phone number (<strong className="text-slate-200">{searchInput}</strong>). Please verify your 11-digit registered phone number and try again, or submit a new membership registration.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onGoToRegistration}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors cursor-pointer"
                  >
                    New Registration
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
