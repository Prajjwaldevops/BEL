/**
 * BEL SENTINEL — Document NFT Minting Service (Server-Side)
 *
 * Handles minting DocumentNFT tokens using the admin/minter wallet.
 * The NFT is minted TO the user's verified wallet address.
 *
 * SECURITY:
 * - Admin private key is NEVER exposed to the frontend.
 * - Minting uses MINTER_ROLE on the smart contract.
 * - NFT ownership is assigned to the user's wallet, NOT the admin wallet.
 * - All results come from real blockchain receipts — no faking.
 */

import { ethers, Contract, JsonRpcProvider } from 'ethers';
import { DOCUMENT_NFT_ABI, getDocumentNFTAddress, getChainId, getNetworkName } from '@/lib/contracts/document-nft';
import { getAdminWallet } from '@/lib/admin-wallet';
import type { MintResult, DocumentNFTMetadata } from '@/lib/types/document';

// ===== Types =====

export interface MintDocumentParams {
  /** Recipient wallet address (user's verified wallet) */
  recipientWallet: string;
  /** SHA-256 content hash (0x-prefixed, 32 bytes) */
  contentHash: string;
  /** SHA-256 metadata hash (0x-prefixed, 32 bytes) */
  metadataHash: string;
  /** Token URI (IPFS or hosted URL for NFT metadata JSON) */
  tokenURI: string;
  /** Whether the NFT can be transferred after minting */
  transferable: boolean;
  /** Unix timestamp for expiry (0 = no expiry) */
  expiresAt: number;
}

export interface NFTVerificationResult {
  exists: boolean;
  owner: string | null;
  contentHash: string | null;
  metadataHash: string | null;
  isValid: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  issuedAt: number | null;
  expiresAt: number | null;
  transferable: boolean;
  tokenURI: string | null;
}

// ===== Helpers =====

function getProvider(): JsonRpcProvider {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
  return new JsonRpcProvider(rpcUrl);
}

function getReadOnlyContract(): Contract {
  const provider = getProvider();
  const address = getDocumentNFTAddress();
  return new Contract(address, DOCUMENT_NFT_ABI, provider);
}

async function getSignerContract(): Promise<Contract> {
  const provider = getProvider();
  const signer = await getAdminWallet(provider);
  const address = getDocumentNFTAddress();
  return new Contract(address, DOCUMENT_NFT_ABI, signer);
}

// ===== Mint =====

/**
 * Mint a Document NFT to the user's wallet address.
 *
 * The admin wallet executes the transaction (MINTER_ROLE),
 * but the NFT is owned by `params.recipientWallet`.
 *
 * Returns real blockchain receipt data — NEVER fakes results.
 */
export async function mintDocumentNFT(params: MintDocumentParams): Promise<MintResult> {
  const { recipientWallet, contentHash, metadataHash, tokenURI, transferable, expiresAt } = params;

  // Validate inputs
  if (!ethers.isAddress(recipientWallet)) {
    throw new Error(`Invalid recipient wallet address: ${recipientWallet}`);
  }
  if (!contentHash || !contentHash.startsWith('0x') || contentHash.length !== 66) {
    throw new Error(`Invalid content hash: ${contentHash}`);
  }
  if (!metadataHash || !metadataHash.startsWith('0x') || metadataHash.length !== 66) {
    throw new Error(`Invalid metadata hash: ${metadataHash}`);
  }
  if (!tokenURI || tokenURI.length === 0) {
    throw new Error('Token URI is required');
  }

  const contract = await getSignerContract();

  // Execute mint transaction
  const tx = await contract.mintDocument(
    recipientWallet,
    tokenURI,
    contentHash,
    metadataHash,
    transferable,
    expiresAt
  );

  // Wait for confirmation
  const receipt = await tx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`Mint transaction failed. TX: ${tx.hash}`);
  }

  // Parse DocumentMinted event to get the token ID
  let tokenId: string | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed && parsed.name === 'DocumentMinted') {
        tokenId = parsed.args.tokenId.toString();
        break;
      }
    } catch {
      // Not our event, skip
    }
  }

  if (!tokenId) {
    throw new Error(`Mint transaction confirmed but could not parse token ID. TX: ${tx.hash}`);
  }

  const gasUsed = receipt.gasUsed.toString();
  const gasPrice = receipt.gasPrice?.toString() || '0';
  const gasCostWei = (receipt.gasUsed * (receipt.gasPrice || BigInt(0))).toString();
  const gasCostEth = ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || BigInt(0)));

  return {
    success: true,
    tokenId,
    contractAddress: await contract.getAddress(),
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    chainId: getChainId(),
    owner: recipientWallet,
    gasUsed,
    gasPrice,
    gasCostWei,
    gasCostEth,
  };
}

