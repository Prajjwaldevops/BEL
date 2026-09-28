'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  Upload, FileText, Hash, Shield, CheckCircle2, AlertCircle, Loader2,
  Lock, Cloud, Coins, ExternalLink, Copy, ArrowLeft, Zap, X
} from 'lucide-react';
import Link from 'next/link';
import { DOCUMENT_NFT_ABI, getDocumentNFTAddress, getNetworkName, getExplorerTxUrl } from '@/lib/contracts/document-nft';

type UploadStage = 'select' | 'uploading' | 'stored' | 'minting' | 'minted' | 'error';

interface UploadResult {
  document: {
    id: string;
    document_id: string;
    name: string;
    contentHash: string;
    metadataHash: string;
    fileSize: number;
    mimeType: string;
    classification: string;
    storageProvider: string;
    encrypted: boolean;
    uploadedAt: string;
  };
  mintReady: boolean;
}

interface MintResult {
  tokenId: string;
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  gasCostEth: string;
}

const STAGES = [
  { key: 'select', label: 'Select', icon: FileText },
  { key: 'uploading', label: 'Process', icon: Loader2 },
  { key: 'stored', label: 'Stored', icon: Cloud },
  { key: 'minting', label: 'Mint', icon: Coins },
  { key: 'minted', label: 'Complete', icon: CheckCircle2 },
];

