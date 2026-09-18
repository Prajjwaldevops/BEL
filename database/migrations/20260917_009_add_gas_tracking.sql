-- Migration: 20260917_009_add_gas_tracking.sql
-- Description: Implements gas cost tracking and analytics dashboard
-- Created: 2026-09-17

-- ============================================================================
-- TABLES
-- ============================================================================

-- Gas price snapshots (historical data)
CREATE TABLE IF NOT EXISTS gas_price_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network VARCHAR(50) NOT NULL, -- 'ethereum', 'polygon', 'base', etc.
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Gas prices in gwei
    fast_gas_price DECIMAL(20, 9) NOT NULL,
    standard_gas_price DECIMAL(20, 9) NOT NULL,
    slow_gas_price DECIMAL(20, 9) NOT NULL,
    
    -- Base fee (EIP-1559)
    base_fee DECIMAL(20, 9),
    priority_fee DECIMAL(20, 9),
    
    -- Additional metrics
    block_number BIGINT,
    network_congestion VARCHAR(20) CHECK (network_congestion IN ('LOW', 'MEDIUM', 'HIGH', 'EXTREME')),
    
    -- Price in USD per ETH/MATIC/etc.
    native_token_usd_price DECIMAL(20, 2),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction gas costs (actual usage)
CREATE TABLE IF NOT EXISTS transaction_gas_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    network VARCHAR(50) NOT NULL,
    
    -- Transaction details
    contract_address VARCHAR(42),
    function_name VARCHAR(255),
    transaction_type VARCHAR(50), -- 'MINT_NFT', 'TRANSFER', 'ROLE_ASSIGNMENT', etc.
    
    -- User/actor
    initiated_by UUID REFERENCES profiles(id),
    wallet_address VARCHAR(42),
    
    -- Gas metrics
    gas_limit BIGINT NOT NULL,
    gas_used BIGINT NOT NULL,
    gas_price DECIMAL(20, 9) NOT NULL, -- in gwei
    
    -- Costs
    total_gas_cost_native DECIMAL(30, 18) NOT NULL, -- in ETH/MATIC/etc.
    total_gas_cost_usd DECIMAL(20, 2), -- in USD
    
    -- EIP-1559 specific
    base_fee DECIMAL(20, 9),
    priority_fee DECIMAL(20, 9),
    max_fee_per_gas DECIMAL(20, 9),
    max_priority_fee_per_gas DECIMAL(20, 9),
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REVERTED')),
    block_number BIGINT,
    block_timestamp TIMESTAMPTZ,
    
    -- Optimization flags
    was_optimized BOOLEAN DEFAULT FALSE,
    optimization_method VARCHAR(100),
    estimated_savings_usd DECIMAL(20, 2),
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gas cost estimates (pre-transaction)
CREATE TABLE IF NOT EXISTS gas_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    network VARCHAR(50) NOT NULL,
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- 'MINT_NFT', 'TRANSFER', 'ROLE_ASSIGNMENT', etc.
    contract_address VARCHAR(42),
    function_signature VARCHAR(255),
    
    -- Estimates
    estimated_gas_limit BIGINT NOT NULL,
    estimated_gas_price_fast DECIMAL(20, 9),
    estimated_gas_price_standard DECIMAL(20, 9),
    estimated_gas_price_slow DECIMAL(20, 9),
    
    -- Cost projections
    estimated_cost_fast_usd DECIMAL(20, 2),
    estimated_cost_standard_usd DECIMAL(20, 2),
    estimated_cost_slow_usd DECIMAL(20, 2),
    
    -- Timing estimates
    estimated_time_fast_seconds INTEGER,
    estimated_time_standard_seconds INTEGER,
    estimated_time_slow_seconds INTEGER,
    
    -- Actual transaction (if executed)
    actual_tx_hash VARCHAR(66),
    actual_gas_used BIGINT,
    actual_cost_usd DECIMAL(20, 2),
    accuracy_percentage DECIMAL(5, 2), -- How accurate was the estimate
    
    requested_by UUID REFERENCES profiles(id),
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gas optimization recommendations
CREATE TABLE IF NOT EXISTS gas_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Target
    recommendation_type VARCHAR(50) NOT NULL, -- 'BATCH_OPERATIONS', 'TIMING', 'CONTRACT_UPGRADE', etc.
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    
    -- Details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Impact
    potential_savings_percentage DECIMAL(5, 2),
    potential_savings_usd_monthly DECIMAL(20, 2),
    affected_operations TEXT[], -- Array of operation types
    
    -- Implementation
    implementation_difficulty VARCHAR(20) CHECK (implementation_difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    estimated_implementation_hours INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED')),
    
    -- Tracking
    created_by UUID REFERENCES profiles(id),
    assigned_to UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gas cost budgets (spending limits)
CREATE TABLE IF NOT EXISTS gas_cost_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Budget scope
    budget_name VARCHAR(255) NOT NULL,
    network VARCHAR(50) NOT NULL,
    budget_period VARCHAR(20) NOT NULL CHECK (budget_period IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
    
    -- Limits
    budget_limit_usd DECIMAL(20, 2) NOT NULL,
    alert_threshold_percentage DECIMAL(5, 2) DEFAULT 80.00, -- Alert at 80%
    
    -- Current usage
    current_spending_usd DECIMAL(20, 2) DEFAULT 0.00,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    next_reset_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_exceeded BOOLEAN DEFAULT FALSE,
    
    -- Notifications
    notify_on_threshold BOOLEAN DEFAULT TRUE,
    notify_on_exceeded BOOLEAN DEFAULT TRUE,
    notification_emails TEXT[],
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_gas_snapshots_network_timestamp ON gas_price_snapshots(network, timestamp DESC);
CREATE INDEX idx_gas_snapshots_timestamp ON gas_price_snapshots(timestamp DESC);

CREATE INDEX idx_tx_gas_network ON transaction_gas_costs(network);
CREATE INDEX idx_tx_gas_initiated_by ON transaction_gas_costs(initiated_by);
CREATE INDEX idx_tx_gas_type ON transaction_gas_costs(transaction_type);
CREATE INDEX idx_tx_gas_timestamp ON transaction_gas_costs(block_timestamp DESC);
CREATE INDEX idx_tx_gas_tx_hash ON transaction_gas_costs(tx_hash);
CREATE INDEX idx_tx_gas_status ON transaction_gas_costs(status);

CREATE INDEX idx_gas_estimates_operation ON gas_estimates(operation_type);
CREATE INDEX idx_gas_estimates_network ON gas_estimates(network);
CREATE INDEX idx_gas_estimates_requested_by ON gas_estimates(requested_by);
CREATE INDEX idx_gas_estimates_created ON gas_estimates(created_at DESC);

CREATE INDEX idx_gas_recommendations_status ON gas_optimization_recommendations(status);
CREATE INDEX idx_gas_recommendations_priority ON gas_optimization_recommendations(priority);
CREATE INDEX idx_gas_recommendations_assigned ON gas_optimization_recommendations(assigned_to);

CREATE INDEX idx_gas_budgets_network ON gas_cost_budgets(network);
CREATE INDEX idx_gas_budgets_active ON gas_cost_budgets(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_gas_budgets_period ON gas_cost_budgets(budget_period, next_reset_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE gas_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_gas_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_cost_budgets ENABLE ROW LEVEL SECURITY;

-- Anyone can view gas price snapshots
CREATE POLICY "Public can view gas snapshots"
    ON gas_price_snapshots FOR SELECT
    USING (TRUE);

-- Users can view their own transaction costs
CREATE POLICY "Users can view own transaction costs"
    ON transaction_gas_costs FOR SELECT
    USING (
        initiated_by = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Users can view their own estimates
CREATE POLICY "Users can view own estimates"
    ON gas_estimates FOR SELECT
    USING (
        requested_by = (auth.jwt() ->> 'sub')::UUID
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can manage recommendations
CREATE POLICY "Admins can manage recommendations"
    ON gas_optimization_recommendations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- Admins can manage budgets
CREATE POLICY "Admins can manage budgets"
    ON gas_cost_budgets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (auth.jwt() ->> 'sub')::UUID
            AND profiles.is_admin = TRUE
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Record gas price snapshot
CREATE OR REPLACE FUNCTION record_gas_snapshot(
    p_network VARCHAR,
    p_fast_price DECIMAL,
    p_standard_price DECIMAL,
    p_slow_price DECIMAL,
    p_base_fee DECIMAL DEFAULT NULL,
    p_priority_fee DECIMAL DEFAULT NULL,
    p_token_usd_price DECIMAL DEFAULT NULL,
    p_block_number BIGINT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_congestion VARCHAR(20);
BEGIN
    -- Determine network congestion based on gas prices
    IF p_fast_price > 100 THEN
        v_congestion := 'EXTREME';
    ELSIF p_fast_price > 50 THEN
        v_congestion := 'HIGH';
    ELSIF p_fast_price > 20 THEN
        v_congestion := 'MEDIUM';
    ELSE
        v_congestion := 'LOW';
    END IF;
    
    INSERT INTO gas_price_snapshots (
        network,
        fast_gas_price,
        standard_gas_price,
        slow_gas_price,
        base_fee,
        priority_fee,
        native_token_usd_price,
        block_number,
        network_congestion
    ) VALUES (
        p_network,
        p_fast_price,
        p_standard_price,
        p_slow_price,
        p_base_fee,
        p_priority_fee,
        p_token_usd_price,
        p_block_number,
        v_congestion
    )
    RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record transaction gas cost
CREATE OR REPLACE FUNCTION record_transaction_gas(
    p_tx_hash VARCHAR,
    p_network VARCHAR,
    p_transaction_type VARCHAR,
    p_initiated_by UUID,
    p_wallet_address VARCHAR,
    p_gas_limit BIGINT,
    p_gas_used BIGINT,
    p_gas_price DECIMAL,
    p_status VARCHAR DEFAULT 'SUCCESS'
)
RETURNS UUID AS $$
DECLARE
    v_tx_id UUID;
    v_native_cost DECIMAL;
    v_usd_cost DECIMAL;
    v_token_price DECIMAL;
BEGIN
    -- Calculate native token cost (gas_used * gas_price in gwei -> ETH)
    v_native_cost := (p_gas_used::DECIMAL * p_gas_price) / 1000000000.0;
    
    -- Get latest token price for USD conversion
    SELECT native_token_usd_price INTO v_token_price
    FROM gas_price_snapshots
    WHERE network = p_network
    ORDER BY timestamp DESC
    LIMIT 1;
    
    v_usd_cost := v_native_cost * COALESCE(v_token_price, 0);
    
    INSERT INTO transaction_gas_costs (
        tx_hash,
        network,
        transaction_type,
        initiated_by,
        wallet_address,
        gas_limit,
        gas_used,
        gas_price,
        total_gas_cost_native,
        total_gas_cost_usd,
        status
    ) VALUES (
        p_tx_hash,
        p_network,
        p_transaction_type,
        p_initiated_by,
        p_wallet_address,
        p_gas_limit,
        p_gas_used,
        p_gas_price,
        v_native_cost,
        v_usd_cost,
        p_status
    )
    RETURNING id INTO v_tx_id;
    
    -- Update budget spending
    UPDATE gas_cost_budgets
    SET current_spending_usd = current_spending_usd + v_usd_cost,
        is_exceeded = (current_spending_usd + v_usd_cost) > budget_limit_usd,
        updated_at = NOW()
    WHERE network = p_network
    AND is_active = TRUE
    AND next_reset_at > NOW();
    
    -- Log event for high costs
    IF v_usd_cost > 50 THEN
        INSERT INTO security_events (event_type, severity, actor, description, metadata)
        VALUES (
            'HIGH_GAS_COST',
            'MEDIUM',
            p_initiated_by::TEXT,
            format('High gas cost transaction: $%.2f', v_usd_cost),
            jsonb_build_object(
                'tx_hash', p_tx_hash,
                'cost_usd', v_usd_cost,
                'gas_used', p_gas_used,
                'transaction_type', p_transaction_type
            )
        );
    END IF;
    
    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create gas estimate
CREATE OR REPLACE FUNCTION create_gas_estimate(
    p_network VARCHAR,
    p_operation_type VARCHAR,
    p_estimated_gas BIGINT,
    p_requested_by UUID
)
RETURNS TABLE(
    estimate_id UUID,
    fast_cost_usd DECIMAL,
    standard_cost_usd DECIMAL,
    slow_cost_usd DECIMAL
) AS $$
DECLARE
    v_estimate_id UUID;
    v_snapshot RECORD;
    v_fast_cost DECIMAL;
    v_standard_cost DECIMAL;
    v_slow_cost DECIMAL;
BEGIN
    -- Get latest gas prices
    SELECT * INTO v_snapshot
    FROM gas_price_snapshots
    WHERE network = p_network
    ORDER BY timestamp DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No gas price data available for network: %', p_network;
    END IF;
    
    -- Calculate costs in USD
    v_fast_cost := (p_estimated_gas::DECIMAL * v_snapshot.fast_gas_price / 1000000000.0) * 
                   COALESCE(v_snapshot.native_token_usd_price, 0);
    v_standard_cost := (p_estimated_gas::DECIMAL * v_snapshot.standard_gas_price / 1000000000.0) * 
                       COALESCE(v_snapshot.native_token_usd_price, 0);
    v_slow_cost := (p_estimated_gas::DECIMAL * v_snapshot.slow_gas_price / 1000000000.0) * 
                   COALESCE(v_snapshot.native_token_usd_price, 0);
    
    -- Insert estimate
    INSERT INTO gas_estimates (
        network,
        operation_type,
        estimated_gas_limit,
        estimated_gas_price_fast,
        estimated_gas_price_standard,
        estimated_gas_price_slow,
        estimated_cost_fast_usd,
        estimated_cost_standard_usd,
        estimated_cost_slow_usd,
        estimated_time_fast_seconds,
        estimated_time_standard_seconds,
        estimated_time_slow_seconds,
        requested_by
    ) VALUES (
        p_network,
        p_operation_type,
        p_estimated_gas,
        v_snapshot.fast_gas_price,
        v_snapshot.standard_gas_price,
        v_snapshot.slow_gas_price,
        v_fast_cost,
        v_standard_cost,
        v_slow_cost,
        15,  -- Fast: ~15 seconds
        30,  -- Standard: ~30 seconds
        120, -- Slow: ~2 minutes
        p_requested_by
    )
    RETURNING id INTO v_estimate_id;
    
    RETURN QUERY SELECT v_estimate_id, v_fast_cost, v_standard_cost, v_slow_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get gas cost analytics
CREATE OR REPLACE FUNCTION get_gas_analytics(
    p_network VARCHAR,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_transactions BIGINT,
    total_cost_usd DECIMAL,
    average_cost_usd DECIMAL,
    median_gas_price DECIMAL,
    total_gas_used BIGINT,
    successful_txs BIGINT,
    failed_txs BIGINT,
    most_expensive_operation VARCHAR,
    optimization_potential_usd DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH tx_stats AS (
        SELECT
            COUNT(*) as tx_count,
            SUM(total_gas_cost_usd) as total_spent,
            AVG(total_gas_cost_usd) as avg_cost,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gas_price) as median_price,
            SUM(gas_used) as total_gas,
            SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success_count,
            SUM(CASE WHEN status IN ('FAILED', 'REVERTED') THEN 1 ELSE 0 END) as fail_count
        FROM transaction_gas_costs
        WHERE network = p_network
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    ),
    most_expensive AS (
        SELECT transaction_type
        FROM transaction_gas_costs
        WHERE network = p_network
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        GROUP BY transaction_type
        ORDER BY SUM(total_gas_cost_usd) DESC
        LIMIT 1
    ),
    optimization AS (
        SELECT COALESCE(SUM(potential_savings_usd_monthly), 0) as savings
        FROM gas_optimization_recommendations
        WHERE status = 'ACTIVE'
    )
    SELECT
        tx_stats.tx_count,
        COALESCE(tx_stats.total_spent, 0),
        COALESCE(tx_stats.avg_cost, 0),
        COALESCE(tx_stats.median_price, 0),
        COALESCE(tx_stats.total_gas, 0),
        COALESCE(tx_stats.success_count, 0),
        COALESCE(tx_stats.fail_count, 0),
        COALESCE(most_expensive.transaction_type, 'N/A'),
        COALESCE(optimization.savings, 0)
    FROM tx_stats, most_expensive, optimization;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset budget periods
CREATE OR REPLACE FUNCTION reset_expired_budgets()
RETURNS TABLE(
    budgets_reset INTEGER
) AS $$
DECLARE
    v_reset_count INTEGER := 0;
BEGIN
    -- Reset budgets where reset period has passed
    UPDATE gas_cost_budgets
    SET current_spending_usd = 0.00,
        is_exceeded = FALSE,
        last_reset_at = NOW(),
        next_reset_at = CASE budget_period
            WHEN 'DAILY' THEN NOW() + INTERVAL '1 day'
            WHEN 'WEEKLY' THEN NOW() + INTERVAL '7 days'
            WHEN 'MONTHLY' THEN NOW() + INTERVAL '1 month'
            WHEN 'QUARTERLY' THEN NOW() + INTERVAL '3 months'
            WHEN 'YEARLY' THEN NOW() + INTERVAL '1 year'
        END,
        updated_at = NOW()
    WHERE is_active = TRUE
    AND next_reset_at <= NOW();
    
    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

INSERT INTO system_settings (key, value, category, description) VALUES
('gas_tracking_enabled', 'true', 'gas', 'Enable gas cost tracking'),
('gas_snapshot_interval_minutes', '5', 'gas', 'Interval for capturing gas price snapshots'),
('gas_high_cost_alert_usd', '50.00', 'gas', 'Alert threshold for high gas costs'),
('gas_budget_alert_enabled', 'true', 'gas', 'Enable budget threshold alerts'),
('gas_optimization_enabled', 'true', 'gas', 'Enable automatic optimization recommendations')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default gas optimization recommendations
INSERT INTO gas_optimization_recommendations (
    recommendation_type,
    priority,
    title,
    description,
    potential_savings_percentage,
    implementation_difficulty,
    estimated_implementation_hours,
    status,
    affected_operations
) VALUES
(
    'BATCH_OPERATIONS',
    'HIGH',
    'Batch Multiple NFT Mints',
    'Instead of minting NFTs one at a time, batch multiple mints into a single transaction. This can save up to 40% on gas costs.',
    40.00,
    'MEDIUM',
    8,
    'ACTIVE',
    ARRAY['MINT_NFT']
),
(
    'TIMING',
    'MEDIUM',
    'Execute Transactions During Low Congestion',
    'Monitor gas prices and execute non-urgent transactions during low congestion periods (typically weekends and late nights UTC).',
    25.00,
    'EASY',
    2,
    'ACTIVE',
    ARRAY['ROLE_ASSIGNMENT', 'PERMISSION_UPDATE', 'METADATA_UPDATE']
),
(
    'CONTRACT_UPGRADE',
    'MEDIUM',
    'Optimize Storage Layout',
    'Review smart contract storage layout and pack variables efficiently to reduce SSTORE operations.',
    15.00,
    'HARD',
    24,
    'ACTIVE',
    ARRAY['ALL']
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE gas_price_snapshots IS 'Historical gas price data for network monitoring';
COMMENT ON TABLE transaction_gas_costs IS 'Actual gas costs for executed transactions';
COMMENT ON TABLE gas_estimates IS 'Pre-transaction gas cost estimates';
COMMENT ON TABLE gas_optimization_recommendations IS 'Automated and manual gas optimization suggestions';
COMMENT ON TABLE gas_cost_budgets IS 'Gas spending budgets and limits';

COMMENT ON FUNCTION record_gas_snapshot IS 'Record a gas price snapshot from the network';
COMMENT ON FUNCTION record_transaction_gas IS 'Record actual gas cost after transaction execution';
COMMENT ON FUNCTION create_gas_estimate IS 'Create cost estimate before transaction';
COMMENT ON FUNCTION get_gas_analytics IS 'Get aggregated gas cost analytics for a period';
COMMENT ON FUNCTION reset_expired_budgets IS 'Reset budget periods (run via cron)';
