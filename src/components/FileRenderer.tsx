'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Image as ImageIcon, File, Download, ZoomIn, ZoomOut,
  RotateCw, Maximize2, Minimize2, X, AlertTriangle, Loader2,
  Lock, Shield
} from 'lucide-react';

interface FileRendererProps {
  fileUrl?: string;
  localFile?: File;
  mimeType?: string;
  fileName?: string;
  isEncrypted?: boolean;
  allowDownload?: boolean;
  onClose?: () => void;
  compact?: boolean;
}

type RenderMode = 'loading' | 'image' | 'pdf' | 'text' | 'encrypted' | 'unsupported' | 'error';

const RENDERABLE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
const RENDERABLE_PDF_TYPES = ['application/pdf'];
const RENDERABLE_TEXT_TYPES = ['text/plain', 'text/markdown', 'text/csv', 'application/json'];

function detectRenderMode(mimeType?: string, isEncrypted?: boolean): RenderMode {
  if (isEncrypted) return 'encrypted';
  if (!mimeType) return 'unsupported';
  if (RENDERABLE_IMAGE_TYPES.includes(mimeType)) return 'image';
  if (RENDERABLE_PDF_TYPES.includes(mimeType)) return 'pdf';
  if (RENDERABLE_TEXT_TYPES.includes(mimeType)) return 'text';
  return 'unsupported';
}

