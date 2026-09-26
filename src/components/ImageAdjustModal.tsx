import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Check, 
  X, 
  Move, 
  Scissors, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Maximize2,
  RefreshCw,
  Sliders
} from 'lucide-react';

interface ImageAdjustModalProps {
  imageSrc: string;
  onApply: (adjustedDataUrl: string) => void;
  onClose: () => void;
}

export default function ImageAdjustModal({
  imageSrc,
  onApply,
  onClose
}: ImageAdjustModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showSliders, setShowSliders] = useState(false);

  // Load the image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw the preview onto preview canvas
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background (neutral dark)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center of canvas + user drag offset
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Calculate aspect ratio fit
    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;
    let drawWidth = width;
    let drawHeight = height;

    if (imgAspect > canvasAspect) {
      drawWidth = height * imgAspect;
      drawHeight = height;
    } else {
      drawWidth = width;
      drawHeight = width / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [offset, rotation, scale, imgLoaded]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  // Robust pointer drag handling with setPointerCapture to prevent losing drag
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    setOffset({
      x: Math.round(e.clientX - dragStart.x),
      y: Math.round(e.clientY - dragStart.y)
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(5, Math.max(0.3, parseFloat((prev + delta).toFixed(2)))));
  };

  // Nudge movement helpers (left, right, up, down)
  const nudge = (dx: number, dy: number) => {
    setOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
  };

  const centerImage = () => {
    setOffset({ x: 0, y: 0 });
  };

  const handleRotateCw = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleRotateCcw = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };

  const handleFit = () => {
    setScale(0.85);
    setOffset({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Create high-res 600x600 passport-style canvas
    const outputCanvas = document.createElement('canvas');
    const outSize = 600;
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return;

    // Fill clean white background in case of transparent borders
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outSize, outSize);

    ctx.save();
    // Scale offset to output canvas dimensions (preview is 280x280)
    const previewSize = previewCanvasRef.current?.width || 280;
    const ratio = outSize / previewSize;

    ctx.translate(outSize / 2 + offset.x * ratio, outSize / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    const imgAspect = img.width / img.height;
    let drawWidth = outSize;
    let drawHeight = outSize;

    if (imgAspect > 1) {
      drawWidth = outSize * imgAspect;
      drawHeight = outSize;
    } else {
      drawWidth = outSize;
      drawHeight = outSize / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const outputDataUrl = outputCanvas.toDataURL('image/jpeg', 0.90);
    onApply(outputDataUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative max-w-sm sm:max-w-md w-full bg-slate-900 border border-white/20 rounded-3xl shadow-2xl p-4 sm:p-6 text-white flex flex-col items-center my-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">ছবি এডজাস্ট ও পজিশন করুন</h3>
              <p className="text-[10px] text-slate-400">টেনে বা নিচের বাটন দিয়ে ডানে-বামে, উপরে-নিচে সহজে সরান</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Frame with Passport Overlay */}
        <div className="relative mb-3 flex flex-col items-center">
          <div 
            className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden border-2 border-emerald-400/90 shadow-2xl bg-slate-950 cursor-grab active:cursor-grabbing select-none"
            style={{ touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={previewCanvasRef}
              width={280}
              height={280}
              className="w-full h-full block"
            />

            {/* Passport Oval & Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl border border-dashed border-emerald-400/40 flex items-center justify-center">
              {/* Outer oval for face proportion */}
              <div className="w-52 h-60 rounded-[50%] border-2 border-emerald-400/35 flex items-center justify-center">
                {/* Center crosshair */}
                <div className="w-2 h-2 bg-emerald-400/60 rounded-full" />
              </div>
            </div>

            {/* Live Position Badge */}
            <div className="absolute top-2 left-2 pointer-events-none px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/15 text-[10px] font-mono text-emerald-300">
              X: {offset.x > 0 ? `+${offset.x}` : offset.x} • Y: {offset.y > 0 ? `+${offset.y}` : offset.y}
            </div>

            {/* Drag hint */}
            <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 rounded-md bg-slate-950/80 border border-white/15 text-[9px] font-medium text-slate-300 flex items-center gap-1">
              <Move className="w-2.5 h-2.5 text-emerald-400" />
              <span>Drag to move</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-300 font-medium">
            <span>মাউস বা হাত দিয়ে সরাসরি টেনে যেকোনো দিকে নেওয়া যাবে</span>
          </div>
        </div>

        {/* Directional Nudge Pad (Up, Down, Left, Right Buttons) */}
        <div className="w-full bg-slate-950/70 p-3 rounded-2xl border border-white/10 mb-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-emerald-400" />
              <span>দিক পরিবর্তন (Direction Nudge)</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSliders(!showSliders)}
                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  showSliders 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>{showSliders ? 'Hide Sliders' : 'Fine Sliders'}</span>
              </button>
              <button
                type="button"
                onClick={centerImage}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-emerald-300 font-semibold cursor-pointer"
                title="Center Photo"
              >
                মাঝখানে আনুন (Center)
              </button>
            </div>
          </div>

          {/* D-Pad Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => nudge(-25, 0)}
              className="p-2.5 sm:px-3 rounded-xl bg-white/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-white hover:text-emerald-300 border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
              title="Move Left (বামে)"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px]">বামে</span>
            </button>

            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => nudge(0, -25)}
                className="p-2 sm:py-2 sm:px-3 rounded-xl bg-white/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-white hover:text-emerald-300 border border-white/10 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                title="Move Up (উপরে)"
              >
                <ArrowUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">উপরে</span>
              </button>
              <button
                type="button"
                onClick={() => nudge(0, 25)}
                className="p-2 sm:py-2 sm:px-3 rounded-xl bg-white/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-white hover:text-emerald-300 border border-white/10 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                title="Move Down (নিচে)"
              >
                <ArrowDown className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px]">নিচে</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => nudge(25, 0)}
              className="p-2.5 sm:px-3 rounded-xl bg-white/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-white hover:text-emerald-300 border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
              title="Move Right (ডানে)"
            >
              <span className="text-[11px]">ডানে</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Optional High Precision Sliders for X & Y */}
          {showSliders && (
            <div className="pt-2 border-t border-white/10 space-y-2 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Horizontal (বামে ⟷ ডানে): {offset.x}px</span>
                  <button 
                    type="button" 
                    onClick={() => setOffset(prev => ({ ...prev, x: 0 }))}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Reset X
                  </button>
                </div>
                <input
                  type="range"
                  min="-350"
                  max="350"
                  step="2"
                  value={offset.x}
                  onChange={(e) => setOffset(prev => ({ ...prev, x: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>Vertical (উপরে ⟷ নিচে): {offset.y}px</span>
                  <button 
                    type="button" 
                    onClick={() => setOffset(prev => ({ ...prev, y: 0 }))}
                    className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    Reset Y
                  </button>
                </div>
                <input
                  type="range"
                  min="-350"
                  max="350"
                  step="2"
                  value={offset.y}
                  onChange={(e) => setOffset(prev => ({ ...prev, y: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Controls: Zoom & Rotate */}
        <div className="w-full space-y-2.5 bg-slate-950/70 p-3 rounded-2xl border border-white/10 mb-4">
          {/* Zoom Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-bold flex items-center gap-1.5">
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>জুম (Zoom Scale): {scale.toFixed(2)}x</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFit}
                  className="text-[10px] text-slate-300 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Fit</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset All</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScale(prev => Math.max(0.3, parseFloat((prev - 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer active:scale-95"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="0.3"
                max="4.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setScale(prev => Math.min(4.5, parseFloat((prev + 0.1).toFixed(2))))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 cursor-pointer active:scale-95"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Buttons: Rotate */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRotateCcw}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                title="Rotate counter-clockwise 90°"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>-90°</span>
              </button>
              <button
                type="button"
                onClick={handleRotateCw}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                title="Rotate clockwise 90°"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>+90° ({rotation}°)</span>
              </button>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Formal Passport 1:1</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            বাতিল (Cancel)
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>ছবি সেভ করুন (Apply Photo)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
