/**
 * Gas Cost Tracking and Analytics Service
 * Provides functions for monitoring gas costs, creating estimates, and generating optimization recommendations
 */

import { createClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';

export interface GasSnapshot {
  id: string;
  network: string;
  timestamp: string;
  fast_gas_price: number;
  standard_gas_price: number;
  slow_gas_price: number;
  base_fee?: number;
  priority_fee?: number;
  native_token_usd_price?: number;
  network_congestion: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface TransactionGasCost {
  id: string;
  tx_hash: string;
  network: string;
  transaction_type: string;
  gas_used: number;
  gas_price: number;
  total_gas_cost_native: number;
  total_gas_cost_usd: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERTED';
  block_timestamp?: string;
}

export interface GasEstimate {
  estimate_id: string;
  network: string;
  operation_type: string;
  estimated_gas_limit: number;
  fast_cost_usd: number;
  standard_cost_usd: number;
  slow_cost_usd: number;
  estimated_time_fast_seconds: number;
  estimated_time_standard_seconds: number;
  estimated_time_slow_seconds: number;
}

export interface GasAnalytics {
  total_transactions: number;
  total_cost_usd: number;
  average_cost_usd: number;
  median_gas_price: number;
  total_gas_used: number;
  successful_txs: number;
  failed_txs: number;
  most_expensive_operation: string;
  optimization_potential_usd: number;
}

export interface GasOptimizationRecommendation {
  id: string;
  recommendation_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  potential_savings_percentage: number;
  potential_savings_usd_monthly: number;
  implementation_difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimated_implementation_hours: number;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
}

export interface GasBudget {
  id: string;
  budget_name: string;
  network: string;
  budget_period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  budget_limit_usd: number;
  current_spending_usd: number;
  alert_threshold_percentage: number;
  is_exceeded: boolean;
  last_reset_at: string;
  next_reset_at: string;
}

/**
 * Fetch current gas prices from blockchain provider
 */
export async function fetchCurrentGasPrices(network: string = 'ethereum'): Promise<{
  fast: number;
  standard: number;
  slow: number;
  baseFee?: number;
}> {
  try {
    // In production, this would call Etherscan, Alchemy, or similar API
    // For now, returning mock data structure
    
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'
    );
    
    const feeData = await provider.getFeeData();
    
    if (!feeData.gasPrice) {
      throw new Error('Unable to fetch gas price');
    }
    
    // Convert from wei to gwei
    const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
    
    return {
      fast: gasPriceGwei * 1.2, // 20% premium for fast
      standard: gasPriceGwei,
      slow: gasPriceGwei * 0.8, // 20% discount for slow
      baseFee: feeData.maxFeePerGas ? Number(ethers.formatUnits(feeData.maxFeePerGas, 'gwei')) : undefined,
    };
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    // Fallback to reasonable defaults
    return {
      fast: 30,
      standard: 25,
      slow: 20,
    };
  }
}

/**
 * Record a gas price snapshot
 */
export async function recordGasSnapshot(
  network: string,
  gasPrices: { fast: number; standard: number; slow: number; baseFee?: number },
  tokenUsdPrice?: number
): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('record_gas_snapshot', {
    p_network: network,
    p_fast_price: gasPrices.fast,
    p_standard_price: gasPrices.standard,
    p_slow_price: gasPrices.slow,
    p_base_fee: gasPrices.baseFee || null,
    p_token_usd_price: tokenUsdPrice || null,
  });
  
  if (error) {
    throw new Error(`Failed to record gas snapshot: ${error.message}`);
  }
  
  return data;
}

/**
 * Get latest gas snapshot
 */
export async function getLatestGasSnapshot(network: string): Promise<GasSnapshot | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('gas_price_snapshots')
    .select('*')
    .eq('network', network)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    console.error('Error fetching gas snapshot:', error);
    return null;
  }
  
  return data;
}

/**
 * Record transaction gas cost
 */
export async function recordTransactionGas(params: {
  txHash: string;
  network: string;
  transactionType: string;
  initiatedBy: string;
  walletAddress: string;
  gasLimit: number;
  gasUsed: number;
  gasPrice: number;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERTED';
}): Promise<string> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('record_transaction_gas', {
    p_tx_hash: params.txHash,
    p_network: params.network,
    p_transaction_type: params.transactionType,
    p_initiated_by: params.initiatedBy,
    p_wallet_address: params.walletAddress,
    p_gas_limit: params.gasLimit,
    p_gas_used: params.gasUsed,
    p_gas_price: params.gasPrice,
    p_status: params.status || 'SUCCESS',
  });
  
  if (error) {
    throw new Error(`Failed to record transaction gas: ${error.message}`);
  }
  
  return data;
}

/**
 * Create gas estimate for an operation
 */
