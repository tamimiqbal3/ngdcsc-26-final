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
      className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white shrink-0 ${
        compact ? 'p-2' : 'p-2.5'
      } ${className}`}
    >
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
  );
}