function ImageRenderer({ src, fileName }: { src: string; fileName?: string }) {
  const [zoom, setZoom] = useState(1);
  const [rotate, setRotate] = useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        {[
          { icon: ZoomOut, action: () => setZoom(z => Math.max(0.25, z - 0.25)), title: 'Zoom out' },
          { icon: ZoomIn, action: () => setZoom(z => Math.min(4, z + 0.25)), title: 'Zoom in' },
          { icon: RotateCw, action: () => setRotate(r => r + 90), title: 'Rotate' },
        ].map(({ icon: Icon, action, title }) => (
          <button key={title} onClick={action} title={title}
            className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all">
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <span className="text-[9px] font-mono text-white/30 ml-2">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="overflow-auto rounded-xl border border-white/[0.06] bg-black/30 max-h-[60vh] w-full flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={fileName || 'Document preview'}
          style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 0.2s ease', transformOrigin: 'center' }}
          className="max-w-full h-auto object-contain"
        />
      </div>
    </div>
  );
}

function PDFRenderer({ src, fileName }: { src: string; fileName?: string }) {
  return (
    <div className="w-full">
      <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/20" style={{ height: '65vh' }}>
        <iframe
          src={`${src}#toolbar=1&navpanes=0`}
          className="w-full h-full"
          title={fileName || 'PDF Document'}
        />
      </div>
      <p className="text-[9px] text-white/20 font-mono text-center mt-2">
        PDF rendered natively — use browser controls to navigate pages
      </p>
    </div>
  );
}

function TextRenderer({ content }: { content: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-5 max-h-[60vh] overflow-auto">
      <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words leading-relaxed">{content}</pre>
    </div>
  );
}

function EncryptedPlaceholder({ fileName }: { fileName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Lock className="w-9 h-9 text-amber-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#7c5cfc] border-2 border-black flex items-center justify-center">
          <Shield className="w-3 h-3 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">AES-256-GCM Encrypted</h3>
      <p className="text-xs text-white/40 max-w-xs leading-relaxed font-mono">
        {fileName || 'This document'} is encrypted at rest. Decryption requires server-side authentication.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 text-[9px] font-mono">
        {['SHA-256 Hash', 'AES-256-GCM', 'Zero-Knowledge'].map(label => (
          <div key={label} className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/30">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnsupportedPlaceholder({ mimeType, fileName }: { mimeType?: string; fileName?: string }) {
  const ext = fileName?.split('.').pop()?.toUpperCase() || mimeType?.split('/').pop()?.toUpperCase() || '???';
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
        <File className="w-9 h-9 text-white/30" />
      </div>
      <div className="text-[10px] font-mono text-white/20 mb-2 uppercase tracking-widest">.{ext} File</div>
      <h3 className="text-sm text-white/60 mb-1">Preview not available</h3>
      <p className="text-xs text-white/30 max-w-xs">
        This file type ({mimeType || 'unknown'}) cannot be rendered inline. Download to view.
      </p>
    </div>
  );
}

export default function FileRenderer({
  fileUrl,
  localFile,
  mimeType: mimeTypeProp,
  fileName: fileNameProp,
  isEncrypted = false,
  allowDownload = true,
  onClose,
  compact = false,
}: FileRendererProps) {
  const [mode, setMode] = useState<RenderMode>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const mimeType = mimeTypeProp || localFile?.type;
  const fileName = fileNameProp || localFile?.name;

  useEffect(() => {
    let url: string | null = null;

    const load = async () => {
      const resolvedMode = detectRenderMode(mimeType, isEncrypted);
      if (resolvedMode === 'encrypted' || resolvedMode === 'unsupported') {
        setMode(resolvedMode);
        return;
      }

      try {
        let blob: Blob | null = null;
        if (localFile) {
          blob = localFile;
        } else if (fileUrl) {
          const res = await fetch(fileUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          blob = await res.blob();
        }

        if (!blob) { setMode('unsupported'); return; }

        if (resolvedMode === 'text') {
          const text = await blob.text();
          setTextContent(text);
          setMode('text');
        } else {
          url = URL.createObjectURL(blob);
          setObjectUrl(url);
          setMode(resolvedMode);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load file');
        setMode('error');
      }
    };

    load();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [fileUrl, localFile, mimeType, isEncrypted]);

  const handleDownload = () => {
    const href = objectUrl || fileUrl;
    if (!href) return;
    const a = document.createElement('a');
    a.href = href; a.download = fileName || 'document'; a.click();
  };

  const renderContent = () => {
    switch (mode) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-2 border-[#7c5cfc]/30 rounded-full animate-spin border-t-[#7c5cfc]" />
              <FileText className="w-5 h-5 text-[#7c5cfc] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-xs text-white/40 font-mono">Loading document...</p>
          </div>
        );
      case 'image': return <ImageRenderer src={objectUrl!} fileName={fileName} />;
      case 'pdf': return <PDFRenderer src={objectUrl!} fileName={fileName} />;
      case 'text': return <TextRenderer content={textContent!} />;
      case 'encrypted': return <EncryptedPlaceholder fileName={fileName} />;
      case 'unsupported': return <UnsupportedPlaceholder mimeType={mimeType} fileName={fileName} />;
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
            <h3 className="text-sm text-red-300 mb-1">Failed to load file</h3>
            <p className="text-xs text-white/30">{loadError}</p>
          </div>
        );
    }
  };

  if (compact) return <div className="space-y-4">{renderContent()}</div>;

  return (
    <AnimatePresence>
      {fullscreen ? (
        <motion.div key="fs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-2xl flex flex-col">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#7c5cfc]" />
              <span className="text-sm text-white/80 font-mono">{fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              {allowDownload && (objectUrl || fileUrl) && !isEncrypted && (
                <button onClick={handleDownload} className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setFullscreen(false)} className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white transition-all">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
        </motion.div>
      ) : (
        <motion.div key="normal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 flex items-center justify-center">
                  {mode === 'image' ? <ImageIcon className="w-4 h-4 text-[#7c5cfc]" /> :
                   mode === 'encrypted' ? <Lock className="w-4 h-4 text-amber-400" /> :
                   <FileText className="w-4 h-4 text-[#7c5cfc]" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-xs">{fileName || 'Document'}</p>
                  <p className="text-[9px] text-white/30 font-mono uppercase tracking-wider">{mimeType || 'unknown type'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {allowDownload && (objectUrl || fileUrl) && !isEncrypted && (
                  <button onClick={handleDownload} title="Download"
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setFullscreen(true)} title="Fullscreen"
                  className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all">
                  <Maximize2 className="w-4 h-4" />
                </button>
                {onClose && (
                  <button onClick={onClose} title="Close"
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {renderContent()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
