import VerificationClient from './VerificationClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Verification Center — BEL SENTINEL',
  description: 'Verify document authenticity using hash, document ID, NFT, or QR code.',
};

export default function VerificationPage() {
  return <VerificationClient />;
}
