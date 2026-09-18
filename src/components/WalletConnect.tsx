'use client'

import { useAccount, useConnect, useDisconnect, useEnsName } from 'wagmi'
import { Wallet, LogOut, AlertCircle } from 'lucide-react'

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { data: ensName } = useEnsName({ address })
  const { connect, connectors, error, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-green-400" />
          <span className="text-green-300">
            {ensName || formatAddress(address)}
          </span>
          {chain && (
            <span className="text-xs text-gray-400">
              ({chain.name})
            </span>
          )}
        </div>
        <button
          onClick={() => disconnect()}
          className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-red-400" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400 mb-2">
        Connect your wallet to continue
      </div>
      
      <div className="grid gap-2">
        {connectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="flex items-center gap-3 px-4 py-3 bg-blue-900/20 border border-blue-500/30 
                     hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 
                     disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">
              {connector.name}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-300">
            {error.message}
          </div>
        </div>
      )}
    </div>
  )
}
