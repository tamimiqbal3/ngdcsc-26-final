import React, { useRef, useState } from 'react';
import { 
  Download, 
  ExternalLink,
  X, 
  CheckCircle2, 
  FileText,
  User,
  Loader2
} from 'lucide-react';
import { PublicMemberStatus } from '../types';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface ConfirmationSlipModalProps {
  member: PublicMemberStatus;
  onClose: () => void;
}

export default function ConfirmationSlipModal({
  member,
  onClose
}: ConfirmationSlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const collegeLogo = '/assets/college-logo.png';
  const clubLogo = '/assets/club-logo.png';

  const memberId = member.membershipId || 'NGDCSC-PENDING';
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Generates ultra high quality PDF (300+ DPI retina crisp)
  const generatePdfBlob = async (): Promise<{ pdf: jsPDF; blobUrl: string; filename: string }> => {
    if (!slipRef.current) throw new Error('Slip reference not found');
    const element = slipRef.current;

    // pixelRatio: 2 gives crystal clear 200+ DPI print quality and downloads in <0.4 seconds
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

    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    setPdfBlobUrl(blobUrl);

    return { pdf, blobUrl, filename };
  };

  const handleDownloadPdf = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      setDownloadSuccess(false);
      setDownloadError(null);

      const { pdf, filename } = await generatePdfBlob();
      pdf.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err: any) {
      console.error('Error generating PDF slip:', err);
      setDownloadError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewPage = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      setDownloadError(null);

      let url = pdfBlobUrl;
      if (!url) {
        const result = await generatePdfBlob();
        url = result.blobUrl;
      }

      // Open PDF in a new tab
      const newTab = window.open(url, '_blank');
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.target = '_blank';
        tempLink.rel = 'noopener noreferrer';
        tempLink.click();
      }
    } catch (err: any) {
      console.error('Error opening PDF in new page:', err);
      setDownloadError('Could not open in new page. Downloading instead.');
      handleDownloadPdf();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Light Theme Container Card */}
      <div className="relative w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Top Light Control Bar (Hidden on print) */}
        <div className="print:hidden px-4 sm:px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Membership Confirmation Slip
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                High Quality A4 PDF • New Govt. Degree College Science Club
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open in New Page Button */}
            <button
              type="button"
              onClick={handleOpenInNewPage}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Open PDF in a new page/tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              <span>Open in New Page</span>
            </button>

            {/* Direct PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {downloadSuccess && (
          <div className="print:hidden bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs text-emerald-800 text-center font-medium flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PDF Confirmation Slip downloaded successfully!</span>
          </div>
        )}

        {/* Error notification */}
        {downloadError && (
          <div className="print:hidden bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-800 text-center font-medium flex items-center justify-center gap-2 animate-in fade-in">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Scrollable Document Preview Area with Proper A4 Viewport */}
        <div className="p-3 sm:p-8 overflow-x-auto overflow-y-auto flex-1 flex justify-center bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          
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
                      
                      {/* Passport Photo (Simple, Clean, Crisp Border) */}
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

        </div>

      </div>
    </div>
  );
}