export default function UploadDocumentClient() {
  const { address, isConnected, chain } = useAccount();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [classification, setClassification] = useState('UNCLASSIFIED');
  const [transferable, setTransferable] = useState(true);

  // Flow state
  const [stage, setStage] = useState<UploadStage>('select');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');

  // Wagmi hooks for minting
  const { writeContract, data: txHash, isPending: isMintPending, error: mintError } = useWriteContract();
  const { data: txReceipt, isLoading: isWaitingReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!name) setName(selected.name.replace(/\.[^/.]+$/, ''));
      setError(null);
    }
  }, [name]);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!name) setName(dropped.name.replace(/\.[^/.]+$/, ''));
    }
  }, [name]);

  // Upload document
  const handleUpload = async () => {
    if (!file || !name) return;
    setStage('uploading');
    setError(null);

    try {
      setUploadProgress('Validating file...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('classification', classification);
      formData.append('transferable', String(transferable));
      if (address) formData.append('walletAddress', address);

      setUploadProgress('Hashing, encrypting & uploading...');
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setUploadResult(data);
      setStage('stored');
      setUploadProgress('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStage('error');
    }
  };

  // Mint NFT
  const handleMint = async () => {
    if (!uploadResult || !isConnected || !address) {
      setError('Connect your wallet to mint');
      return;
    }

    setStage('minting');
    setError(null);

    try {
      const contractAddress = getDocumentNFTAddress();
      const contentHashBytes = uploadResult.document.contentHash as `0x${string}`;
      const metadataHashBytes = uploadResult.document.metadataHash as `0x${string}`;

      // Token URI — points to verification
      const tokenURI = `${window.location.origin}/verify/${uploadResult.document.document_id}`;

      writeContract({
        address: contractAddress,
        abi: DOCUMENT_NFT_ABI,
        functionName: 'mintDocument',
        args: [
          address,
          tokenURI,
          contentHashBytes,
          metadataHashBytes,
          transferable,
          BigInt(0), // no expiry for now
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mint failed');
      setStage('stored');
    }
  };

  // Handle mint transaction receipt
  if (txReceipt && stage === 'minting' && !mintResult) {
    const gasUsed = txReceipt.gasUsed.toString();
    const gasPrice = txReceipt.effectiveGasPrice.toString();
    const gasCostEth = (Number(txReceipt.gasUsed * txReceipt.effectiveGasPrice) / 1e18).toFixed(8);

    // Parse DocumentMinted event to get tokenId
    let tokenId = '0';
    for (const log of txReceipt.logs) {
      // DocumentMinted event topic
      if (log.topics[0] === '0x' + 'e4e3e2e1') { // placeholder, will match by index
        tokenId = log.topics[1] ? BigInt(log.topics[1]).toString() : '0';
        break;
      }
    }
    // Fallback: use first indexed topic from first log
    if (tokenId === '0' && txReceipt.logs.length > 0) {
      const firstLog = txReceipt.logs[0];
      if (firstLog.topics[1]) {
        tokenId = BigInt(firstLog.topics[1]).toString();
      }
    }

    const result: MintResult = {
      tokenId,
      txHash: txReceipt.transactionHash,
      blockNumber: Number(txReceipt.blockNumber),
      gasUsed,
      gasCostEth,
    };
    setMintResult(result);
    setStage('minted');

    // Confirm mint to backend
    fetch('/api/documents/mint-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: uploadResult?.document.id,
        tokenId,
        contractAddress: getDocumentNFTAddress(),
        transactionHash: txReceipt.transactionHash,
        blockNumber: Number(txReceipt.blockNumber),
        chainId: chain?.id,
        ownerWallet: address,
        gasUsed,
        gasPrice,
      }),
    }).catch(console.error);
  }

  // Handle mint error
  if (mintError && stage === 'minting') {
    setError(mintError.message.includes('User rejected') ? 'Transaction rejected by wallet' : mintError.message);
    setStage('stored');
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentStageIndex = STAGES.findIndex(s => s.key === stage);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/documents" className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">Upload Document</h1>
          <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase mt-0.5">
            HASH • ENCRYPT • STORE • MINT NFT
          </p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentStageIndex;
          const isDone = i < currentStageIndex || stage === 'minted';
          const isError = stage === 'error' && i === 1;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                isError ? 'border-red-500/50 bg-red-500/10' :
                isDone ? 'border-[#00ff88]/50 bg-[#00ff88]/10' :
                isActive ? 'border-[#7c5cfc]/50 bg-[#7c5cfc]/10' :
                'border-white/10 bg-white/[0.02]'
              }`}>
                {isDone ? <CheckCircle2 className="w-4 h-4 text-[#00ff88]" /> :
                 isError ? <X className="w-4 h-4 text-red-400" /> :
                 isActive && (stage === 'uploading' || stage === 'minting') ?
                   <Loader2 className="w-4 h-4 text-[#7c5cfc] animate-spin" /> :
                   <Icon className={`w-4 h-4 ${isActive ? 'text-[#7c5cfc]' : 'text-white/20'}`} />
                }
              </div>
              <span className={`text-[9px] font-mono tracking-wider uppercase hidden sm:block ${
                isDone ? 'text-[#00ff88]' : isActive ? 'text-white' : 'text-white/20'
              }`}>{s.label}</span>
              {i < STAGES.length - 1 && (
                <div className={`w-8 h-[1px] mx-1 ${isDone ? 'bg-[#00ff88]/30' : 'bg-white/10'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button onClick={() => { setError(null); if (stage === 'error') setStage('select'); }} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: Select File */}
      {stage === 'select' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="p-8 rounded-xl border-2 border-dashed border-white/10 hover:border-[#7c5cfc]/30 bg-white/[0.01] transition-all text-center cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input id="file-input" type="file" className="hidden" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileSelect} />
            <Upload className="w-10 h-10 text-white/20 mx-auto mb-3" />
            {file ? (
              <div>
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-white/40 mt-1">{formatBytes(file.size)} • {file.type}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-white/60">Drop file here or click to browse</p>
                <p className="text-[10px] text-white/30 mt-1 font-mono">PDF, DOCX, PNG, JPG — Max 50MB</p>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Document Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter document name"
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50" />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Classification</label>
                <select value={classification} onChange={(e) => setClassification(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50">
                  <option value="UNCLASSIFIED">Unclassified</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="SECRET">Secret</option>
                  <option value="TOP SECRET">Top Secret</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5 font-mono uppercase tracking-wider">Transferable</label>
                <select value={String(transferable)} onChange={(e) => setTransferable(e.target.value === 'true')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#7c5cfc]/50">
                  <option value="true">Transferable</option>
                  <option value="false">Soulbound (Non-transferable)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00ff88]' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-mono text-white/50 uppercase tracking-wider">
                {isConnected ? `Wallet: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Wallet not connected'}
              </span>
            </div>
            {chain && <span className="text-[9px] font-mono text-white/30">{chain.name}</span>}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !name}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload & Secure Document
          </button>
        </motion.div>
      )}

      {/* Stage: Uploading */}
      {stage === 'uploading' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 text-center">
          <Loader2 className="w-10 h-10 text-[#7c5cfc] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">Processing Document</h3>
          <p className="text-xs text-white/50 font-mono">{uploadProgress || 'Please wait...'}</p>
          <div className="mt-4 space-y-1 text-[10px] font-mono text-white/30">
            <p>✓ Validating file type & magic bytes</p>
            <p>✓ Computing SHA-256 hash (server-side)</p>
            <p>✓ Encrypting with AES-256-GCM</p>
            <p>✓ Uploading to secure cloud storage</p>
          </div>
        </motion.div>
      )}

      {/* Stage: Stored — Ready to Mint */}
      {stage === 'stored' && uploadResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-5 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#00ff88]/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#00ff88]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Document Secured</h3>
                <p className="text-[10px] text-white/40 font-mono">{uploadResult.document.encrypted ? 'ENCRYPTED • ' : ''}STORED • READY TO MINT</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
              <div><span className="text-white/30">ID:</span> <span className="text-[#00ff88]">{uploadResult.document.document_id}</span></div>
              <div><span className="text-white/30">Size:</span> <span className="text-white/70">{formatBytes(uploadResult.document.fileSize)}</span></div>
              <div className="col-span-2"><span className="text-white/30">SHA-256:</span> <span className="text-white/50 break-all">{uploadResult.document.contentHash}</span></div>
              <div className="col-span-2"><span className="text-white/30">Storage:</span> <span className="text-white/50">{uploadResult.document.storageProvider}</span>
                {uploadResult.document.encrypted && <span className="ml-2 text-[#7c5cfc]"><Lock className="w-3 h-3 inline" /> AES-256-GCM</span>}
              </div>
            </div>
          </div>

          {/* Mint Preview */}
          <div className="p-5 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#7c5cfc]" /> Mint Document NFT
            </h4>
            <div className="space-y-2 text-[10px] font-mono mb-4">
              <div className="flex justify-between"><span className="text-white/30">Document:</span><span className="text-white/70">{uploadResult.document.name}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Recipient:</span><span className="text-[#00ff88]">{address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Connect wallet'}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Network:</span><span className="text-white/70">{chain ? chain.name : getNetworkName()}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Type:</span><span className="text-white/70">{transferable ? 'Transferable' : 'Soulbound'}</span></div>
            </div>

            <button
              onClick={handleMint}
              disabled={!isConnected || isMintPending || isWaitingReceipt}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-sm font-bold tracking-wider uppercase disabled:opacity-30 hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all flex items-center justify-center gap-2"
            >
              {isMintPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirm in Wallet...</> :
               isWaitingReceipt ? <><Loader2 className="w-4 h-4 animate-spin" /> Waiting for Confirmation...</> :
               !isConnected ? 'Connect Wallet to Mint' :
               <><Zap className="w-4 h-4" /> Mint Document NFT</>
              }
            </button>
          </div>

          {/* Skip mint option */}
          <Link href="/dashboard/documents" className="block text-center text-[10px] text-white/30 hover:text-white/50 font-mono uppercase tracking-wider">
            Skip minting — mint later from document details
          </Link>
        </motion.div>
      )}

      {/* Stage: Minting */}
      {stage === 'minting' && !mintResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/5 text-center">
          <Loader2 className="w-10 h-10 text-[#7c5cfc] animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-1">Minting Document NFT</h3>
          <p className="text-xs text-white/50 font-mono">
            {isMintPending ? 'Please confirm in your wallet...' : 'Waiting for blockchain confirmation...'}
          </p>
          {txHash && (
            <p className="mt-3 text-[9px] font-mono text-white/30 break-all">TX: {txHash}</p>
          )}
        </motion.div>
      )}

      {/* Stage: Minted — Success */}
      {stage === 'minted' && mintResult && uploadResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-6 rounded-xl border border-[#00ff88]/30 bg-[#00ff88]/5">
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-8 h-8 text-[#00ff88]" />
              </div>
              <h3 className="text-xl font-bold text-white">Document NFT Minted</h3>
              <p className="text-xs text-white/40 font-mono mt-1">NFT #{mintResult.tokenId} • Owned by your wallet</p>
            </div>

            <div className="space-y-3 text-[10px] font-mono">
              <div className="flex justify-between items-start"><span className="text-white/30">Document:</span><span className="text-white/70 text-right">{uploadResult.document.name}</span></div>
              <div className="flex justify-between items-start"><span className="text-white/30">Document ID:</span><span className="text-[#00ff88]">{uploadResult.document.document_id}</span></div>
              <div className="flex justify-between items-start"><span className="text-white/30">NFT Token ID:</span><span className="text-[#7c5cfc] font-bold">#{mintResult.tokenId}</span></div>
              <div className="flex justify-between items-start">
                <span className="text-white/30">Owner:</span>
                <span className="text-[#00ff88]">{address?.slice(0, 10)}...{address?.slice(-8)}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-white/30">TX Hash:</span>
                <span className="text-white/50 flex items-center gap-1">
                  {mintResult.txHash.slice(0, 14)}...{mintResult.txHash.slice(-8)}
                  <button onClick={() => copyToClipboard(mintResult.txHash)}><Copy className="w-3 h-3 text-white/30 hover:text-white/60" /></button>
                  {getExplorerTxUrl(mintResult.txHash, chain?.id) && (
                    <a href={getExplorerTxUrl(mintResult.txHash, chain?.id)!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 text-white/30 hover:text-white/60" />
                    </a>
                  )}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-white/30">Block:</span><span className="text-white/50">{mintResult.blockNumber}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Gas Used:</span><span className="text-white/50">{Number(mintResult.gasUsed).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/30">Gas Cost:</span><span className="text-amber-400">{mintResult.gasCostEth} ETH</span></div>
              <div className="flex justify-between"><span className="text-white/30">Network:</span><span className="text-white/50">{chain?.name || getNetworkName()}</span></div>
              <div className="flex justify-between items-start">
                <span className="text-white/30">Content Hash:</span>
                <span className="text-white/40 break-all text-right max-w-[60%]">{uploadResult.document.contentHash}</span>
              </div>
              <div className="flex justify-between"><span className="text-white/30">Storage:</span><span className="text-white/50">{uploadResult.document.encrypted ? '🔒 Encrypted' : ''} {uploadResult.document.storageProvider}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/dashboard/documents`}
              className="py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white text-xs font-mono uppercase tracking-wider text-center hover:bg-white/[0.06] transition-all">
              View Documents
            </Link>
            <button onClick={() => { setStage('select'); setFile(null); setName(''); setUploadResult(null); setMintResult(null); }}
              className="py-3 rounded-xl bg-gradient-to-r from-[#7c5cfc] to-[#6b4dd9] text-white text-xs font-mono uppercase tracking-wider hover:shadow-lg hover:shadow-[#7c5cfc]/20 transition-all">
              Upload Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
