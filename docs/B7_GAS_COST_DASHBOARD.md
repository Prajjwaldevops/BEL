# B7: Gas Cost Dashboard

**Status:** ✅ Implemented  
**Priority:** Medium  
**Estimated Effort:** 3-4 days  
**Implementation Date:** September 17, 2026

## Overview

The Gas Cost Dashboard provides comprehensive monitoring and analytics for blockchain transaction costs. It tracks historical gas prices, records actual transaction costs, generates cost estimates, provides optimization recommendations, and enforces spending budgets.

## Features

### 1. **Real-Time Gas Price Monitoring**
- Captures gas price snapshots every 5 minutes
- Tracks fast, standard, and slow gas prices
- Monitors network congestion levels
- Supports multiple networks (Ethereum, Polygon, Base)
- Records native token USD prices for cost calculation

### 2. **Transaction Cost Tracking**
- Records actual gas costs for all blockchain transactions
- Calculates costs in both native tokens and USD
- Tracks success/failure rates
- Identifies high-cost transactions
- Links transactions to users and operations

### 3. **Cost Analytics**
- Total spending over configurable time periods
- Average cost per transaction
- Success rate analysis
- Most expensive operation types
- Optimization potential calculations

### 4. **Gas Estimation**
- Pre-transaction cost estimates
- Multiple speed tiers (fast/standard/slow)
- Time-to-confirmation estimates
- Accuracy tracking against actual costs

### 5. **Optimization Recommendations**
- Automated recommendations based on usage patterns
- Priority-based suggestion system
- Savings potential calculations
- Implementation difficulty ratings
- Status tracking (Active → In Progress → Completed)

### 6. **Budget Management**
- Configurable spending limits
- Multiple time periods (daily, weekly, monthly, quarterly, yearly)
- Alert thresholds
- Automatic budget resets
- Email notifications for threshold/exceeded events

## Database Schema

### Tables Created

#### `gas_price_snapshots`
Stores historical gas price data from the blockchain.

```sql
CREATE TABLE gas_price_snapshots (
    id UUID PRIMARY KEY,
    network VARCHAR(50),
    timestamp TIMESTAMPTZ,
    fast_gas_price DECIMAL(20, 9),      -- in gwei
    standard_gas_price DECIMAL(20, 9),
    slow_gas_price DECIMAL(20, 9),
    base_fee DECIMAL(20, 9),            -- EIP-1559
    priority_fee DECIMAL(20, 9),
    network_congestion VARCHAR(20),     -- LOW/MEDIUM/HIGH/EXTREME
    native_token_usd_price DECIMAL(20, 2)
);
```

#### `transaction_gas_costs`
Records actual gas costs for executed transactions.

```sql
CREATE TABLE transaction_gas_costs (
    id UUID PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE,
    network VARCHAR(50),
    transaction_type VARCHAR(50),       -- MINT_NFT, TRANSFER, etc.
    initiated_by UUID REFERENCES profiles(id),
    wallet_address VARCHAR(42),
    gas_limit BIGINT,
    gas_used BIGINT,
    gas_price DECIMAL(20, 9),
    total_gas_cost_native DECIMAL(30, 18),
    total_gas_cost_usd DECIMAL(20, 2),
    status VARCHAR(20),                 -- PENDING/SUCCESS/FAILED/REVERTED
    block_timestamp TIMESTAMPTZ
);
```

#### `gas_estimates`
Pre-transaction cost estimates.

```sql
CREATE TABLE gas_estimates (
    id UUID PRIMARY KEY,
    network VARCHAR(50),
    operation_type VARCHAR(50),
    estimated_gas_limit BIGINT,
    estimated_gas_price_fast DECIMAL(20, 9),
    estimated_gas_price_standard DECIMAL(20, 9),
    estimated_gas_price_slow DECIMAL(20, 9),
    estimated_cost_fast_usd DECIMAL(20, 2),
    estimated_cost_standard_usd DECIMAL(20, 2),
    estimated_cost_slow_usd DECIMAL(20, 2),
    actual_tx_hash VARCHAR(66),         -- If executed
    accuracy_percentage DECIMAL(5, 2)
);
```

#### `gas_optimization_recommendations`
Automated and manual optimization suggestions.

