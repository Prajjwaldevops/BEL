import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, polygonAmoy, optimism, optimismSepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Define local Hardhat chain
export const hardhat = {
  id: 31337,
  name: 'Hardhat Local',
  network: 'hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const

// Get active chain from environment
const getActiveChain = () => {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || '31337'
  
  switch (chainId) {
    case '1': return mainnet
    case '11155111': return sepolia
    case '137': return polygon
    case '80002': return polygonAmoy
    case '10': return optimism
    case '11155420': return optimismSepolia
    case '31337': 
    default: return hardhat
  }
}

// WalletConnect project ID - get from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

export const config = createConfig({
  chains: [hardhat, sepolia, polygon, polygonAmoy, optimism, optimismSepolia],
  connectors: [
    injected({ 
      target: 'metaMask',
      shimDisconnect: true,
    }),
    walletConnect({ 
      projectId,
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'BEL Secure Platform',
      darkMode: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [optimism.id]: http(),
    [optimismSepolia.id]: http(),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
})

// Contract addresses (from deployment or environment)
export const CONTRACTS = {
  IdentityNFT: (process.env.NEXT_PUBLIC_IDENTITY_NFT_ADDRESS || '') as `0x${string}`,
  AssetNFT: (process.env.NEXT_PUBLIC_ASSET_NFT_ADDRESS || '') as `0x${string}`,
  AuditRegistry: (process.env.NEXT_PUBLIC_AUDIT_REGISTRY_ADDRESS || '') as `0x${string}`,
  RoleManager: (process.env.NEXT_PUBLIC_ROLE_MANAGER_ADDRESS || '') as `0x${string}`,
} as const

// Active chain configuration
export const activeChain = getActiveChain()
