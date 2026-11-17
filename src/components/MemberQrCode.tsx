import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MemberQrCodeProps {
  membershipId: string;
  size?: number;
  compact?: boolean;
  className?: string;
}

export default function MemberQrCode({
  membershipId,
  size = 96,
  compact = false,
  className = '',
}: MemberQrCodeProps) {
  const qrValue = membershipId.trim() || 'NGDCSC-PENDING';

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center shrink-0 ${
        compact ? 'p-2.5 gap-1' : 'p-3 gap-1.5'
      } ${className}`}
    >
      <div className="bg-white p-1 rounded-lg border border-slate-100">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="M"
          bgColor="#ffffff"
          fgColor="#0f172a"
          marginSize={1}
          title={`Membership ID QR Code: ${qrValue}`}
        />
      </div>
      <div className="space-y-0.5">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Event Check-In QR
        </span>
        <span className="block text-[10px] font-mono font-extrabold text-slate-800 tracking-wide">
          {qrValue}
        </span>
      </div>
    </div>
  );
}
