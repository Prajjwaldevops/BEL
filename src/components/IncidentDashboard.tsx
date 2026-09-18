/**
 * Incident Response Dashboard Component
 * Displays and manages security incidents
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  AlertCircle,
  Eye,
  Target,
  FileText,
} from 'lucide-react';

interface SecurityIncident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  category?: string;
  detectedAt: string;
  respondedAt?: string;
  assignedTo?: string;
}

export function IncidentDashboard() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    loadIncidents();
    loadStatistics();
  }, []);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents/list?status=OPEN&status=INVESTIGATING');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await fetch('/api/incidents/statistics');
      if (res.ok) {
        const data = await res.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedIncident || !newStatus) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: statusNote,
        }),
      });

      if (res.ok) {
        alert('Status updated successfully');
        setUpdateDialogOpen(false);
        setStatusNote('');
        setNewStatus('');
        setSelectedIncident(null);
        loadIncidents();
      } else {
        const error = await res.json();
        alert(`Failed to update: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      alert('Failed to update incident');
    } finally {
      setIsUpdating(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      LOW: { color: 'bg-gray-500', icon: Shield },
      MEDIUM: { color: 'bg-yellow-500', icon: AlertCircle },
      HIGH: { color: 'bg-orange-500', icon: AlertTriangle },
      CRITICAL: { color: 'bg-red-600', icon: AlertTriangle },
    };

    const variant = variants[severity] || variants.MEDIUM;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      OPEN: { color: 'bg-blue-500', icon: AlertCircle },
      INVESTIGATING: { color: 'bg-purple-500', icon: Eye },
      CONTAINED: { color: 'bg-orange-500', icon: Shield },
      RESOLVED: { color: 'bg-green-500', icon: CheckCircle2 },
      CLOSED: { color: 'bg-gray-500', icon: CheckCircle2 },
      FALSE_POSITIVE: { color: 'bg-gray-400', icon: Target },
    };

    const variant = variants[status] || variants.OPEN;
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getResponseTime = (incident: SecurityIncident) => {
    if (!incident.respondedAt) return 'Not responded';

    const detected = new Date(incident.detectedAt).getTime();
    const responded = new Date(incident.respondedAt).getTime();
    const hours = Math.floor((responded - detected) / 3600000);
    const minutes = Math.floor(((responded - detected) % 3600000) / 60000);

    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading incidents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Critical</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statistics.bySeverity?.CRITICAL || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.avgResponseTime.toFixed(1)}h
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.avgResolutionTime.toFixed(1)}h
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active Security Incidents
          </CardTitle>
          <CardDescription>
            Open and investigating incidents requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No active incidents</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Detected</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono text-sm">
                        {incident.incidentNumber}
                      </TableCell>
                      <TableCell>{getSeverityBadge(incident.severity)}</TableCell>
                      <TableCell>{getStatusBadge(incident.status)}</TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate font-medium">{incident.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {incident.category || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(incident.detectedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getResponseTime(incident)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setDetailsDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedIncident(incident);
                              setUpdateDialogOpen(true);
                            }}
                          >
                            Update
                          </Button>
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

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Incident Status</DialogTitle>
            <DialogDescription>
              {selectedIncident?.incidentNumber}: {selectedIncident?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="CONTAINED">Contained</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                  <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-note">Note</Label>
              <Textarea
                id="status-note"
                placeholder="Add a note about this status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={isUpdating || !newStatus}>
              {isUpdating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
