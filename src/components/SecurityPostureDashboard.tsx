'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

export default function SecurityPostureDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, risksRes, alertsRes, complianceRes] = await Promise.all([
        fetch('/api/security-posture/metrics'),
        fetch('/api/security-posture/risks?summary=true'),
        fetch('/api/security-posture/alerts?status=NEW&limit=10'),
        fetch('/api/security-posture/compliance?framework=SOC2'),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics);
      }

      if (risksRes.ok) {
        const data = await risksRes.json();
        setRisks([data.summary]);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts);
      }

      if (complianceRes.ok) {
        const data = await complianceRes.json();
        setCompliance(data.requirements);
      }
    } catch (error) {
      console.error('Error loading security posture data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityBadge = (severity: string) => {
    const variants: any = {
      CRITICAL: 'destructive',
      HIGH: 'destructive',
      MEDIUM: 'default',
      LOW: 'secondary',
    };
    return <Badge variant={variants[severity] || 'secondary'}>{severity}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><p>Loading security posture...</p></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Posture Dashboard</h1>
          <p className="text-muted-foreground">Monitor your organization's security health</p>
        </div>
        <Button onClick={() => fetch('/api/security-posture/metrics', { method: 'POST' })}>
          Refresh Metrics
        </Button>
      </div>

      {metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${getScoreColor(metrics.security_score)}`}>
                  {metrics.security_score}
                </div>
                <Progress value={metrics.security_score} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  {metrics.score_trend === 'IMPROVING' && <TrendingUp className="h-3 w-3 text-green-600" />}
                  {metrics.score_trend === 'DECLINING' && <TrendingDown className="h-3 w-3 text-red-600" />}
                  {metrics.score_trend}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Active Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.critical_risks + metrics.high_risks}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {metrics.critical_risks} Critical, {metrics.high_risks} High
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Open Incidents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.open_incidents}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {metrics.critical_incidents} Critical
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getScoreColor(metrics.compliance_score)}`}>
                  {metrics.compliance_score}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">SOC2 Compliance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="text-sm font-medium">
                    {((metrics.successful_logins_24h / (metrics.successful_logins_24h + metrics.failed_login_attempts_24h)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Failed Attempts (24h)</span>
                  <span className="text-sm font-medium">{metrics.failed_login_attempts_24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Locked Accounts</span>
                  <span className="text-sm font-medium">{metrics.locked_accounts}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">User Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Users</span>
                  <span className="text-sm font-medium">{metrics.total_users}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Active (24h)</span>
                  <span className="text-sm font-medium">{metrics.active_users_24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Admin Users</span>
                  <span className="text-sm font-medium">{metrics.admin_users}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Threat Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Suspicious Events</span>
                  <span className="text-sm font-medium">{metrics.suspicious_activities_24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Rate Limit Violations</span>
                  <span className="text-sm font-medium">{metrics.rate_limit_violations_24h}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pending Approvals</span>
                  <span className="text-sm font-medium">{metrics.pending_approvals}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
              <CardDescription>Latest security alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alert</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.title}</TableCell>
                      <TableCell>{alert.alert_source}</TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>{alert.confidence}%</TableCell>
                      <TableCell><Badge variant="outline">{alert.status}</Badge></TableCell>
                      <TableCell>{new Date(alert.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>SOC2 Compliance Requirements</CardTitle>
              <CardDescription>Track compliance status for SOC2 controls</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requirement</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Assessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.slice(0, 10).map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        {req.requirement_id}: {req.requirement_name}
                      </TableCell>
                      <TableCell>{req.category}</TableCell>
                      <TableCell>{getSeverityBadge(req.priority)}</TableCell>
                      <TableCell>
                        <Badge variant={req.compliance_status === 'COMPLIANT' ? 'default' : 'destructive'}>
                          {req.compliance_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.last_assessed ? new Date(req.last_assessed).toLocaleDateString() : 'Not assessed'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