// ===== Read Operations =====

/**
 * Read on-chain document data for a given token ID.
 */
export async function getDocumentOnChain(tokenId: number | string): Promise<NFTVerificationResult> {
  const contract = getReadOnlyContract();

  try {
    const doc = await contract.getDocument(tokenId);
    const owner = await contract.ownerOf(tokenId);
    const isValid = await contract.isDocumentValid(tokenId);
    const uri = await contract.tokenURI(tokenId);

    const isExpired = doc.expiresAt > BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) > doc.expiresAt;

    return {
      exists: true,
      owner,
      contentHash: doc.contentHash,
      metadataHash: doc.metadataHash,
      isValid,
      isRevoked: doc.revoked,
      isExpired,
      issuedAt: Number(doc.issuedAt),
      expiresAt: Number(doc.expiresAt),
      transferable: doc.transferable,
      tokenURI: uri,
    };
  } catch {
    return {
      exists: false,
      owner: null,
      contentHash: null,
      metadataHash: null,
      isValid: false,
      isRevoked: false,
      isExpired: false,
      issuedAt: null,
      expiresAt: null,
      transferable: false,
      tokenURI: null,
    };
  }
}

/**
 * Verify a document hash against on-chain data.
 */
export async function verifyDocumentOnChain(
  tokenId: number | string,
  contentHash: string
): Promise<{ hashMatch: boolean; documentValid: boolean }> {
  const contract = getReadOnlyContract();

  try {
    const [hashMatch, documentValid] = await contract.verifyDocument(tokenId, contentHash);
    return { hashMatch, documentValid };
  } catch {
    return { hashMatch: false, documentValid: false };
  }
}

/**
 * Look up token ID by content hash.
 */
export async function getTokenByContentHash(contentHash: string): Promise<number | null> {
  const contract = getReadOnlyContract();

  try {
    const tokenId = await contract.getTokenByHash(contentHash);
    return Number(tokenId);
  } catch {
    return null;
  }
}

/**
 * Get the on-chain owner of a token.
 */
export async function getOwnerOf(tokenId: number | string): Promise<string | null> {
  const contract = getReadOnlyContract();

  try {
    return await contract.ownerOf(tokenId);
  } catch {
    return null;
  }
}

/**
 * Check if the blockchain RPC is reachable and the contract is deployed.
 */
export async function checkBlockchainHealth(): Promise<{
  rpcConnected: boolean;
  contractDeployed: boolean;
  network: string;
  chainId: number;
  latestBlock: number | null;
  contractAddress: string;
}> {
  const provider = getProvider();
  const contractAddress = getDocumentNFTAddress();
  const chainId = getChainId();

  try {
    const blockNumber = await provider.getBlockNumber();
    const code = await provider.getCode(contractAddress);
    const contractDeployed = code !== '0x';

    return {
      rpcConnected: true,
      contractDeployed,
      network: getNetworkName(chainId),
      chainId,
      latestBlock: blockNumber,
      contractAddress,
    };
  } catch {
    return {
      rpcConnected: false,
      contractDeployed: false,
      network: getNetworkName(chainId),
      chainId,
      latestBlock: null,
      contractAddress,
    };
  }
}
