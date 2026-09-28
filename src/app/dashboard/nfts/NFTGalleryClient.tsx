'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Coins, Shield, CheckCircle2, XCircle, Clock, FileText, Hash,
  Lock, ExternalLink, Copy, AlertTriangle
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface MintedDoc {
  id: string;
  document_id: string;
  name: string;
  classification: string;
  status: string;
  mint_status: string;
  nft_token_id: string;
  nft_contract_address: string;
  owner_wallet: string;
  chain_id: number;
  mint_tx_hash: string;
  mint_block_number: number;
  content_hash: string;
  transferable: boolean;
  created_at: string;
  file_size: number;
  verification_count: number;
  mint_gas_used: string | null;
  mint_gas_price: string | null;
}

export default function NFTGalleryClient() {
  const { address } = useAccount();
  const [nfts, setNfts] = useState<MintedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/documents?mint_status=MINTED&limit=50');
        const data = await res.json();
        setNfts(data.documents || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="w-6 h-6 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-white/30 mt-3 font-mono">Loading NFTs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#7c5cfc]" /> Document NFT Gallery
        </h1>
        <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase mt-0.5">
          {nfts.length} MINTED DOCUMENT NFTS ON-CHAIN
        </p>
      </div>

      {nfts.length === 0 ? (
        <div className="py-16 text-center">
          <Coins className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/40">No document NFTs minted yet</p>
          <p className="text-[10px] text-white/20 mt-1">Upload a document and mint it to see it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {nfts.map((nft) => {
            const isOwner = address && nft.owner_wallet?.toLowerCase() === address.toLowerCase();
            const isRevoked = nft.status === 'REVOKED';
            const gasCostEth = nft.mint_gas_used && nft.mint_gas_price
              ? (Number(BigInt(nft.mint_gas_used) * BigInt(nft.mint_gas_price)) / 1e18).toFixed(6)
              : null;

            return (
              <motion.div
                key={nft.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
                  isRevoked
                    ? 'border-red-500/20 bg-red-500/[0.02] hover:border-red-500/30'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-[#7c5cfc]/30'
                }`}
              >
                {/* Header */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#7c5cfc] text-lg font-bold font-mono">#{nft.nft_token_id}</span>
                    <div className="flex items-center gap-1.5">
                      {isRevoked ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[8px] font-mono">
                          <XCircle className="w-2.5 h-2.5" /> REVOKED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#00ff88]/10 text-[#00ff88] text-[8px] font-mono">
                          <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono ${
                        nft.transferable
                          ? 'bg-[#38bdf8]/10 text-[#38bdf8]'
                          : 'bg-amber-400/10 text-amber-400'
                      }`}>
                        {nft.transferable ? 'TRANSFERABLE' : 'SOULBOUND'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-white truncate">{nft.name}</h3>
                  <p className="text-[9px] font-mono text-white/25 mt-0.5">{nft.document_id} • {nft.classification}</p>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2 text-[9px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/25">Owner</span>
                    <span className={`flex items-center gap-1 ${isOwner ? 'text-[#00ff88]' : 'text-white/50'}`}>
                      {isOwner && <span className="text-[7px] bg-[#00ff88]/10 px-1 rounded">YOU</span>}
                      {nft.owner_wallet?.slice(0, 8)}...{nft.owner_wallet?.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">Contract</span>
                    <span className="text-white/40 flex items-center gap-1">
                      {nft.nft_contract_address?.slice(0, 8)}...{nft.nft_contract_address?.slice(-4)}
                      <button onClick={() => copyToClipboard(nft.nft_contract_address)}><Copy className="w-2.5 h-2.5 text-white/20 hover:text-white/40" /></button>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">TX Hash</span>
                    <span className="text-white/40 flex items-center gap-1">
                      {nft.mint_tx_hash?.slice(0, 10)}...{nft.mint_tx_hash?.slice(-6)}
                      <button onClick={() => copyToClipboard(nft.mint_tx_hash)}><Copy className="w-2.5 h-2.5 text-white/20 hover:text-white/40" /></button>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">Block</span>
                    <span className="text-white/40">{nft.mint_block_number || '—'}</span>
                  </div>
                  {gasCostEth && (
                    <div className="flex justify-between">
                      <span className="text-white/25">Gas Cost</span>
                      <span className="text-amber-400">{gasCostEth} ETH</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/25">Verifications</span>
                    <span className="text-[#00ff88]">{nft.verification_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/25">Minted</span>
                    <span className="text-white/40">{new Date(nft.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Content Hash */}
                <div className="px-4 pb-4">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <p className="text-[8px] text-white/20 mb-0.5">SHA-256</p>
                    <p className="text-[8px] text-white/30 break-all font-mono">{nft.content_hash}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
