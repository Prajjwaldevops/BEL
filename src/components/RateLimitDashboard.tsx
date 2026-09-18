/**
 * Rate Limit Dashboard Component
 * Admin interface for managing progressive account lockout
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Shield, ShieldAlert, ShieldCheck, Clock, User, AlertTriangle } from 'lucide-react';

interface LoginAttempt {
  id: string;
  username?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failureReason?: string;
  lockoutUntil?: string;
  requiresCaptcha: boolean;
  createdAt: string;
}

interface RateLimitConfig {
  id: string;
  name: string;
  maxAttemptsTier1: number;
  maxAttemptsTier2: number;
  maxAttemptsTier3: number;
  lockoutDurationTier2Minutes: number;
  lockoutDurationTier3Minutes: number;
  windowMinutes: number;
  requiresAdminUnlock: boolean;
  isActive: boolean;
}

export function RateLimitDashboard() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [config, setConfig] = useState<RateLimitConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [unlockUsername, setUnlockUsername] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load configuration
      const configRes = await fetch('/api/rate-limit/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      // Load recent attempts
      const attemptsRes = await fetch('/api/rate-limit/attempts?limit=100');
      if (attemptsRes.ok) {
        const attemptsData = await attemptsRes.json();
        setAttempts(attemptsData.attempts || []);
      }
    } catch (error) {
      console.error('Error loading rate limit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      loadData();
      return;
    }

    try {
      const res = await fetch(`/api/rate-limit/attempts?username=${encodeURIComponent(searchUsername)}`);
      if (res.ok) {
        const data = await res.json();
        setAttempts(data.attempts || []);
      }
    } catch (error) {
      console.error('Error searching attempts:', error);
    }
  };

  const handleUnlock = async () => {
    if (!unlockUsername.trim() || !unlockReason.trim()) {
      alert('Please provide both username and reason');
      return;
    }

    setIsUnlocking(true);
    try {
      const res = await fetch('/api/rate-limit/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: unlockUsername,
          reason: unlockReason,
        }),
      });

      if (res.ok) {
        alert('Account unlocked successfully');
        setUnlockDialogOpen(false);
        setUnlockUsername('');
        setUnlockReason('');
        loadData();
      } else {
        const error = await res.json();
        alert(`Failed to unlock: ${error.message}`);
      }
    } catch (error) {
      console.error('Error unlocking account:', error);
      alert('Failed to unlock account');
    } finally {
      setIsUnlocking(false);
    }
  };

  const getTierBadge = (attempt: LoginAttempt) => {
    if (attempt.success) {
      return <Badge variant="outline" className="bg-green-50"><ShieldCheck className="w-3 h-3 mr-1" />Success</Badge>;
    }
    if (attempt.lockoutUntil) {
      const isStillLocked = new Date(attempt.lockoutUntil) > new Date();
      if (isStillLocked) {
        return <Badge variant="destructive"><ShieldAlert className="w-3 h-3 mr-1" />Locked</Badge>;
      }
    }
    if (attempt.requiresCaptcha) {
      return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50">Failed</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatLockoutTime = (lockoutUntil?: string) => {
    if (!lockoutUntil) return 'N/A';
    
    const lockout = new Date(lockoutUntil);
    const now = new Date();
    
    if (lockout <= now) return 'Expired';
    
    const diffMs = lockout.getTime() - now.getTime();
    const minutes = Math.ceil(diffMs / 60000);
    
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rate Limiting Configuration
          </CardTitle>
          <CardDescription>
            Progressive lockout thresholds and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Tier 1 (Warning)</Label>
                <p className="text-2xl font-bold">{config.maxAttemptsTier1}</p>
                <p className="text-xs text-muted-foreground">failed attempts</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Tier 2 (Short Lock)</Label>
                <p className="text-2xl font-bold">{config.maxAttemptsTier2}</p>
                <p className="text-xs text-muted-foreground">{config.lockoutDurationTier2Minutes}min lockout</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Tier 3 (Long Lock)</Label>
                <p className="text-2xl font-bold">{config.maxAttemptsTier3}</p>
                <p className="text-xs text-muted-foreground">{config.lockoutDurationTier3Minutes}min lockout</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Time Window</Label>
                <p className="text-2xl font-bold">{config.windowMinutes}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No active configuration found</p>
          )}
        </CardContent>
      </Card>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Login Attempts Monitor</CardTitle>
          <CardDescription>
            View and manage login attempts and account lockouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
            <Button variant="outline" onClick={loadData}>Refresh</Button>
            
            <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <User className="w-4 h-4 mr-2" />
                  Unlock Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Unlock Account</DialogTitle>
                  <DialogDescription>
                    Manually unlock a locked account. This will clear all active lockouts for the specified username.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="unlock-username">Username</Label>
                    <Input
                      id="unlock-username"
                      placeholder="Enter username"
                      value={unlockUsername}
                      onChange={(e) => setUnlockUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unlock-reason">Reason</Label>
                    <Textarea
                      id="unlock-reason"
                      placeholder="Explain why you're unlocking this account..."
                      value={unlockReason}
                      onChange={(e) => setUnlockReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setUnlockDialogOpen(false)}
                    disabled={isUnlocking}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUnlock} disabled={isUnlocking}>
                    {isUnlocking ? 'Unlocking...' : 'Unlock Account'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Attempts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Lockout Until</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No login attempts found
                    </TableCell>
                  </TableRow>
                ) : (
                  attempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{getTierBadge(attempt)}</TableCell>
                      <TableCell className="font-medium">
                        {attempt.username || attempt.email || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {attempt.ipAddress}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(attempt.createdAt)}
                      </TableCell>
                      <TableCell>
                        {attempt.lockoutUntil && new Date(attempt.lockoutUntil) > new Date() ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="w-3 h-3" />
                            {formatLockoutTime(attempt.lockoutUntil)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {attempt.failureReason || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