```sql
CREATE TABLE gas_optimization_recommendations (
    id UUID PRIMARY KEY,
    recommendation_type VARCHAR(50),    -- BATCH_OPERATIONS, TIMING, etc.
    priority VARCHAR(20),               -- LOW/MEDIUM/HIGH/CRITICAL
    title VARCHAR(255),
    description TEXT,
    potential_savings_percentage DECIMAL(5, 2),
    potential_savings_usd_monthly DECIMAL(20, 2),
    implementation_difficulty VARCHAR(20), -- EASY/MEDIUM/HARD
    estimated_implementation_hours INTEGER,
    status VARCHAR(20)                  -- ACTIVE/IN_PROGRESS/COMPLETED/DISMISSED
);
```

#### `gas_cost_budgets`
Spending limits and budget tracking.

```sql
CREATE TABLE gas_cost_budgets (
    id UUID PRIMARY KEY,
    budget_name VARCHAR(255),
    network VARCHAR(50),
    budget_period VARCHAR(20),          -- DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY
    budget_limit_usd DECIMAL(20, 2),
    current_spending_usd DECIMAL(20, 2),
    alert_threshold_percentage DECIMAL(5, 2) DEFAULT 80.00,
    is_exceeded BOOLEAN DEFAULT FALSE,
    next_reset_at TIMESTAMPTZ
);
```

## SQL Functions

### `record_gas_snapshot()`
Records a gas price snapshot with automatic congestion level detection.

```sql
SELECT record_gas_snapshot(
    'ethereum',           -- network
    30.5,                 -- fast price
    25.0,                 -- standard price
    20.0,                 -- slow price
    28.0,                 -- base fee (optional)
    2.5,                  -- priority fee (optional)
    2500.00,              -- token USD price (optional)
    18500000              -- block number (optional)
);
```

### `record_transaction_gas()`
Records actual gas cost after transaction execution.

```sql
SELECT record_transaction_gas(
    '0xabc...123',        -- tx hash
    'ethereum',           -- network
    'MINT_NFT',           -- transaction type
    'user-uuid',          -- initiated by
    '0x742...456',        -- wallet address
    100000,               -- gas limit
    85000,                -- gas used
    25.5,                 -- gas price (gwei)
    'SUCCESS'             -- status
);
```

### `create_gas_estimate()`
Creates a cost estimate before transaction execution.

```sql
SELECT * FROM create_gas_estimate(
    'ethereum',           -- network
    'MINT_NFT',           -- operation type
    100000,               -- estimated gas
    'user-uuid'           -- requested by
);
-- Returns: estimate_id, fast_cost_usd, standard_cost_usd, slow_cost_usd
```

### `get_gas_analytics()`
Retrieves aggregated analytics for a time period.

```sql
SELECT * FROM get_gas_analytics(
    'ethereum',           -- network
    30                    -- days
);
-- Returns: total_transactions, total_cost_usd, average_cost_usd,
--          median_gas_price, total_gas_used, successful_txs, failed_txs,
--          most_expensive_operation, optimization_potential_usd
```

### `reset_expired_budgets()`
Resets budgets that have reached their reset date.

```sql
SELECT * FROM reset_expired_budgets();
-- Returns: budgets_reset (count)
```

## API Endpoints

### Gas Price Snapshot

**GET `/api/gas/snapshot`**
Get the latest gas price snapshot for a network.

Query Parameters:
- `network` - Network name (default: 'ethereum')

Response:
```json
{
  "id": "uuid",
  "network": "ethereum",
  "fast_gas_price": 30.5,
  "standard_gas_price": 25.0,
  "slow_gas_price": 20.0,
  "network_congestion": "MEDIUM",
  "timestamp": "2026-09-17T10:30:00Z"
}
```

**POST `/api/gas/snapshot`**
Create a new gas price snapshot (triggers fetch from blockchain).

Request Body:
```json
{
  "network": "ethereum",
  "tokenUsdPrice": 2500.00
}
```

### Gas Estimation

**POST `/api/gas/estimate`**
Create a gas cost estimate for an operation.

Request Body:
```json
{
  "network": "ethereum",
  "operationType": "MINT_NFT",
  "estimatedGas": 100000
}
```

Response:
```json
{
  "success": true,
  "estimate": {
    "estimate_id": "uuid",
    "fast_cost_usd": 8.50,
    "standard_cost_usd": 7.00,
    "slow_cost_usd": 5.50,
    "estimated_time_fast_seconds": 15,
    "estimated_time_standard_seconds": 30,
    "estimated_time_slow_seconds": 120
  }
}
```

### Analytics

