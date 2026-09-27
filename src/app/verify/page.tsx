'use client';

import { useState } from 'react';
import { Search, CheckCircle, XCircle, ExternalLink, Hash, Clock, User, FileText, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface VerificationResult {
  verified: boolean;
  type: 'identity' | 'asset' | 'document' | 'credential';
  data: {
    id: string;
    name?: string;
    owner?: string;
    status?: string;
    txHash?: string;
    blockNumber?: number;
    timestamp?: string;
    ipfsHash?: string;
    metadataHash?: string;
    issuer?: string;
    issuanceDate?: string;
    expirationDate?: string;
  };
  onChainData?: {
    txHash: string;
    blockNumber: number;
    timestamp: string;
    gasUsed: string;
    network: string;
  };
  error?: string;
}

export default function VerifyPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerify = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      // Determine query type
      let endpoint = '/api/verify/';
      
      if (query.startsWith('0x') && query.length === 66) {
        // Transaction hash
        endpoint += `transaction?hash=${query}`;
      } else if (query.startsWith('Qm') || query.startsWith('bafy')) {
        // IPFS CID
        endpoint += `document?cid=${query}`;
      } else if (query.startsWith('did:')) {
        // DID
        endpoint += `credential?did=${query}`;
      } else if (query.match(/^\d+$/)) {
        // Token ID
        endpoint += `asset?tokenId=${query}`;
      } else {
        // Generic ID search
        endpoint += `generic?q=${query}`;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      setResult(data);
    } catch (error) {
      setResult({
        verified: false,
        type: 'identity',
        data: { id: query },
        error: 'Verification failed. Please check your input and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getExplorerUrl = (network: string, txHash: string) => {
    const explorers: Record<string, string> = {
      localhost: '#',
      sepolia: `https://sepolia.etherscan.io/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      'polygon-amoy': `https://amoy.polygonscan.com/tx/${txHash}`,
    };
    return explorers[network] || '#';
  };

  const getIpfsUrl = (hash: string) => {
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7c5cfc] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00ff88] rounded-full mix-blend-screen filter blur-[128px] opacity-10" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-[#00ff88]" />
                <div>
                  <h1 className="text-xl font-bold tracking-tight">BEL SENTINEL</h1>
                  <p className="text-xs text-[#5a6068] tracking-[0.1em]">PUBLIC VERIFICATION PORTAL</p>
                </div>
              </div>
              <a
                href="/"
                className="text-sm text-[#00ff88] hover:text-[#00cc6a] transition-colors"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-[#00ff88] to-[#7c5cfc] bg-clip-text text-transparent">
                Verify Authenticity
              </h2>
              <p className="text-[#9aa0a8] text-lg max-w-2xl mx-auto">
                Independently verify identities, assets, documents, and credentials on the blockchain.
                No login required — just enter the ID, hash, or transaction to check authenticity.
              </p>
            </motion.div>

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  placeholder="Enter Token ID, TX Hash, IPFS CID, or DID..."
                  className="w-full px-6 py-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-xl text-white placeholder-[#5a6068] focus:outline-none focus:border-[#00ff88] transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <button
                  onClick={handleVerify}
                  disabled={loading || !query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00ff88]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Verify
                    </>
                  )}
                </button>
              </div>

              {/* Examples */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-[#5a6068]">Examples:</span>
                <button
                  onClick={() => setQuery('1000')}
                  className="text-xs text-[#00ff88] hover:text-[#00cc6a] transition-colors"
                >
                  Token ID: 1000
                </button>
                <span className="text-[#5a6068]">•</span>
                <button
                  onClick={() => setQuery('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')}
                  className="text-xs text-[#00ff88] hover:text-[#00cc6a] transition-colors"
                >
                  IPFS CID
                </button>
                <span className="text-[#5a6068]">•</span>
                <button
                  onClick={() => setQuery('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')}
                  className="text-xs text-[#00ff88] hover:text-[#00cc6a] transition-colors"
                >
                  TX Hash
                </button>
              </div>
            </motion.div>

            {/* Results */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Status Card */}
                <div
                  className={`p-6 rounded-xl border ${
                    result.verified
                      ? 'bg-[rgba(0,255,136,0.05)] border-[#00ff88]/30'
                      : 'bg-[rgba(239,68,68,0.05)] border-[#ef4444]/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {result.verified ? (
                      <CheckCircle className="w-12 h-12 text-[#00ff88]" />
                    ) : (
                      <XCircle className="w-12 h-12 text-[#ef4444]" />
                    )}
                    <div>
                      <h3 className="text-2xl font-bold mb-1">
                        {result.verified ? 'Verified' : 'Not Verified'}
                      </h3>
                      <p className="text-[#9aa0a8]">
                        {result.verified
                          ? `This ${result.type} has been cryptographically verified on the blockchain.`
                          : result.error || 'Could not verify this item. It may not exist or has been tampered with.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details Card */}
                {result.verified && (
                  <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#7c5cfc]" />
                      Details
                    </h4>

                    <div className="space-y-3">
                      {result.data.id && (
                        <div className="flex items-start gap-3">
                          <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">ID</p>
                            <p className="text-sm font-mono break-all">{result.data.id}</p>
                          </div>
                        </div>
                      )}

                      {result.data.name && (
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">Name</p>
                            <p className="text-sm">{result.data.name}</p>
                          </div>
                        </div>
                      )}

                      {result.data.owner && (
                        <div className="flex items-start gap-3">
                          <User className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">Owner</p>
                            <p className="text-sm font-mono">{result.data.owner}</p>
                          </div>
                        </div>
                      )}

                      {result.data.status && (
                        <div className="flex items-start gap-3">
                          <Shield className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">Status</p>
                            <p className="text-sm">{result.data.status}</p>
                          </div>
                        </div>
                      )}

                      {result.data.timestamp && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">Timestamp</p>
                            <p className="text-sm">
                              {new Date(result.data.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {result.data.ipfsHash && (
                        <div className="flex items-start gap-3">
                          <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">IPFS Hash</p>
                            <a
                              href={getIpfsUrl(result.data.ipfsHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-mono text-[#00ff88] hover:text-[#00cc6a] flex items-center gap-1"
                            >
                              {result.data.ipfsHash}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {result.data.metadataHash && (
                        <div className="flex items-start gap-3">
                          <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-[#5a6068] mb-1">Metadata Hash</p>
                            <p className="text-sm font-mono break-all">{result.data.metadataHash}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* On-Chain Proof */}
                {result.verified && result.onChainData && (
                  <div className="p-6 rounded-xl border border-[#00ff88]/30 bg-[rgba(0,255,136,0.02)]">
                    <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#00ff88]" />
                      Blockchain Proof
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-[#5a6068] mb-1">Transaction Hash</p>
                          <a
                            href={getExplorerUrl(result.onChainData.network, result.onChainData.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-[#00ff88] hover:text-[#00cc6a] flex items-center gap-1 break-all"
                          >
                            {result.onChainData.txHash}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Hash className="w-4 h-4 text-[#5a6068] mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-[#5a6068] mb-1">Block Number</p>
                          <p className="text-sm font-mono">{result.onChainData.blockNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-[#5a6068] mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-[#5a6068] mb-1">Block Timestamp</p>
                          <p className="text-sm">
                            {new Date(result.onChainData.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Shield className="w-4 h-4 text-[#5a6068] mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-[#5a6068] mb-1">Network</p>
                          <p className="text-sm capitalize">{result.onChainData.network}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                      <p className="text-xs text-[#5a6068]">
                        ✅ This record has been permanently anchored to the blockchain and cannot be altered or deleted.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Info Cards */}
            {!result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid md:grid-cols-2 gap-6 mt-12"
              >
                <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                  <h3 className="text-lg font-semibold mb-3">What Can I Verify?</h3>
                  <ul className="space-y-2 text-sm text-[#9aa0a8]">
                    <li>• Identity NFTs (Token IDs)</li>
                    <li>• Asset NFTs (Token IDs)</li>
                    <li>• Documents (IPFS CIDs)</li>
                    <li>• Verifiable Credentials (DIDs)</li>
                    <li>• Blockchain Transactions (TX Hashes)</li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                  <h3 className="text-lg font-semibold mb-3">How It Works</h3>
                  <ul className="space-y-2 text-sm text-[#9aa0a8]">
                    <li>• Enter the ID, hash, or identifier</li>
                    <li>• System checks blockchain records</li>
                    <li>• Cryptographic verification performed</li>
                    <li>• Results shown with proof details</li>
                    <li>• Explorer links provided for audit</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
