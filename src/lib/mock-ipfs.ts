// ===== MOCK IPFS / PINATA SERVICE =====
// Used in hackathon demo mode when real Pinata keys are unavailable

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function generateMockCID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let cid = 'Qm';
  for (let i = 0; i < 44; i++) {
    cid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return cid;
}

export interface IPFSUploadResult {
  success: boolean;
  cid: string;
  size: number;
  timestamp: string;
  gateway: string;
}

export interface IPFSPinResult {
  success: boolean;
  cid: string;
  status: 'pinned' | 'unpinned' | 'failed';
}

// Mock uploaded files storage
const mockPinnedFiles = new Map<string, { name: string; size: number; timestamp: string }>();

export async function uploadToIPFS(
  file: File | Blob | string,
  name?: string
): Promise<IPFSUploadResult> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));

  if (DEMO_MODE) {
    const cid = generateMockCID();
    const size = typeof file === 'string' ? file.length : (file as File).size || 1024;
    const timestamp = new Date().toISOString();
    const gateway = `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/'}${cid}`;

    mockPinnedFiles.set(cid, {
      name: name || 'uploaded-file',
      size,
      timestamp,
    });

    return { success: true, cid, size, timestamp, gateway };
  }

  // Real Pinata upload would go here
  throw new Error('Real Pinata upload not configured. Set NEXT_PUBLIC_DEMO_MODE=true for mock mode.');
}

export async function pinFile(cid: string): Promise<IPFSPinResult> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

  if (DEMO_MODE) {
    return { success: true, cid, status: 'pinned' };
  }

  throw new Error('Real Pinata pin not configured. Set NEXT_PUBLIC_DEMO_MODE=true for mock mode.');
}

export async function unpinFile(cid: string): Promise<IPFSPinResult> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

  if (DEMO_MODE) {
    mockPinnedFiles.delete(cid);
    return { success: true, cid, status: 'unpinned' };
  }

  throw new Error('Real Pinata unpin not configured.');
}

export async function getFileMetadata(cid: string) {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (DEMO_MODE) {
    const stored = mockPinnedFiles.get(cid);
    return {
      cid,
      name: stored?.name || 'unknown-file',
      size: stored?.size || Math.floor(Math.random() * 1024 * 100),
      timestamp: stored?.timestamp || new Date().toISOString(),
      pinned: mockPinnedFiles.has(cid),
    };
  }

  throw new Error('Real Pinata metadata not configured.');
}

export function getIPFSGatewayURL(cid: string): string {
  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
  return `${gateway}${cid}`;
}

export function isConfigured(): boolean {
  if (DEMO_MODE) return true;
  return !!(process.env.PINATA_API_KEY && process.env.PINATA_SECRET_KEY);
}
