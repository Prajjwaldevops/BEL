'use client'

import { useState, useEffect } from 'react'
import { Plus, Copy, Check, X, Clock, Mail, Shield } from 'lucide-react'

interface InviteToken {
  id: string
  token: string
  issued_by: string
  role_id?: string
  intended_email?: string
  intended_department?: string
  expires_at: string
  used_at?: string
  used_by?: string
  is_active: boolean
  created_at: string
}

interface InviteTokenManagerProps {
  currentUserId: string
  isAdmin: boolean
}

export function InviteTokenManager({ currentUserId, isAdmin }: InviteTokenManagerProps) {
  const [tokens, setTokens] = useState<InviteToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Form state
  const [intendedEmail, setIntendedEmail] = useState('')
  const [intendedDepartment, setIntendedDepartment] = useState('')
  const [expiresInHours, setExpiresInHours] = useState('168') // 7 days default

  useEffect(() => {
    if (isAdmin) {
      loadTokens()
    }
  }, [isAdmin])

  const loadTokens = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invite-tokens/list?activeOnly=false&limit=100')
      const data = await response.json()
      
      if (data.success) {
        setTokens(data.tokens)
      }
    } catch (error) {
      console.error('Error loading tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const createToken = async () => {
    if (!isAdmin) return

    try {
      setCreating(true)
      
      const response = await fetch('/api/invite-tokens/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuedBy: currentUserId,
          intendedEmail: intendedEmail || undefined,
          intendedDepartment: intendedDepartment || undefined,
          expiresInHours: parseInt(expiresInHours),
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Copy token to clipboard immediately
        await copyToClipboard(data.token.token)
        
        // Reset form
        setIntendedEmail('')
        setIntendedDepartment('')
        setExpiresInHours('168')
        
        // Reload list
        await loadTokens()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error creating token:', error)
      alert('Failed to create invite token')
    } finally {
      setCreating(false)
    }
  }

  const revokeToken = async (tokenId: string) => {
    if (!confirm('Are you sure you want to revoke this invite token?')) return

    try {
      const response = await fetch('/api/invite-tokens/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId,
          revokedBy: currentUserId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        await loadTokens()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error revoking token:', error)
      alert('Failed to revoke token')
    }
  }

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (!isAdmin) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-300">Only admins can manage invite tokens.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Token Form */}
      <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Invite Token
        </h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Intended Email (Optional)
            </label>
            <input
              type="email"
              value={intendedEmail}
              onChange={(e) => setIntendedEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white
                       focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Intended Department (Optional)
            </label>
            <input
              type="text"
              value={intendedDepartment}
              onChange={(e) => setIntendedDepartment(e.target.value)}
              placeholder="Engineering, HR, etc."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white
                       focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Expires In (Hours)
            </label>
            <select
              value={expiresInHours}
              onChange={(e) => setExpiresInHours(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white
                       focus:border-blue-500 focus:outline-none"
            >
              <option value="24">24 hours (1 day)</option>
              <option value="72">72 hours (3 days)</option>
              <option value="168">168 hours (7 days)</option>
              <option value="336">336 hours (14 days)</option>
              <option value="720">720 hours (30 days)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={createToken}
              disabled={creating}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center justify-center gap-2"
            >
              {creating ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Token
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">
          Invite Tokens
        </h3>

        {loading ? (
          <p className="text-gray-400">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p className="text-gray-400">No invite tokens created yet.</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className={`p-4 border rounded-lg ${
                  token.used_at
                    ? 'bg-gray-800/30 border-gray-700'
                    : isExpired(token.expires_at)
                    ? 'bg-orange-900/10 border-orange-500/30'
                    : 'bg-green-900/10 border-green-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Token String */}
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-xs text-blue-300 font-mono truncate">
                        {token.token}
                      </code>
                      <button
                        onClick={() => copyToClipboard(token.token)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                        title="Copy token"
                      >
                        {copiedToken === token.token ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Token Details */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      {token.intended_email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {token.intended_email}
                        </span>
                      )}
                      {token.intended_department && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          {token.intended_department}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {token.used_at ? (
                          <span className="text-gray-500">Used {formatDate(token.used_at)}</span>
                        ) : isExpired(token.expires_at) ? (
                          <span className="text-orange-400">Expired {formatDate(token.expires_at)}</span>
                        ) : (
                          <span>Expires {formatDate(token.expires_at)}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2">
                    {token.used_at ? (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        Used
                      </span>
                    ) : isExpired(token.expires_at) ? (
                      <span className="px-2 py-1 bg-orange-900/30 text-orange-400 text-xs rounded">
                        Expired
                      </span>
                    ) : token.is_active ? (
                      <>
                        <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                          Active
                        </span>
                        <button
                          onClick={() => revokeToken(token.id)}
                          className="p-1 hover:bg-red-900/30 rounded transition-colors"
                          title="Revoke token"
                        >
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    ) : (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
