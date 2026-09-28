/**
 * BEL SENTINEL — DocumentNFT Contract Interaction Layer
 * 
 * Provides typed helpers for reading/writing to the DocumentNFT contract.
 * Works with Wagmi/Viem on the frontend and ethers.js on the server.
 */

// Minimal ABI — only the functions we actually call
export const DOCUMENT_NFT_ABI = [
  // Read functions
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "documents",
    outputs: [
      { name: "contentHash", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
      { name: "issuer", type: "address" },
      { name: "issuedAt", type: "uint64" },
      { name: "expiresAt", type: "uint64" },
      { name: "revoked", type: "bool" },
      { name: "transferable", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getDocument",
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "contentHash", type: "bytes32" },
          { name: "metadataHash", type: "bytes32" },
          { name: "issuer", type: "address" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "revoked", type: "bool" },
          { name: "transferable", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getDocumentOwnerAndURI",
    outputs: [
      { name: "owner", type: "address" },
      { name: "uri", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "isDocumentValid",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "_contentHash", type: "bytes32" },
    ],
    name: "verifyDocument",
    outputs: [
      { name: "valid", type: "bool" },
      { name: "documentValid", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_contentHash", type: "bytes32" }],
    name: "getTokenByHash",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_contentHash", type: "bytes32" }],
    name: "hashToTokenId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalMinted",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "_tokenURI", type: "string" },
      { name: "_contentHash", type: "bytes32" },
      { name: "_metadataHash", type: "bytes32" },
      { name: "_transferable", type: "bool" },
      { name: "_expiresAt", type: "uint64" },
    ],
    name: "mintDocument",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    name: "revokeDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "issuer", type: "address" },
      { indexed: false, name: "contentHash", type: "bytes32" },
      { indexed: false, name: "metadataHash", type: "bytes32" },
      { indexed: false, name: "transferable", type: "bool" },
    ],
    name: "DocumentMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "revokedBy", type: "address" },
      { indexed: false, name: "reason", type: "string" },
    ],
    name: "DocumentRevoked",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
    ],
    name: "DocumentTransferred",
    type: "event",
  },
] as const;

/**
 * Get the DocumentNFT contract address from environment.
 */
export function getDocumentNFTAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS;
  if (!address) {
    throw new Error('NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS is not configured');
  }
  return address as `0x${string}`;
}

/**
 * Get the active chain ID.
 */
export function getChainId(): number {
  return parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '31337', 10);
}

/**
 * Get block explorer URL for a transaction hash.
 */
export function getExplorerTxUrl(txHash: string, chainId?: number): string | null {
  const chain = chainId || getChainId();
  switch (chain) {
    case 1:
      return `https://etherscan.io/tx/${txHash}`;
    case 11155111:
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    case 137:
      return `https://polygonscan.com/tx/${txHash}`;
    case 80002:
      return `https://amoy.polygonscan.com/tx/${txHash}`;
    case 10:
      return `https://optimistic.etherscan.io/tx/${txHash}`;
    case 11155420:
      return `https://sepolia-optimism.etherscan.io/tx/${txHash}`;
    default:
      return null;
  }
}

/**
 * Get network name from chain ID.
 */
export function getNetworkName(chainId?: number): string {
  const chain = chainId || getChainId();
  switch (chain) {
    case 1: return 'Ethereum Mainnet';
    case 11155111: return 'Sepolia Testnet';
    case 137: return 'Polygon';
    case 80002: return 'Polygon Amoy';
    case 10: return 'Optimism';
    case 11155420: return 'Optimism Sepolia';
    case 31337: return 'Hardhat Local';
    default: return `Chain ${chain}`;
  }
}
