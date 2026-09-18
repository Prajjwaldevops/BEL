/**
 * Approval Dashboard Component
 * Displays pending approvals and allows admins to vote
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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Shield,
  Users,
  Play,
  Ban
} from 'lucide-react';

interface PendingApproval {
  id: string;
  actionType: string;
  actionDescription: string;
  payload: any;
  requestedBy: string;
  requiredApprovals: number;
  approvalCount: number;
  rejectionCount: number;
  abstainCount: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface ApprovalVote {
  id: string;
  approverId: string;
  vote: string;
  reason?: string;
  createdAt: string;
  approver?: {
    full_name: string;
    email: string;
    role: string;
  };
}

export function ApprovalDashboard() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [votes, setVotes] = useState<ApprovalVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [voteReason, setVoteReason] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [selectedVoteType, setSelectedVoteType] = useState<'APPROVE' | 'REJECT' | null>(null);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals/list?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovalDetails = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedApproval(data.approval);
        setVotes(data.votes || []);
      }
    } catch (error) {
      console.error('Error loading approval details:', error);
    }
  };

  const handleVote = async (voteType: 'APPROVE' | 'REJECT') => {
    setSelectedVoteType(voteType);
    setVoteDialogOpen(true);
  };

  const submitVote = async () => {
    if (!selectedApproval || !selectedVoteType) return;

    setIsVoting(true);
    try {
      const res = await fetch('/api/approvals/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: selectedApproval.id,
          vote: selectedVoteType,
          reason: voteReason,
        }),
      });

      if (res.ok) {
        alert(`Vote ${selectedVoteType.toLowerCase()}d successfully`);
        setVoteDialogOpen(false);
        setVoteReason('');
        setSelectedApproval(null);
        loadApprovals();
      } else {
        const error = await res.json();
        alert(`Failed to vote: ${error.message}`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote');
    } finally {
      setIsVoting(false);
    }
  };

  const handleExecute = async (approval: PendingApproval) => {
    if (!confirm('Are you sure you want to execute this approved action?')) {
      return;
    }

    try {
      const res = await fetch('/api/approvals/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: approval.id }),
      });

      if (res.ok) {
        alert('Approval executed successfully');
        loadApprovals();
      } else {
        const error = await res.json();
        alert(`Failed to execute: ${error.message}`);
      }
    } catch (error) {
      console.error('Error executing approval:', error);
      alert('Failed to execute approval');
    }
  };

  const getStatusBadge = (approval: PendingApproval) => {
    const progress = approval.requiredApprovals > 0
      ? (approval.approvalCount / approval.requiredApprovals) * 100
      : 0;

    if (approval.status === 'APPROVED') {
      return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    }
    if (approval.status === 'REJECTED') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    if (approval.status === 'EXPIRED') {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    if (approval.status === 'EXECUTED') {
      return <Badge className="bg-blue-600"><Play className="w-3 h-3 mr-1" />Executed</Badge>;
    }

    return (
      <Badge variant="secondary">
        <Users className="w-3 h-3 mr-1" />
        {approval.approvalCount}/{approval.requiredApprovals}
      </Badge>
    );
  };

  const getActionTypeColor = (actionType: string) => {
    const colors: Record<string, string> = {
      ROLE_ESCALATION: 'text-purple-600',
      HIGH_VALUE_TRANSFER: 'text-orange-600',
      NFT_BURN: 'text-red-600',
      CONTRACT_PAUSE: 'text-red-700',
      GUARDIAN_OVERRIDE: 'text-yellow-600',
      EMERGENCY_ACTION: 'text-red-800',
      SYSTEM_CONFIG_CHANGE: 'text-blue-600',
    };
    return colors[actionType] || 'text-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Multi-Signature Approvals
          </CardTitle>
          <CardDescription>
            Pending approval requests requiring admin votes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell>{getStatusBadge(approval)}</TableCell>
                      <TableCell>
                        <div className={`font-medium ${getActionTypeColor(approval.actionType)}`}>
                          {approval.actionType.replace(/_/g, ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{approval.actionDescription}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(approval.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(approval.expiresAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApproval(approval);
                              loadApprovalDetails(approval.id);
                            }}
                          >
                            View
                          </Button>
                          {approval.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  handleVote('APPROVE');
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  handleVote('REJECT');
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {approval.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleExecute(approval)}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Execute
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVoteType === 'APPROVE' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.actionDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vote-reason">Reason (Optional)</Label>
              <Textarea
                id="vote-reason"
                placeholder="Explain your decision..."
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                rows={3}
              />
            </div>
            {selectedApproval && (
              <div className="text-sm text-muted-foreground">
                <p>Action: {selectedApproval.actionType.replace(/_/g, ' ')}</p>
                <p>Current votes: {selectedApproval.approvalCount}/{selectedApproval.requiredApprovals}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVoteDialogOpen(false)}
              disabled={isVoting}
            >
              Cancel
            </Button>
            <Button
              onClick={submitVote}
              disabled={isVoting}
              variant={selectedVoteType === 'APPROVE' ? 'default' : 'destructive'}
            >
              {isVoting ? 'Submitting...' : `${selectedVoteType === 'APPROVE' ? 'Approve' : 'Reject'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
