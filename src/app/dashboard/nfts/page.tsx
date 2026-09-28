import NFTGalleryClient from './NFTGalleryClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'NFT Gallery — BEL SENTINEL',
  description: 'View and manage document NFTs minted on the blockchain.',
};

export default function NFTGalleryPage() {
  return <NFTGalleryClient />;
}
