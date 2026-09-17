// ===== MOCK BLOCKCHAIN SERVICE =====
// Used in hackathon demo mode to simulate blockchain interactions

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function generateMockTxHash(): string {
  const hex = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += hex.charAt(Math.floor(Math.random() * 16));
  }
  return hash;
}

function generateMockAddress(): string {
  const hex = '0123456789abcdef';
  let addr = '0x';
  for (let i = 0; i < 40; i++) {
    addr += hex.charAt(Math.floor(Math.random() * 16));
  }
  return addr;
}

export interface MockTransaction {
  hash: string;
  from: string;
  to: string;
  blockNumber: number;
  gasUsed: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
}

export interface MockBlock {
  number: number;
  hash: string;
  timestamp: string;
  transactions: number;
  gasUsed: string;
}

let mockBlockNumber = 1000;
const mockTransactions: MockTransaction[] = [];

export async function sendTransaction(
  method: string,
  params: unknown[]
): Promise<MockTransaction> {
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));

  if (DEMO_MODE) {
    mockBlockNumber++;
    const tx: MockTransaction = {
      hash: generateMockTxHash(),
      from: generateMockAddress(),
      to: generateMockAddress(),
      blockNumber: mockBlockNumber,
      gasUsed: (21000 + Math.floor(Math.random() * 50000)).toString(),
      status: 'success',
      timestamp: new Date().toISOString(),
    };
    mockTransactions.push(tx);
    return tx;
  }

  throw new Error('Real blockchain not configured. Set NEXT_PUBLIC_DEMO_MODE=true for mock mode.');
}

export async function getLatestBlock(): Promise<MockBlock> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  if (DEMO_MODE) {
    return {
      number: mockBlockNumber,
      hash: generateMockTxHash(),
      timestamp: new Date().toISOString(),
      transactions: Math.floor(Math.random() * 10),
      gasUsed: (Math.floor(Math.random() * 1000000)).toString(),
    };
  }

  throw new Error('Real blockchain not configured.');
}

export async function getTransactionHistory(limit: number = 10): Promise<MockTransaction[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  if (DEMO_MODE) {
    // Generate some mock history if empty
    if (mockTransactions.length === 0) {
      for (let i = 0; i < 20; i++) {
        mockTransactions.push({
          hash: generateMockTxHash(),
          from: generateMockAddress(),
          to: generateMockAddress(),
          blockNumber: mockBlockNumber - 20 + i,
          gasUsed: (21000 + Math.floor(Math.random() * 50000)).toString(),
          status: Math.random() > 0.1 ? 'success' : 'pending',
          timestamp: new Date(Date.now() - i * 60000 * 5).toISOString(),
        });
      }
    }
    return mockTransactions.slice(-limit).reverse();
  }

  throw new Error('Real blockchain not configured.');
}

export async function callContract(
  contractAddress: string,
  method: string,
  params: unknown[]
): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));

  if (DEMO_MODE) {
    // Return mock data based on method name
    switch (method) {
      case 'balanceOf':
        return Math.floor(Math.random() * 10);
      case 'ownerOf':
        return generateMockAddress();
      case 'tokenURI':
        return `ipfs://QmMock${Math.random().toString(36).substring(2, 10)}`;
      case 'hasRole':
        return true;
      case 'getRoleAdmin':
        return '0x0000000000000000000000000000000000000000000000000000000000000000';
      default:
        return null;
    }
  }

  throw new Error('Real blockchain not configured.');
}

export function isBlockchainConfigured(): boolean {
  if (DEMO_MODE) return true;
  return !!(process.env.NEXT_PUBLIC_RPC_URL && process.env.NEXT_PUBLIC_CHAIN_ID);
}

export function getChainInfo() {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337'),
    name: 'Hardhat Local',
    isDemo: DEMO_MODE,
  };
}
