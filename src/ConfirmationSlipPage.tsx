import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  User, 
  Loader2,
  Check
} from 'lucide-react';
import { PublicMemberStatus } from './types';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { searchMemberStatus } from './services/firebase';

interface ConfirmationSlipPageProps {
  member?: PublicMemberStatus | null;
  onBack: () => void;
}

export default function ConfirmationSlipPage({
  member: initialMember,
  onBack
}: ConfirmationSlipPageProps) {
  const [member, setMember] = useState<PublicMemberStatus | null>(initialMember || null);
  const [loadingMember, setLoadingMember] = useState(!initialMember);
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const collegeLogo = '/assets/college-logo.png';
  const clubLogo = '/assets/club-logo.png';

  // Load member from sessionStorage or URL query if not passed via props
  useEffect(() => {
    if (initialMember) {
      setMember(initialMember);
      setLoadingMember(false);
      return;
    }

    try {
      const stored = sessionStorage.getItem('ngdcsc_current_slip_member');
      if (stored) {
        setMember(JSON.parse(stored));
        setLoadingMember(false);
        return;
      }
    } catch {}

    // Check hash/search query parameter e.g. #slip?id=NGDCSC-001
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      const urlParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : search);
      const queryId = urlParams.get('id') || urlParams.get('mid') || urlParams.get('phone');
      if (queryId) {
        setLoadingMember(true);
        searchMemberStatus(queryId).then((res) => {
          if (res) setMember(res);
          setLoadingMember(false);
        }).catch(() => setLoadingMember(false));
        return;
      }
    }

    setLoadingMember(false);
  }, [initialMember]);

  const memberId = member?.membershipId || 'NGDCSC-PENDING';
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const handleDownloadPdf = async () => {
    if (!slipRef.current || downloading || !member) return;
    try {
      setDownloading(true);
      setDownloadSuccess(false);
      setDownloadError(null);

      const element = slipRef.current;

      // Fast, ultra-crisp 2x pixelRatio rendering (completes in under 400ms)
      const imgData = await toPng(element, {
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

      const safeName = (member.name || 'Member').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeId = memberId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `NGDCSC_Slip_${safeId}_${safeName}.pdf`;

      pdf.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error generating PDF slip:', err);
      setDownloadError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loadingMember) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
        <p className="text-sm font-semibold">Loading Confirmation Slip...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800 space-y-4">
        <p className="text-sm font-medium text-slate-600">No member data found for confirmation slip.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Status Search</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col print:bg-white">
      
      {/* Top Fixed Control Bar (Hidden on print) */}
      <header className="print:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h1 className="text-sm font-bold text-slate-900">
              Official Membership Confirmation Slip
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Download Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Downloading PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Success Notification Bar */}
      {downloadSuccess && (
        <div className="print:hidden bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 text-center font-medium flex items-center justify-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>PDF Confirmation Slip downloaded successfully! Check your downloads.</span>
        </div>
      )}

      {/* Error notification */}
      {downloadError && (
        <div className="print:hidden bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 text-center font-medium flex items-center justify-center gap-2 animate-in fade-in">
          <span>{downloadError}</span>
        </div>
      )}

      {/* Center White A4 Document Viewport */}
      <main className="flex-1 overflow-x-auto py-6 sm:py-10 px-2 sm:px-6 flex justify-center items-start print:p-0 print:m-0">
        <div className="min-w-[680px] sm:min-w-[794px] flex justify-center">
          
          {/* THE FORMAL A4 WHITE SLIP */}
          <div
            id="confirmation-slip-print"
            ref={slipRef}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 rounded-none shadow-xl relative box-border p-10 sm:p-12 flex flex-col justify-between print:shadow-none print:p-8 print:w-full print:max-w-none"
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
              
              {/* ================= 1. CLEAN FORMAL HEADER ================= */}
              <div>
                <div className="grid grid-cols-[85px_1fr_85px] sm:grid-cols-[95px_1fr_95px] items-center gap-3">
                  
                  {/* Top-Left: College Logo */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
                      <img
                        src={collegeLogo}
                        alt="New Govt. Degree College Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/en/3/30/Rajshahi-new-govt-degree-college-logo.png';
                        }}
                      />
                    </div>
                  </div>

                  {/* Top-Center: Just Club Name and College Name (No Kazihata, No Session) */}
                  <div className="text-center space-y-1.5 px-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase leading-tight font-serif">
                      NGDC Science Club
                    </h1>
                    <p className="text-sm sm:text-base font-bold text-emerald-800 tracking-wide uppercase">
                      New Govt. Degree College, Rajshahi
                    </p>
                  </div>

                  {/* Top-Right: Club Logo */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
                      <img
                        src={clubLogo}
                        alt="NGDC Science Club Logo"
                        className="max-h-full max-w-full object-contain"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = 'https://plain-apac-prod-public.komododecks.com/202609/21/iFpbvbXJaON4rnVidFRy/image.png';
                        }}
                      />
                    </div>
                  </div>

                </div>

                {/* Clean Document Banner */}
                <div className="mt-6 py-2.5 border-t border-b border-slate-300 text-center bg-slate-50">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-wider">
                    Membership Confirmation Slip
                  </h2>
                </div>

                {/* Metadata Strip */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 px-1">
                  <div>
                    <span>Date: </span>
                    <strong className="text-slate-900">{issueDate}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: Approved</span>
                  </div>
                </div>
              </div>

              {/* ================= 2. MEMBER PARTICULARS WITH PHOTO ON TOP ================= */}
              <div className="pt-2">
                <div className="border border-slate-200 rounded-xl p-6 sm:p-7 bg-white shadow-2xs space-y-6">
                  
                  {/* Top Row: Photo + Core Identity Banner */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
                    
                    {/* Passport Photo */}
                    <div className="w-32 h-40 rounded-lg border-2 border-slate-300 p-1 bg-white shrink-0 overflow-hidden shadow-2xs flex items-center justify-center">
                      {member.photo ? (
                        <img
                          src={member.photo}
                          alt={member.name}
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

                    {/* Member Primary Info */}
                    <div className="flex-1 text-center sm:text-left space-y-2.5 pt-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Member Name
                        </span>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight">
                          {member.name}
                        </h3>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono text-sm font-black">
                        <span>Membership ID:</span>
                        <span className="tracking-wider text-emerald-800">{memberId}</span>
                      </div>

                      <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        {member.studentId && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Roll: <strong className="font-mono">{member.studentId}</strong>
                          </span>
                        )}
                        {member.batch && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            {member.batch}
                          </span>
                        )}
                        {member.section && (
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold">
                            Section {member.section}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Clean 2-Column Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Student Roll / College ID
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {member.studentId || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Batch &amp; Section
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {member.batch || 'HSC 27'} {member.section ? `• Section ${member.section}` : ''}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Mobile Phone
                      </span>
                      <p className="font-bold text-slate-900 text-sm font-mono">
                        {member.phone || 'N/A'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                      <span className="text-[11px] font-medium text-slate-500 block">
                        Email Address
                      </span>
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {member.email || 'N/A'}
                      </p>
                    </div>

                  </div>

                </div>
              </div>

              {/* ================= 3. SHORT SIMPLE DECLARATION ================= */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
                  This is to certify that <strong>{member.name}</strong> is an officially registered and approved member of the <strong>New Govt. Degree College Science Club (NGDCSC)</strong>, Rajshahi.
                </p>
              </div>

              {/* ================= 4. CLEAN FOOTER ================= */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>New Govt. Degree College Science Club (NGDCSC)</span>
                <span>Rajshahi, Bangladesh</span>
              </div>

            </div>
          </div>
        </div>
      </main>

    </div>
  );
}
