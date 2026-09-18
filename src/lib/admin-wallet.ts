/**
 * Admin Wallet Management
 * 
 * Purpose: Backend-only wallet for system operations (contract deployment, batch anchoring)
 * Security: Uses KMS in production, encrypted file in dev
 * 
 * ⚠️ THIS WALLET SHOULD NEVER BE USED FOR USER-FACING TRANSACTIONS
 */

import { Wallet } from 'ethers'

export class AdminWalletManager {
  private wallet: Wallet | null = null

  /**
   * Initialize admin wallet from environment configuration
   * Production: Fetches from KMS
   * Development: Uses environment variable (for testing only)
   */
  async initialize(): Promise<Wallet> {
    if (this.wallet) {
      return this.wallet
    }

    // Check for KMS configuration first (production)
    if (process.env.AWS_KMS_KEY_ID) {
      this.wallet = await this.loadFromAWSKMS()
    } else if (process.env.AZURE_KEY_VAULT_URL) {
      this.wallet = await this.loadFromAzureKV()
    } else if (process.env.VAULT_ADDR) {
      this.wallet = await this.loadFromHashiCorpVault()
    } else if (process.env.ADMIN_WALLET_PRIVATE_KEY) {
      // Development only - should never be used in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'ADMIN_WALLET_PRIVATE_KEY should not be used in production. Use KMS instead.'
        )
      }
      console.warn('⚠️  Using ADMIN_WALLET_PRIVATE_KEY from environment (DEV MODE ONLY)')
      this.wallet = new Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY)
    } else {
      throw new Error(
        'Admin wallet not configured. Set AWS_KMS_KEY_ID, AZURE_KEY_VAULT_URL, VAULT_ADDR, or ADMIN_WALLET_PRIVATE_KEY (dev only)'
      )
    }

    return this.wallet
  }

  /**
   * Get wallet instance (must call initialize first)
   */
  getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('Admin wallet not initialized. Call initialize() first.')
    }
    return this.wallet
  }

  /**
   * Get wallet address without exposing private key
   */
  async getAddress(): Promise<string> {
    const wallet = await this.initialize()
    return wallet.address
  }

  /**
   * Load private key from AWS KMS
   */
  private async loadFromAWSKMS(): Promise<Wallet> {
    try {
      // AWS SDK imports (lazy load to avoid bundling in client)
      const { KMSClient, DecryptCommand } = await import('@aws-sdk/client-kms')
      
      const client = new KMSClient({ region: process.env.AWS_REGION || 'us-east-1' })
      
      // Encrypted private key stored in environment (Base64)
      const encryptedKey = process.env.ADMIN_WALLET_ENCRYPTED_KEY
      if (!encryptedKey) {
        throw new Error('ADMIN_WALLET_ENCRYPTED_KEY not set')
      }

      const command = new DecryptCommand({
        CiphertextBlob: Buffer.from(encryptedKey, 'base64'),
        KeyId: process.env.AWS_KMS_KEY_ID,
      })

      const response = await client.send(command)
      
      if (!response.Plaintext) {
        throw new Error('Failed to decrypt wallet key from KMS')
      }

      const privateKey = Buffer.from(response.Plaintext).toString('utf8')
      return new Wallet(privateKey)
    } catch (error) {
      console.error('Failed to load wallet from AWS KMS:', error)
      throw new Error('Admin wallet initialization failed (AWS KMS)')
    }
  }

  /**
   * Load private key from Azure Key Vault
   */
  private async loadFromAzureKV(): Promise<Wallet> {
    try {
      const { SecretClient } = await import('@azure/keyvault-secrets')
      const { DefaultAzureCredential } = await import('@azure/identity')

      const vaultUrl = process.env.AZURE_KEY_VAULT_URL!
      const credential = new DefaultAzureCredential()
      const client = new SecretClient(vaultUrl, credential)

      const secretName = process.env.AZURE_KEY_NAME || 'admin-wallet-key'
      const secret = await client.getSecret(secretName)

      if (!secret.value) {
        throw new Error('Secret value is empty')
      }

      return new Wallet(secret.value)
    } catch (error) {
      console.error('Failed to load wallet from Azure Key Vault:', error)
      throw new Error('Admin wallet initialization failed (Azure KV)')
    }
  }

  /**
   * Load private key from HashiCorp Vault
   */
  private async loadFromHashiCorpVault(): Promise<Wallet> {
    try {
      const vaultAddr = process.env.VAULT_ADDR!
      const vaultToken = process.env.VAULT_TOKEN
      const secretPath = process.env.VAULT_SECRET_PATH || 'secret/data/bel-secure/admin-wallet'

      const response = await fetch(`${vaultAddr}/v1/${secretPath}`, {
        headers: {
          'X-Vault-Token': vaultToken || '',
        },
      })

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.statusText}`)
      }

      const data = await response.json()
      const privateKey = data.data?.data?.private_key

      if (!privateKey) {
        throw new Error('Private key not found in Vault response')
      }

      return new Wallet(privateKey)
    } catch (error) {
      console.error('Failed to load wallet from HashiCorp Vault:', error)
      throw new Error('Admin wallet initialization failed (Vault)')
    }
  }

  /**
   * Validate that wallet is properly configured and has funds
   */
  async validateWallet(provider: any): Promise<{
    valid: boolean
    address: string
    balance: string
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      const wallet = await this.initialize()
      const connectedWallet = wallet.connect(provider)
      const balance = await connectedWallet.provider.getBalance(wallet.address)
      const balanceEth = Number(balance) / 1e18

      // Check if wallet has sufficient balance for operations
      if (balanceEth < 0.01) {
        issues.push(`Low balance: ${balanceEth} ETH (recommend at least 0.01 ETH)`)
      }

      return {
        valid: issues.length === 0,
        address: wallet.address,
        balance: `${balanceEth} ETH`,
        issues,
      }
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      return {
        valid: false,
        address: 'N/A',
        balance: 'N/A',
        issues,
      }
    }
  }
}

// Singleton instance
export const adminWalletManager = new AdminWalletManager()

/**
 * Helper to get connected admin wallet for contract interactions
 */
export async function getAdminWallet(provider: any) {
  const wallet = await adminWalletManager.initialize()
  return wallet.connect(provider)
}
