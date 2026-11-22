import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import DotLoader from './DotLoader';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfInlineViewerProps {
  fileUrl: string;
  fileName?: string | null;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid PDF data URL');
  }
  const meta = dataUrl.slice(0, commaIndex);
  const rawBody = dataUrl.slice(commaIndex + 1);
  if (meta.includes(';base64')) {
    const binaryStr = window.atob(rawBody.replace(/\s/g, ''));
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  const decoded = decodeURIComponent(rawBody);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

export default function PdfInlineViewer({ fileUrl, fileName }: PdfInlineViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesHostRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [renderedCount, setRenderedCount] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [loadingDoc, setLoadingDoc] = useState<boolean>(true);
  const [renderingPages, setRenderingPages] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(720);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Track responsive container width cleanly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.max(260, Math.floor(el.clientWidth - 24));
      setContainerWidth((prev) => (Math.abs(prev - next) > 8 ? next : prev));
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateWidth());
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load PDF document from data URL or remote URL
  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const loadPdf = async () => {
      setLoadingDoc(true);
      setErrorMsg(null);
      setNumPages(0);
      setRenderedCount(0);

      if (pdfDocRef.current) {
        try {
          await pdfDocRef.current.cleanup();
        } catch {
          // ignore
        }
        pdfDocRef.current = null;
      }

      try {
        let sourceData: Uint8Array;
        if (fileUrl.startsWith('data:')) {
          sourceData = dataUrlToUint8Array(fileUrl);
        } else {
          const resp = await fetch(fileUrl);
          if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
          }
          const buf = await resp.arrayBuffer();
          sourceData = new Uint8Array(buf);
        }

        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument({ data: sourceData });
        const doc = await loadingTask.promise;
        if (cancelled) {
          await doc.cleanup();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
      } catch (err) {
        console.error('PDF inline load error:', err);
        if (!cancelled) {
          setErrorMsg('Unable to render this PDF directly on this browser.');
        }
      } finally {
        if (!cancelled) {
          setLoadingDoc(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.cleanup().catch(() => {});
        pdfDocRef.current = null;
      }
    };
  }, [fileUrl]);

  // Render all pages into high-DPI canvases inside the page without downloading
  useEffect(() => {
    const doc = pdfDocRef.current;
    const host = pagesHostRef.current;
    if (!doc || !host || numPages === 0) return;

    let cancelled = false;
    const activeTasks: Array<{ cancel: () => void }> = [];

    const renderAllPages = async () => {
      setRenderingPages(true);
      setRenderedCount(0);
      host.innerHTML = '';

      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const targetWidth = Math.max(260, containerWidth);

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        if (cancelled) break;

        try {
          const page = await doc.getPage(pageNum);
          if (cancelled) break;

          const baseViewport = page.getViewport({ scale: 1 });
          const fitScale = (targetWidth / baseViewport.width) * zoom;
          const displayViewport = page.getViewport({ scale: fitScale });
          const renderViewport = page.getViewport({ scale: fitScale * dpr });

          const pageCard = document.createElement('div');
          pageCard.className =
            'bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden mx-auto transition-all';
          pageCard.style.width = `${Math.floor(displayViewport.width)}px`;
          pageCard.style.maxWidth = '100%';

          const pageHeader = document.createElement('div');
          pageHeader.className =
            'px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider';
          pageHeader.textContent = `Page ${pageNum} of ${doc.numPages}`;
          pageCard.appendChild(pageHeader);

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(renderViewport.width);
          canvas.height = Math.floor(renderViewport.height);
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          pageCard.appendChild(canvas);

          host.appendChild(pageCard);

          const ctx = canvas.getContext('2d');
          if (ctx) {
            const task = page.render({
              canvasContext: ctx,
              viewport: renderViewport,
              canvas
            });
            activeTasks.push(task);
            await task.promise;
          }

          if (!cancelled) {
            setRenderedCount((prev) => prev + 1);
          }
        } catch (renderErr: any) {
          if (renderErr?.name !== 'RenderingCancelledException') {
            console.warn(`Error rendering PDF page ${pageNum}:`, renderErr);
          }
        }
      }

      if (!cancelled) {
        setRenderingPages(false);
      }
    };

    renderAllPages();

    return () => {
      cancelled = true;
      activeTasks.forEach((t) => {
        try {
          t.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [numPages, containerWidth, zoom]);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-slate-200 bg-slate-100/80 overflow-hidden shadow-inner"
    >
      {/* Clean Reader Control Bar */}
      <div className="px-3.5 sm:px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
              <span>{fileName || 'Attached Notice PDF'}</span>
            </p>
            <p className="text-[10px] font-semibold text-emerald-700">
              {loadingDoc
                ? 'Preparing document reader...'
                : numPages > 0
                ? `${numPages} ${numPages === 1 ? 'Page' : 'Pages'} • Reading directly on page`
                : 'Inline PDF Reader'}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        {numPages > 0 && !errorMsg && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
              disabled={zoom <= 0.75}
              title="Zoom out"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono font-bold text-slate-700 min-w-[46px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2, +(z + 0.15).toFixed(2)))}
              disabled={zoom >= 2}
              title="Zoom in"
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoom !== 1 && (
              <button
                type="button"
                onClick={() => setZoom(1)}
                title="Reset zoom"
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Document Reading Surface */}
      <div className="p-3 sm:p-4 max-h-[75vh] overflow-y-auto overflow-x-auto space-y-4">
        {loadingDoc && (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <DotLoader size="md" color="emerald" className="mb-3" />
            <p className="text-xs font-bold text-slate-700">Loading PDF for inline reading...</p>
            <p className="text-[11px] text-slate-500 mt-0.5">No download required</p>
          </div>
        )}

        {errorMsg && (
          <div className="p-6 rounded-xl bg-white border border-rose-200 text-center space-y-2.5">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">{errorMsg}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open PDF in Browser Tab</span>
            </a>
          </div>
        )}

        {!loadingDoc && !errorMsg && (
          <>
            {renderingPages && renderedCount === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <DotLoader size="md" color="emerald" className="mb-2.5" />
                <p className="text-xs font-semibold text-slate-600">Rendering PDF pages...</p>
              </div>
            )}
            <div ref={pagesHostRef} className="space-y-4" />
          </>
        )}
      </div>
    </div>
  );
}
