import UploadDocumentClient from './UploadDocumentClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Upload Document — BEL SENTINEL',
  description: 'Upload, encrypt, and mint document NFTs on the blockchain.',
};

export default function UploadDocumentPage() {
  return <UploadDocumentClient />;
}
