'use client';

import React, { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';

interface GasSnapshot {
  fast_gas_price: number;
  standard_gas_price: number;
  slow_gas_price: number;
  network_congestion: string;
  timestamp: string;
}

interface GasAnalytics {
  total_transactions: number;
  total_cost_usd: number;
  average_cost_usd: number;
  median_gas_price: number;
  successful_txs: number;
  failed_txs: number;
  most_expensive_operation: string;
  optimization_potential_usd: number;
}

interface TransactionGasCost {
  tx_hash: string;
  transaction_type: string;
  gas_used: number;
  gas_price: number;
  total_gas_cost_usd: number;
  status: string;
  created_at: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: string;
  potential_savings_percentage: number;
  potential_savings_usd_monthly: number;
  implementation_difficulty: string;
  status: string;
}

interface Budget {
  id: string;
  budget_name: string;
  budget_limit_usd: number;
  current_spending_usd: number;
  alert_threshold_percentage: number;
  is_exceeded: boolean;
  budget_period: string;
  next_reset_at: string;
}

export default function GasDashboard() {
  const [network, setNetwork] = useState('ethereum');
  const [timeRange, setTimeRange] = useState('30');
  const [snapshot, setSnapshot] = useState<GasSnapshot | null>(null);
  const [analytics, setAnalytics] = useState<GasAnalytics | null>(null);
  const [transactions, setTransactions] = useState<TransactionGasCost[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [network, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load gas snapshot
      const snapshotRes = await fetch(`/api/gas/snapshot?network=${network}`);
      if (snapshotRes.ok) {
        const snapshotData = await snapshotRes.json();
        setSnapshot(snapshotData);
      }

      // Load analytics
      const analyticsRes = await fetch(`/api/gas/analytics?network=${network}&days=${timeRange}`);
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.analytics);
      }

      // Load transactions
      const txRes = await fetch(`/api/gas/transactions?network=${network}&limit=20`);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions);
      }

      // Load recommendations
      const recRes = await fetch('/api/gas/recommendations?status=ACTIVE');
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecommendations(recData.recommendations);
      }

      // Load budgets
      const budgetRes = await fetch(`/api/gas/budgets?network=${network}`);
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudgets(budgetData.budgets);
      }
    } catch (error) {
      console.error('Error loading gas dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCongestionColor = (congestion: string) => {
    switch (congestion) {
      case 'LOW':
        return 'bg-green-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'EXTREME':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW':
        return 'secondary';
      case 'MEDIUM':
        return 'default';
      case 'HIGH':
        return 'destructive';
      case 'CRITICAL':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatGasPrice = (value: number) => {
    return `${value.toFixed(2)} gwei`;
  };

  const formatTxHash = (hash: string) => {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading gas dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gas Cost Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and optimize blockchain transaction costs
          </p>
        </div>
        <div className="flex gap-4">
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="base">Base</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Current Gas Prices */}
      {snapshot && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fast</CardTitle>
              <Zap className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGasPrice(snapshot.fast_gas_price)}
              </div>
              <p className="text-xs text-muted-foreground">~15 seconds</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Standard</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGasPrice(snapshot.standard_gas_price)}
              </div>
              <p className="text-xs text-muted-foreground">~30 seconds</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Slow</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatGasPrice(snapshot.slow_gas_price)}
              </div>
              <p className="text-xs text-muted-foreground">~2 minutes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Network Status</CardTitle>
              <BarChart3 className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Badge className={getCongestionColor(snapshot.network_congestion)}>
                {snapshot.network_congestion}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Congestion Level</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUSD(analytics.total_cost_usd)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.total_transactions} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatUSD(analytics.average_cost_usd)}
              </div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((analytics.successful_txs / analytics.total_transactions) * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.successful_txs} / {analytics.total_transactions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Savings Potential</CardTitle>
              <TrendingDown className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatUSD(analytics.optimization_potential_usd)}
              </div>
              <p className="text-xs text-muted-foreground">Monthly potential</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="recommendations">Optimizations</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Last 20 blockchain transactions with gas costs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TX Hash</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gas Used</TableHead>
                    <TableHead>Gas Price</TableHead>
                    <TableHead>Cost (USD)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.tx_hash}>
                      <TableCell className="font-mono">
                        {formatTxHash(tx.tx_hash)}
                      </TableCell>
                      <TableCell>{tx.transaction_type}</TableCell>
                      <TableCell>{tx.gas_used.toLocaleString()}</TableCell>
                      <TableCell>{formatGasPrice(tx.gas_price)}</TableCell>
                      <TableCell>{formatUSD(tx.total_gas_cost_usd)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 'SUCCESS' ? 'default' : 'destructive'}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rec.title}
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{rec.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{rec.implementation_difficulty}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Potential Savings</p>
                      <p className="text-2xl font-bold text-green-600">
                        {rec.potential_savings_percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatUSD(rec.potential_savings_usd_monthly)}/month
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Implementation</p>
                      <p className="text-2xl font-bold">
                        {rec.estimated_implementation_hours}h
                      </p>
                      <p className="text-xs text-muted-foreground">Estimated time</p>
                    </div>
                    <div className="flex items-center">
                      <Button size="sm" className="w-full">
                        Start Implementation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="grid gap-4">
            {budgets.map((budget) => {
              const usagePercentage =
                (budget.current_spending_usd / budget.budget_limit_usd) * 100;
              const isNearThreshold = usagePercentage >= budget.alert_threshold_percentage;

              return (
                <Card key={budget.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{budget.budget_name}</CardTitle>
                        <CardDescription>
                          {budget.budget_period} budget • Resets{' '}
                          {new Date(budget.next_reset_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {budget.is_exceeded && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Exceeded
                        </Badge>
                      )}
                      {isNearThreshold && !budget.is_exceeded && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Near Limit
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{formatUSD(budget.current_spending_usd)} spent</span>
                        <span>{formatUSD(budget.budget_limit_usd)} limit</span>
                      </div>
                      <Progress
                        value={Math.min(usagePercentage, 100)}
                        className={usagePercentage > 100 ? 'bg-red-200' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        {usagePercentage.toFixed(1)}% of budget used
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
