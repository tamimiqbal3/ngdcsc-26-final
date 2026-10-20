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
    const isMidSearch = query.toUpperCase().startsWith('NGDCSC') || (/^\d{1,4}$/.test(query) && query.length < 10);
    if (!isMidSearch && (!cleanDigits || cleanDigits.length < 10)) {
      setErrorMsg('Please enter a valid phone number (01XXXXXXXXX) or Membership ID (e.g. NGDCSC-001)');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await searchMemberStatus(query);
      setMemberResult(result);
    } catch (err: any) {
      console.error('Error searching member status:', err);
      if (err?.message === 'PERMISSION_DENIED' || err?.code === 'permission-denied') {
        setErrorMsg('PERMISSION_DENIED');
      } else {
        setErrorMsg('Failed to search member status. Please try again.');
      }
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
    <div className="w-full max-w-xl relative z-10 px-4 sm:px-6 pt-24 sm:pt-28 pb-12 formal-page-enter">
      {/* Navigation Top Bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-medium border border-slate-200/90 shadow-xs transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Home</span>
        </button>

        <button
          type="button"
          onClick={onGoToRegistration}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-xs transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-700" />
          <span>New Registration</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white/85 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-6 text-slate-900">
        {/* Title and Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black uppercase tracking-wider shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Membership Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Check Member Status
          </h1>
          <p className="text-xs text-slate-500">
            Enter your registered Phone Number
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Phone Number
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-emerald-600 pointer-events-none flex items-center">
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
              className="w-full pl-10 pr-24 py-3 bg-slate-50/80 border border-slate-200/90 focus:border-emerald-500 focus:bg-white rounded-2xl text-slate-900 placeholder-slate-400 text-sm font-semibold tracking-wider focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="absolute right-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          {errorMsg && (
            errorMsg === 'PERMISSION_DENIED' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 text-left animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Firebase Database Permission Notice (Firestore Rules)</span>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed">
                  Public member search read permission is not enabled on project <strong>(ngdcsc-a8228)</strong>. 
                  To enable public member searches, publish the following rule in the Firebase Console:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-emerald-400 border border-slate-800 select-all overflow-x-auto">
                  match /members/{'{'}memberId{'}'} {'{'} allow read, create: if true; allow update, delete: if request.auth != null; {'}'}
                </div>
                <div className="pt-1">
                  <a
                    href="https://console.firebase.google.com/project/ngdcsc-a8228/firestore/rules"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-xs"
                  >
                    <span>Open Firebase Console Rules</span> &rarr;
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </p>
            )
          )}
        </form>

        {/* Loading Spinner */}
        {loading && (
          <div className="pt-6 pb-4 flex flex-col items-center justify-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-600 font-medium">Searching member record...</span>
          </div>
        )}

        {/* Result Area */}
        {searched && !loading && (
          <div className="pt-2 border-t border-slate-200/80 animate-in fade-in zoom-in-95 duration-200">
            {memberResult ? (
              <div className="space-y-4">
                {/* Result Card: Member Photo + Name + Membership ID + Status */}
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 shadow-sm flex flex-col items-center text-center space-y-4">
                  
                  {/* Member Photo */}
                  <div className="relative">
                    <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-white border-2 border-slate-200 overflow-hidden shadow-md flex items-center justify-center">
                      {memberResult.photo ? (
                        <img 
                          src={memberResult.photo} 
                          alt={memberResult.name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                          <User className="w-10 h-10" />
                          <span className="text-[10px]">No Photo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Member ID Badge - Only shown when approved */}
                  {memberResult.status === 'approved' && memberResult.membershipId ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold shadow-xs">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ID: <strong className="text-slate-900 tracking-widest">{memberResult.membershipId}</strong></span>
                      <button
                        type="button"
                        onClick={() => handleCopyId(memberResult.membershipId!)}
                        title="Copy Membership ID"
                        className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer ml-1"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : memberResult.status === 'pending' ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium text-xs shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Membership ID: <strong className="text-amber-800">Will be assigned upon approval</strong></span>
                    </div>
                  ) : null}

                  {/* Member Name & Academic info */}
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {memberResult.name}
                    </h2>
                    {(memberResult.batch || memberResult.section) && (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        {memberResult.batch && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
                            {memberResult.batch}
                          </span>
                        )}
                        {memberResult.section && (
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-xs">
                            Section {memberResult.section}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Member Status Badge & Description */}
                  <div className="w-full pt-2">
                    {memberResult.status === 'approved' && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-800">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Status: Approved</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Congratulations! Your club membership application has been approved.
                        </p>
                        <div className="pt-2">
                          <a
                            href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
                            </svg>
                            <span>Join WhatsApp Group</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {memberResult.status === 'pending' && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-amber-700">
                          <Clock className="w-5 h-5 text-amber-600" />
                          <span>Status: Pending Review</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Your application is currently under review by the Executive Committee. Your official Membership ID will be activated upon approval.
                        </p>
                        <div className="pt-2">
                          <a
                            href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                              <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
                            </svg>
                            <span>Join WhatsApp Group</span>
                          </a>
                        </div>
                      </div>
                    )}

                    {memberResult.status === 'rejected' && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                        <div className="flex items-center justify-center gap-2 text-sm font-black text-rose-700">
                          <XCircle className="w-5 h-5 text-rose-600" />
                          <span>Status: Rejected</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
                          Your application was not approved. Please contact the club or submit a new registration.
                        </p>
                        {memberResult.rejectionReason && (
                          <div className="mt-2.5 p-3 rounded-xl bg-white border border-rose-200 text-left shadow-xs">
                            <span className="font-bold text-rose-800 text-[11px] uppercase tracking-wider block mb-1">
                              Reason for Rejection:
                            </span>
                            <p className="text-xs text-rose-900 leading-relaxed font-sans whitespace-pre-wrap">
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-bold border border-slate-200/90 shadow-xs transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Search Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Not Found Card */
              <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No Membership Record Found
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  No registration was found for phone number (<strong className="text-slate-900">{searchInput}</strong>). Please verify your 11-digit registered phone number and try again, or submit a new membership registration.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={onGoToRegistration}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
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