**GET `/api/gas/analytics`**
Get gas cost analytics for a network and time period.

Query Parameters:
- `network` - Network name (default: 'ethereum')
- `days` - Time period in days (default: 30)

Response:
```json
{
  "success": true,
  "analytics": {
    "total_transactions": 1250,
    "total_cost_usd": 3500.00,
    "average_cost_usd": 2.80,
    "median_gas_price": 25.5,
    "successful_txs": 1200,
    "failed_txs": 50,
    "most_expensive_operation": "MINT_NFT",
    "optimization_potential_usd": 450.00
  }
}
```

### Transaction History

**GET `/api/gas/transactions`**
Get transaction gas cost history.

Query Parameters:
- `network` - Filter by network (optional)
- `limit` - Number of transactions (default: 50)

**POST `/api/gas/transactions`**
Record a transaction gas cost.

Request Body:
```json
{
  "txHash": "0xabc...123",
  "network": "ethereum",
  "transactionType": "MINT_NFT",
  "walletAddress": "0x742...456",
  "gasLimit": 100000,
  "gasUsed": 85000,
  "gasPrice": 25.5,
  "status": "SUCCESS"
}
```

### Optimization Recommendations

**GET `/api/gas/recommendations`**
Get gas optimization recommendations.

Query Parameters:
- `status` - Filter by status (optional): ACTIVE, IN_PROGRESS, COMPLETED, DISMISSED

**PATCH `/api/gas/recommendations`**
Update recommendation status (admin only).

Request Body:
```json
{
  "recommendationId": "uuid",
  "status": "IN_PROGRESS",
  "assignedTo": "user-uuid"
}
```

### Budget Management

**GET `/api/gas/budgets`**
Get active gas budgets (admin only).

Query Parameters:
- `network` - Filter by network (optional)

**POST `/api/gas/budgets`**
Create a new gas budget (admin only).

Request Body:
```json
{
  "budgetName": "Monthly Ethereum Budget",
  "network": "ethereum",
  "budgetPeriod": "MONTHLY",
  "budgetLimitUsd": 5000.00,
  "alertThreshold": 80,
  "notificationEmails": ["admin@example.com"]
}
```

### Gas Price Trend

**GET `/api/gas/trend`**
Get historical gas price trend data.

Query Parameters:
- `network` - Network name (default: 'ethereum')
- `hours` - Time period in hours (default: 24)

Response:
```json
{
  "success": true,
  "trend": [
    {
      "timestamp": "2026-09-17T10:00:00Z",
      "fast": 32.0,
      "standard": 28.0,
      "slow": 24.0
    }
  ]
}
```

## Cron Jobs

### Snapshot Gas Prices
**Schedule:** Every 5 minutes  
**Endpoint:** `/api/cron/snapshot-gas-prices`  
**Purpose:** Capture current gas prices from blockchain networks

### Reset Gas Budgets
**Schedule:** Hourly  
**Endpoint:** `/api/cron/reset-gas-budgets`  
**Purpose:** Reset budgets that have reached their period end

## Components

### GasDashboard Component
Full-featured dashboard with:
- Real-time gas price display
- Cost analytics summary cards
- Transaction history table
- Optimization recommendations
- Budget tracking with progress bars
- Network and time range selectors

Location: `src/components/GasDashboard.tsx`

## Usage Examples

### Record Transaction Gas Cost

```typescript
import { recordTransactionGas } from '@/lib/gas-service';

// After transaction is confirmed
await recordTransactionGas({
  txHash: receipt.transactionHash,
  network: 'ethereum',
  transactionType: 'MINT_NFT',
  initiatedBy: userId,
  walletAddress: userWallet,
  gasLimit: receipt.gasLimit,
  gasUsed: receipt.gasUsed,
  gasPrice: receipt.effectiveGasPrice,
  status: 'SUCCESS',
});
```

### Create Gas Estimate

```typescript
import { createGasEstimate } from '@/lib/gas-service';

// Before executing transaction
const estimate = await createGasEstimate(
  'ethereum',
  'MINT_NFT',
  100000,
  userId
);

console.log(`Fast: $${estimate.fast_cost_usd}`);
console.log(`Standard: $${estimate.standard_cost_usd}`);
console.log(`Slow: $${estimate.slow_cost_usd}`);
```

### Get Analytics

