const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('.env.local'));

const tables = [
  'profiles', 'roles', 'user_roles', 'identities', 'assets', 'asset_ownership_history', 
  'asset_permissions', 'audit_logs', 'activity_gas_fees', 'login_trails', 
  'confidential_access_log', 'blockchain_transactions', 'blockchain_events', 'documents', 
  'ipfs_objects', 'security_events', 'system_settings', 'notifications', 'access_requests', 
  'invite_tokens', 'audit_log_queue', 'audit_batches', 'merkle_proofs', 
  'sensitive_field_access_log', 'encryption_keys', 'recovery_guardians', 'recovery_requests', 
  'guardian_approvals', 'recovery_executions', 'pending_approvals', 'approval_votes', 
  'approval_executions', 'multisig_config', 'access_grant_history', 'access_delegations', 
  'login_attempts', 'account_unlocks', 'rate_limit_config', 'gas_price_snapshots', 
  'transaction_gas_costs', 'gas_estimates', 'gas_optimization_recommendations', 
  'gas_cost_budgets', 'credential_schemas', 'verifiable_credentials', 'credential_presentations', 
  'credential_verifications', 'trusted_issuers', 'credential_requests', 'security_incidents', 
  'incident_events', 'incident_responses', 'incident_notes', 'incident_playbooks', 
  'security_posture_metrics', 'security_risks', 'compliance_requirements', 'security_controls', 
  'security_assessments', 'security_alerts', 'document_access_logs'
];

async function checkTables() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  let missing = [];
  let found = [];
  
  for (const table of tables) {
    const res = await fetch(url + '/rest/v1/' + table + '?limit=1', {
      headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key
      }
    });
    
    if (res.ok) {
      found.push(table);
    } else {
      missing.push(table);
    }
  }
  
  console.log('--- FOUND TABLES ---');
  console.log(found.join(', '));
  console.log('\n--- MISSING TABLES ---');
  console.log(missing.join(', '));
}

checkTables().catch(console.error);
