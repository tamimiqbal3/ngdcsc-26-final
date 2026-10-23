import React, { useState, useRef } from 'react';
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
  CreditCard, 
  Download, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { PublicMemberStatus } from './types';
import { searchMemberStatus } from './services/firebase';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface MemberStatusSearchProps {
  onBackToHome: () => void;
  onGoToRegistration: () => void;
  onOpenSlipPage?: (member?: PublicMemberStatus) => void;
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
  const [downloadingSlip, setDownloadingSlip] = useState(false);
  const [downloadSlipSuccess, setDownloadSlipSuccess] = useState(false);
  const hiddenSlipRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanDigits = searchInput.replace(/\D/g, '');
    let normPhone = cleanDigits;
    if (normPhone.startsWith('880')) {
      normPhone = normPhone.slice(2);
    }

    // Strictly enforce valid 11-digit Bangladeshi mobile number starting with 01
    if (!normPhone.startsWith('01') || normPhone.length !== 11) {
      setErrorMsg('Please enter a valid 11-digit mobile number (e.g. 01XXXXXXXXX)');
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    setSearched(true);
    try {
      const result = await searchMemberStatus(normPhone);
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

  // Direct 1-click A4 PDF download without opening new tabs or modals
  const handleDirectDownloadSlip = async () => {
    if (!memberResult || downloadingSlip) return;
    try {
      setDownloadingSlip(true);
      setDownloadSlipSuccess(false);

      if (!hiddenSlipRef.current) {
        throw new Error('Slip template not ready');
      }

      // Fast, ultra-crisp 2x pixelRatio rendering (<300ms)
      const imgData = await toPng(hiddenSlipRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: ''
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfPageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfPageHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const imgRatio = imgProps.width / imgProps.height;
      const pageRatio = pdfPageWidth / pdfPageHeight;

      let renderWidth = pdfPageWidth;
      let renderHeight = pdfPageHeight;
      let xOffset = 0;
      let yOffset = 0;

      if (imgRatio > pageRatio) {
        renderHeight = pdfPageWidth / imgRatio;
        yOffset = (pdfPageHeight - renderHeight) / 2;
      } else {
        renderWidth = pdfPageHeight * imgRatio;
        xOffset = (pdfPageWidth - renderWidth) / 2;
      }

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

      const safeName = (memberResult.name || 'Member').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeId = (memberResult.membershipId || 'NGDCSC').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `NGDCSC_Slip_${safeId}_${safeName}.pdf`;

      // Direct file download - no tab, no preview
      pdf.save(filename);

      setDownloadSlipSuccess(true);
      setTimeout(() => setDownloadSlipSuccess(false), 3500);
    } catch (err) {
      console.error('Error generating PDF slip:', err);
    } finally {
      setDownloadingSlip(false);
    }
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

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Member Verification</span>
        </div>
      </div>

      {/* Main Glass Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 mb-3 shadow-inner">
            <Phone className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Check Membership Status
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your registered mobile number to check your application status.
          </p>
        </div>

        {/* Search Input Box */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={14}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. 01712345678"
              className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-mono"
            />
          </div>

          {errorMsg && errorMsg !== 'PERMISSION_DENIED' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {errorMsg === 'PERMISSION_DENIED' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Database Search Unavailable</span>
              </div>
              <p className="text-[11px] text-amber-700">
                The database is currently undergoing scheduled maintenance. Please try again shortly or contact the club administration.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Status</span>
                </>
              )}
            </button>

            {searched && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Reset Search"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Search Results Display */}
        {searched && !loading && (
          <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in duration-200">
            {memberResult ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                
                {/* Member Identity Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-18 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center">
                    {memberResult.photo ? (
                      <img 
                        src={memberResult.photo} 
                        alt={memberResult.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-slate-900 truncate">
                      {memberResult.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                      {memberResult.batch && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                          {memberResult.batch}
                        </span>
                      )}
                      {memberResult.section && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                          Section {memberResult.section}
                        </span>
                      )}
                      {memberResult.studentId && (
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono">
                          Roll: {memberResult.studentId}
                        </span>
                      )}
                    </div>

                    {memberResult.membershipId && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">ID:</span>
                        <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {memberResult.membershipId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyId(memberResult.membershipId!)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          title="Copy Membership ID"
                        >
                          {copiedId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Status Badge & Direct PDF Download Action */}
                <div className="w-full pt-1">
                  {memberResult.status === 'approved' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-black text-emerald-800">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Status: Officially Approved</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Congratulations! Your club membership application has been approved.
                      </p>

                      {/* DIRECT DOWNLOAD CONFIRMATION SLIP BUTTON */}
                      <div className="pt-2 pb-1 flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleDirectDownloadSlip}
                          disabled={downloadingSlip}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-60 group"
                        >
                          {downloadingSlip ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-100" />
                              <span>Downloading PDF...</span>
                            </>
                          ) : downloadSlipSuccess ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-200" />
                              <span>Downloaded Confirmation Slip!</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                              <span>Download Confirmation Slip (A4 PDF)</span>
                            </>
                          )}
                        </button>
                        <span className="text-[10.5px] text-slate-500 font-medium">
                          Directly downloads official white A4 PDF document
                        </span>
                      </div>

                      {/* WhatsApp Community Link */}
                      <div className="pt-1">
                        <a
                          href="https://chat.whatsapp.com/J0ooCmabbIT2dfJdXTLhni"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12.031 0C5.394 0 0 5.394 0 12.031c0 2.119.553 4.185 1.603 6.007L.062 24l6.148-1.613c1.764.962 3.766 1.47 5.821 1.47 6.637 0 12.031-5.394 12.031-12.031C24.062 5.394 18.668 0 12.031 0zm0 21.848c-1.802 0-3.567-.484-5.105-1.398l-.366-.217-3.792.995 1.012-3.696-.239-.379c-1.006-1.601-1.537-3.468-1.537-5.385 0-5.515 4.485-10 10-10 5.515 0 10 4.485 10 10 0 5.515-4.485 10-10 10zm5.474-7.481c-.3-.15-1.776-.876-2.051-.976-.275-.1-.475-.15-.675.15-.2.3-.776.976-.951 1.176-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.489-.892-.796-1.495-1.779-1.67-2.079-.175-.3-.019-.462.131-.611.136-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.626-.925-2.226-.244-.585-.492-.505-.675-.515-.175-.009-.375-.009-.575-.009s-.525.075-.8.375c-.275.3-1.05 1.026-1.05 2.501s1.075 2.899 1.225 3.099c.15.2 2.115 3.23 5.124 4.53.716.31 1.275.495 1.71.633.719.229 1.373.197 1.89.12.577-.086 1.776-.726 2.026-1.426.25-.7.25-1.301.175-1.426-.075-.125-.275-.2-.575-.35z"/>
                          </svg>
                          <span>Join WhatsApp Community</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {memberResult.status === 'pending' && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-black text-amber-700">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <span>Status: Pending Review</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Your application is currently under review by the Executive Committee. Your official Membership ID will be activated upon approval.
                      </p>
                    </div>
                  )}

                  {memberResult.status === 'rejected' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-sm font-black text-rose-700">
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>Status: Application Declined</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Your application could not be approved at this time.
                      </p>
                      {memberResult.rejectionReason && (
                        <p className="text-xs font-semibold text-rose-800 bg-rose-100/60 p-2 rounded-xl border border-rose-200 mt-2">
                          Reason: {memberResult.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  No Application Found
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  We could not find any membership application registered with "{searchInput}". Please verify your mobile number or register as a new member.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onGoToRegistration}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    New Registration
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden Offscreen Pristine A4 Slip Template for Direct PDF Download */}
      {memberResult && memberResult.status === 'approved' && (
        <div 
          style={{ 
            position: 'absolute', 
            left: '-99999px', 
            top: 0, 
            opacity: 0, 
            pointerEvents: 'none' 
          }} 
          aria-hidden="true"
        >
          <div
            ref={hiddenSlipRef}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-none relative box-border p-12 flex flex-col justify-between"
            style={{
              width: '794px',
              minHeight: '1123px',
              backgroundColor: '#ffffff',
              color: '#0f172a'
            }}
          >
            {/* Clean Institutional Border */}
            <div className="absolute inset-5 border border-slate-300 pointer-events-none" />

            {/* Inner Content */}
            <div className="relative z-10 flex-1 flex flex-col justify-between space-y-6">
              
              {/* Header */}
              <div>
                <div className="grid grid-cols-[95px_1fr_95px] items-center gap-3">
                  {/* Top-Left: College Logo */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img
                        src="/assets/college-logo.png"
                        alt="New Govt. Degree College Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>

                  {/* Top-Center: Club Name and College Name */}
                  <div className="text-center space-y-1.5 px-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight font-serif">
                      NGDC Science Club
                    </h1>
                    <p className="text-base font-bold text-emerald-800 tracking-wide uppercase">
                      New Govt. Degree College, Rajshahi
                    </p>
                  </div>

                  {/* Top-Right: Club Logo */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 flex items-center justify-center">
                      <img
                        src="/assets/club-logo.png"
                        alt="NGDC Science Club Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                      />
                    </div>
                  </div>
                </div>

                {/* Document Banner */}
                <div className="mt-6 py-2.5 border-t border-b border-slate-300 text-center bg-slate-50">
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    Membership Confirmation Slip
                  </h2>
                </div>

                {/* Metadata Strip */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 px-1">
                  <div>
                    <span>Date: </span>
                    <strong className="text-slate-900">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: Approved</span>
                  </div>
                </div>
              </div>

              {/* Member Particulars */}
              <div className="pt-2">
                <div className="border border-slate-200 rounded-xl p-7 bg-white shadow-2xs space-y-6">
                  {/* Top Row: Photo + Primary Info */}
                  <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
                    <div className="w-32 h-40 rounded-lg border-2 border-slate-300 p-1 bg-white shrink-0 overflow-hidden shadow-2xs flex items-center justify-center">
                      {memberResult.photo ? (
                        <img
                          src={memberResult.photo}
                          alt={memberResult.name}
                          className="w-full h-full object-cover rounded-xs"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                          <User className="w-12 h-12 mb-1" />
                          <span className="text-[11px] font-medium">Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2.5 pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Member Name
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                          {memberResult.name}
                        </h3>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-sm font-black">
                        <span>Membership ID:</span>
                        <span className="tracking-wider text-emerald-800">{memberResult.membershipId || 'NGDCSC-APPROVED'}</span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        {memberResult.studentId && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Roll: <strong className="font-mono">{memberResult.studentId}</strong>
                          </span>
                        )}
                        {memberResult.batch && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            {memberResult.batch}
                          </span>
                        )}
                        {memberResult.section && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Section {memberResult.section}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Student Roll / College ID
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {memberResult.studentId || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Batch & Section
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {memberResult.batch || 'HSC 27'} {memberResult.section ? `• Section ${memberResult.section}` : ''}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Mobile Phone
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {memberResult.phone || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Email Address
                      </span>
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {memberResult.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Declaration Statement */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <p className="text-sm leading-relaxed text-slate-700">
                  This is to certify that <strong>{memberResult.name}</strong> is an officially registered and approved member of the <strong>New Govt. Degree College Science Club (NGDCSC)</strong>, Rajshahi.
                </p>
              </div>

              {/* Clean Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>New Govt. Degree College Science Club (NGDCSC)</span>
                <span>Rajshahi, Bangladesh</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