export async function createGasEstimate(
  network: string,
  operationType: string,
  estimatedGas: number,
  requestedBy: string
): Promise<GasEstimate> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('create_gas_estimate', {
    p_network: network,
    p_operation_type: operationType,
    p_estimated_gas: estimatedGas,
    p_requested_by: requestedBy,
  });
  
  if (error) {
    throw new Error(`Failed to create gas estimate: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    throw new Error('No estimate data returned');
  }
  
  const estimate = data[0];
  
  return {
    estimate_id: estimate.estimate_id,
    network,
    operation_type: operationType,
    estimated_gas_limit: estimatedGas,
    fast_cost_usd: estimate.fast_cost_usd,
    standard_cost_usd: estimate.standard_cost_usd,
    slow_cost_usd: estimate.slow_cost_usd,
    estimated_time_fast_seconds: 15,
    estimated_time_standard_seconds: 30,
    estimated_time_slow_seconds: 120,
  };
}

/**
 * Get gas cost analytics
 */
export async function getGasAnalytics(
  network: string,
  days: number = 30
): Promise<GasAnalytics> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('get_gas_analytics', {
    p_network: network,
    p_days: days,
  });
  
  if (error) {
    throw new Error(`Failed to get gas analytics: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    return {
      total_transactions: 0,
      total_cost_usd: 0,
      average_cost_usd: 0,
      median_gas_price: 0,
      total_gas_used: 0,
      successful_txs: 0,
      failed_txs: 0,
      most_expensive_operation: 'N/A',
      optimization_potential_usd: 0,
    };
  }
  
  return data[0];
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
  network?: string,
  limit: number = 50
): Promise<TransactionGasCost[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('transaction_gas_costs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (network) {
    query = query.eq('network', network);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get transaction history: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get optimization recommendations
 */
export async function getOptimizationRecommendations(
  status?: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
): Promise<GasOptimizationRecommendation[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('gas_optimization_recommendations')
    .select('*')
    .order('priority', { ascending: false })
    .order('potential_savings_usd_monthly', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  recommendationId: string,
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED',
  assignedTo?: string
): Promise<void> {
  const supabase = await createClient();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (assignedTo) {
    updateData.assigned_to = assignedTo;
  }
  
  if (status === 'COMPLETED') {
    updateData.completed_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('gas_optimization_recommendations')
    .update(updateData)
    .eq('id', recommendationId);
  
  if (error) {
    throw new Error(`Failed to update recommendation: ${error.message}`);
  }
}

/**
 * Get active budgets
 */
export async function getActiveBudgets(network?: string): Promise<GasBudget[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('gas_cost_budgets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (network) {
    query = query.eq('network', network);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to get budgets: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Create gas budget
 */
export async function createGasBudget(params: {
  budgetName: string;
  network: string;
  budgetPeriod: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  budgetLimitUsd: number;
  alertThreshold?: number;
  createdBy: string;
  notificationEmails?: string[];
}): Promise<string> {
  const supabase = await createClient();
  
  const nextReset = calculateNextReset(params.budgetPeriod);
  
  const { data, error } = await supabase
    .from('gas_cost_budgets')
    .insert({
      budget_name: params.budgetName,
      network: params.network,
      budget_period: params.budgetPeriod,
      budget_limit_usd: params.budgetLimitUsd,
      alert_threshold_percentage: params.alertThreshold || 80,
      next_reset_at: nextReset,
      created_by: params.createdBy,
      notification_emails: params.notificationEmails || [],
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create budget: ${error.message}`);
  }
  
  return data.id;
}

/**
 * Calculate next reset date based on period
 */
function calculateNextReset(period: string): string {
  const now = new Date();
  
  switch (period) {
    case 'DAILY':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    case 'QUARTERLY':
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()).toISOString();
    case 'YEARLY':
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
}

/**
 * Get historical gas price trend
 */
export async function getGasPriceTrend(
  network: string,
  hours: number = 24
): Promise<Array<{ timestamp: string; fast: number; standard: number; slow: number }>> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('gas_price_snapshots')
    .select('timestamp, fast_gas_price, standard_gas_price, slow_gas_price')
    .eq('network', network)
    .gte('timestamp', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get gas price trend: ${error.message}`);
  }
  
  return (data || []).map((item) => ({
    timestamp: item.timestamp,
    fast: item.fast_gas_price,
    standard: item.standard_gas_price,
    slow: item.slow_gas_price,
  }));
}

/**
 * Reset expired budgets (called by cron)
 */
export async function resetExpiredBudgets(): Promise<number> {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc('reset_expired_budgets');
  
  if (error) {
    throw new Error(`Failed to reset budgets: ${error.message}`);
  }
  
  return data?.[0]?.budgets_reset || 0;
}