```typescript
import { getGasAnalytics } from '@/lib/gas-service';

const analytics = await getGasAnalytics('ethereum', 30);

console.log(`Total spent: $${analytics.total_cost_usd}`);
console.log(`Average cost: $${analytics.average_cost_usd}`);
console.log(`Success rate: ${(analytics.successful_txs / analytics.total_transactions * 100).toFixed(1)}%`);
```

## Default Optimization Recommendations

The system includes 3 pre-configured optimization recommendations:

1. **Batch Multiple NFT Mints**
   - Priority: HIGH
   - Potential Savings: 40%
   - Implementation: MEDIUM (8 hours)

2. **Execute Transactions During Low Congestion**
   - Priority: MEDIUM
   - Potential Savings: 25%
   - Implementation: EASY (2 hours)

3. **Optimize Storage Layout**
   - Priority: MEDIUM
   - Potential Savings: 15%
   - Implementation: HARD (24 hours)

## Configuration

### System Settings

```sql
-- Enable/disable gas tracking
gas_tracking_enabled = 'true'

-- Snapshot capture interval
gas_snapshot_interval_minutes = '5'

-- High cost alert threshold
gas_high_cost_alert_usd = '50.00'

-- Budget alerts
gas_budget_alert_enabled = 'true'

-- Automatic recommendations
gas_optimization_enabled = 'true'
```

## Security

### Row Level Security (RLS)

- **Gas Snapshots:** Public read access (no authentication required)
- **Transaction Costs:** Users can view their own transactions, admins can view all
- **Estimates:** Users can view their own estimates, admins can view all
- **Recommendations:** Admin-only access
- **Budgets:** Admin-only access

### API Authentication

- Most endpoints require authentication via Supabase
- Admin-only endpoints check `profiles.is_admin` flag
- Cron endpoints verify `CRON_SECRET` header

## Monitoring

### Key Metrics to Track

1. **Gas Price Volatility:** Standard deviation of gas prices over time
2. **Cost Efficiency:** Actual cost vs. estimated cost accuracy
3. **Budget Compliance:** Percentage of budgets staying within limits
4. **Optimization Adoption:** Number of recommendations implemented
5. **High-Cost Transactions:** Frequency and total cost

### Alerts

- Gas price spikes above threshold
- High-cost single transactions (> $50)
- Budget threshold reached (80% by default)
- Budget exceeded
- Failed transactions consuming gas

## Future Enhancements

1. **Predictive Analytics:** ML-based gas price prediction
2. **Automated Optimization:** Automatic transaction batching
3. **Multi-Sig Integration:** Gas cost approval workflows for high-value transactions
4. **Cross-Chain Comparison:** Cost comparison across different networks
5. **Historical Reporting:** Monthly/quarterly gas cost reports
6. **MEV Protection:** Transaction bundling and private relay integration

## Integration with Other Features

### Multi-Signature Approvals (B3)
High-cost transactions can require multi-sig approval before execution.

### Incident Response (B5)
Extremely high gas costs trigger security incidents.

### Time-Bound Access (B2)
Gas budget permissions can have expiration dates.

### Audit System
All gas tracking events are logged to `security_events` table.

## Troubleshooting

### Gas Snapshot Not Updating
- Check cron job is running: `/api/cron/snapshot-gas-prices`
- Verify RPC provider is accessible
- Check `gas_tracking_enabled` setting

### Inaccurate Cost Estimates
- Ensure gas price snapshots are recent (< 5 minutes old)
- Verify token USD price is being captured
- Update estimated gas amounts based on actual usage

### Budget Not Resetting
- Check cron job: `/api/cron/reset-gas-budgets`
- Verify `next_reset_at` dates are correct
- Ensure budget period is properly configured

## Related Files

- Migration: `database/migrations/20260917_009_add_gas_tracking.sql`
- Service Library: `src/lib/gas-service.ts`
- Dashboard Component: `src/components/GasDashboard.tsx`
- API Routes: `src/app/api/gas/*`
- Cron Jobs: `src/app/api/cron/snapshot-gas-prices/route.ts`, `src/app/api/cron/reset-gas-budgets/route.ts`

## Testing Checklist

- [ ] Gas snapshots captured every 5 minutes
- [ ] Transaction costs recorded accurately
- [ ] Estimates match actual costs within 10%
- [ ] Analytics calculations correct
- [ ] Recommendations display correctly
- [ ] Budgets enforce limits
- [ ] Budget resets work correctly
- [ ] High-cost alerts trigger
- [ ] Dashboard loads without errors
- [ ] RLS policies enforce access control
