'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, ChevronDown, ChevronRight, User, Clock, Hash,
  Blocks, FileText, MapPin, ArrowRight, CheckCircle2,
  Plus, ClipboardCheck, UserPlus, Eye, ArrowRightLeft, Search as SearchIcon, ShieldOff,
} from 'lucide-react';
import { demoAssets, type AssetLifecycleEvent } from '@/lib/demo-data';

const stageConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  CREATED: { color: '#00f0ff', icon: Plus },
  REGISTERED: { color: '#0ea5e9', icon: ClipboardCheck },
  ASSIGNED: { color: '#3b82f6', icon: UserPlus },
  ACCESSED: { color: '#a855f7', icon: Eye },
  TRANSFERRED: { color: '#f59e0b', icon: ArrowRightLeft },
  AUDITED: { color: '#00ff88', icon: SearchIcon },
  REVOKED: { color: '#ef4444', icon: ShieldOff },
  ACTIVE: { color: '#00ff88', icon: CheckCircle2 },
};

export default function LifecyclePage() {
  const [selectedAssetId, setSelectedAssetId] = useState(demoAssets[0]?.id || '');
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const selectedAsset = demoAssets.find((a) => a.id === selectedAssetId) || demoAssets[0];

  if (!selectedAsset || demoAssets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Lifecycle & Traceability</h1>
          <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            COMPLETE PROVENANCE — WHO, WHAT, WHEN, WHERE, TX HASH, BLOCK NUMBER
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.01)]">
          <GitBranch className="w-12 h-12 text-[#5a6068] mb-4" />
          <p className="text-sm text-[#9aa0a8]">No assets registered yet</p>
          <p className="text-[10px] text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
            Register assets through the Digital Assets page to track their lifecycle
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Asset Lifecycle & Traceability</h1>
        <p className="text-xs text-[#5a6068] mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          COMPLETE PROVENANCE — WHO, WHAT, WHEN, WHERE, TX HASH, BLOCK NUMBER
        </p>
      </div>

      {/* Asset selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {demoAssets.map((asset) => (
          <button
            key={asset.id}
            onClick={() => { setSelectedAssetId(asset.id); setExpandedEvent(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs transition-all ${
              selectedAssetId === asset.id
                ? 'bg-[rgba(0,240,255,0.1)] text-[#00f0ff] border border-[rgba(0,240,255,0.25)] shadow-[0_0_20px_rgba(0,240,255,0.1)]'
                : 'text-[#9aa0a8] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)] hover:text-white bg-[rgba(255,255,255,0.02)]'
            }`}
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <span className={`w-2 h-2 rounded-full ${selectedAssetId === asset.id ? 'bg-[#00f0ff] animate-pulse' : 'bg-[#5a6068]'}`} />
            {asset.id}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Asset Detail Card */}
        <div className="xl:col-span-1">
          <div className="rounded-xl border border-[rgba(0,240,255,0.1)] bg-[rgba(0,240,255,0.02)] p-5 sticky top-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="text-sm font-bold text-[#00f0ff]" style={{ fontFamily: 'var(--font-mono)' }}>{selectedAsset.id}</span>
              </div>
              <span
                className="px-2.5 py-1 rounded-md text-[10px] font-medium"
                style={{
                  background: `${stageConfig[selectedAsset.status]?.color || '#00ff88'}15`,
                  color: stageConfig[selectedAsset.status]?.color || '#00ff88',
                  border: `1px solid ${stageConfig[selectedAsset.status]?.color || '#00ff88'}30`,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {selectedAsset.status}
              </span>
            </div>

            <h3 className="text-base font-semibold text-white mb-4">{selectedAsset.name}</h3>
            <p className="text-xs text-[#9aa0a8] mb-5 leading-relaxed">{selectedAsset.description}</p>

            <div className="space-y-3">
              {[
                { label: 'ASSET ID', value: selectedAsset.id },
                { label: 'CATEGORY', value: selectedAsset.category },
                { label: 'CURRENT OWNER', value: selectedAsset.currentOwner },
                { label: 'PREVIOUS OWNER', value: selectedAsset.previousOwner },
                { label: 'CLASSIFICATION', value: selectedAsset.classification },
                { label: 'NFT TOKEN ID', value: selectedAsset.nftTokenId, color: '#a855f7' },
                { label: 'TX HASH', value: `${selectedAsset.txHash.slice(0, 22)}...`, color: '#00f0ff' },
                { label: 'BLOCK NUMBER', value: `#${selectedAsset.blockNumber.toLocaleString()}`, color: '#3b82f6' },
                { label: 'IPFS CID', value: selectedAsset.ipfsCid, color: '#00ff88' },
                { label: 'CREATED', value: new Date(selectedAsset.createdAt).toLocaleDateString() },
                { label: 'LAST MODIFIED', value: new Date(selectedAsset.lastModified).toLocaleDateString() },
              ].map((field) => (
                <div key={field.label} className="flex items-start justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                  <span className="text-[10px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {field.label}
                  </span>
                  <span
                    className="text-[11px] text-right max-w-[60%] truncate"
                    style={{ color: field.color || '#e8eaed', fontFamily: 'var(--font-mono)' }}
                  >
                    {field.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lifecycle Timeline */}
        <div className="xl:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <GitBranch className="w-4 h-4 text-[#00f0ff]" />
            <span className="text-xs text-[#e8eaed] font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
              LIFECYCLE TIMELINE — {selectedAsset.lifecycle.length} EVENTS
            </span>
          </div>

          {/* Visual status flow */}
          <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
            {selectedAsset.lifecycle.map((event, i) => {
              const config = stageConfig[event.newState] || stageConfig.CREATED;
              const StageIcon = config.icon;
              return (
                <div key={i} className="flex items-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setExpandedEvent(expandedEvent === i ? null : i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      background: expandedEvent === i ? `${config.color}15` : `${config.color}08`,
                      border: `1px solid ${expandedEvent === i ? `${config.color}40` : `${config.color}20`}`,
                      boxShadow: expandedEvent === i ? `0 0 15px ${config.color}20` : 'none',
                    }}
                  >
                    <StageIcon className="w-3 h-3" style={{ color: config.color }} />
                    <span className="text-[9px] font-bold tracking-[0.05em] whitespace-nowrap" style={{ color: config.color, fontFamily: 'var(--font-mono)' }}>
                      {event.newState}
                    </span>
                  </motion.button>
                  {i < selectedAsset.lifecycle.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-[rgba(255,255,255,0.15)] mx-1 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Timeline events */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-[#00f0ff] via-[#3b82f6] to-[#00ff88] opacity-20" />

            {selectedAsset.lifecycle.map((event, i) => {
              const config = stageConfig[event.newState] || stageConfig.CREATED;
              const StageIcon = config.icon;
              const isExpanded = expandedEvent === i;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="relative pl-14 pb-6 last:pb-0"
                >
                  {/* Timeline node */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    onClick={() => setExpandedEvent(isExpanded ? null : i)}
                    className="absolute left-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer z-10"
                    style={{
                      background: `${config.color}15`,
                      border: `2px solid ${config.color}`,
                      boxShadow: isExpanded ? `0 0 20px ${config.color}40` : `0 0 10px ${config.color}15`,
                    }}
                  >
                    <StageIcon className="w-4 h-4" style={{ color: config.color }} />
                  </motion.button>

                  {/* Event card */}
                  <div
                    className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                      isExpanded
                        ? 'bg-[rgba(255,255,255,0.03)] shadow-[0_0_30px_rgba(0,0,0,0.3)]'
                        : 'bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.02)]'
                    }`}
                    style={{
                      borderColor: isExpanded ? `${config.color}25` : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <button
                      onClick={() => setExpandedEvent(isExpanded ? null : i)}
                      className="w-full p-4 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold" style={{ color: config.color, fontFamily: 'var(--font-mono)' }}>
                          {event.stage}
                        </span>
                        <span className="text-xs text-[#9aa0a8]">{event.notes}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#5a6068]" style={{ fontFamily: 'var(--font-mono)' }}>
                          {new Date(event.timestamp).toLocaleDateString()}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[#5a6068]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[#5a6068]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-[rgba(255,255,255,0.06)]"
                        >
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-start gap-2">
                              <User className="w-3.5 h-3.5 text-[#00f0ff] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>WHO</div>
                                <div className="text-xs text-[#e8eaed] mt-0.5">{event.actor}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <FileText className="w-3.5 h-3.5 text-[#00ff88] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>WHAT</div>
                                <div className="text-xs text-[#e8eaed] mt-0.5">{event.stage}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#a855f7] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>WHEN</div>
                                <div className="text-xs text-[#e8eaed] mt-0.5">{new Date(event.timestamp).toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#f59e0b] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>RESOURCE</div>
                                <div className="text-xs text-[#e8eaed] mt-0.5">{selectedAsset.id}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Hash className="w-3.5 h-3.5 text-[#00f0ff] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>TX HASH</div>
                                <div className="text-xs text-[#00f0ff] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>{event.txHash}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Blocks className="w-3.5 h-3.5 text-[#3b82f6] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>BLOCK NUMBER</div>
                                <div className="text-xs text-[#3b82f6] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>#{event.blockNumber.toLocaleString()}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <ArrowRight className="w-3.5 h-3.5 text-[#ef4444] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>PREVIOUS STATE</div>
                                <div className="text-xs text-[#9aa0a8] mt-0.5">{event.previousState || '—'}</div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88] mt-0.5" />
                              <div>
                                <div className="text-[9px] text-[#5a6068] tracking-[0.1em]" style={{ fontFamily: 'var(--font-mono)' }}>NEW STATE</div>
                                <div className="text-xs font-medium mt-0.5" style={{ color: config.color }}>{event.newState}</div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
