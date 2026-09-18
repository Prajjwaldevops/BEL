/**
 * Audit Batching Service
 * 
 * Manages batching of audit events and Merkle root anchoring to blockchain.
 * Reduces gas costs by ~100x while maintaining tamper-evidence.
 */

import { createClient } from '@supabase/supabase-js'
import {
  buildMerkleTree,
  generateAllProofs,
  computeMerkleRoot,
  serializeMerkleTree,
  MerkleTreeData,
} from './merkle-tree'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface AuditEvent {
  id: string
  actor_id?: string
  actor_role?: string
  action: string
  resource_id?: string
  resource_type?: string
  result?: string
  details?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  event_hash: string
  created_at: string
}

export interface AuditBatch {
  id: string
  merkle_root: string
  event_count: number
  start_event_id: string
  end_event_id: string
  tx_hash?: string
  block_number?: number
  gas_used?: number
  anchored_by?: string
  anchored_at: string
  batch_data: MerkleTreeData
}

/**
 * Queue an audit event (replaces direct on-chain logging)
 * 
 * @param event Event data to queue
 * @returns Queued event with computed hash
 */
export async function queueAuditEvent(event: Omit<AuditEvent, 'id' | 'event_hash' | 'created_at'>): Promise<{
  success: boolean
  event?: AuditEvent
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('audit_log_queue')
      .insert({
        actor_id: event.actor_id,
        actor_role: event.actor_role,
        action: event.action,
        resource_id: event.resource_id,
        resource_type: event.resource_type,
        result: event.result || 'SUCCESS',
        details: event.details,
        metadata: event.metadata || {},
        ip_address: event.ip_address,
        user_agent: event.user_agent,
      })
      .select()
      .single()

    if (error) {
      console.error('Error queuing audit event:', error)
      return { success: false, error: 'Failed to queue audit event' }
    }

    return { success: true, event: data }
  } catch (error) {
    console.error('Exception queuing audit event:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Get pending (unanchored) audit events
 * 
 * @param limit Maximum number of events to fetch
 * @returns Array of pending events
 */
export async function getPendingEvents(limit: number = 100): Promise<{
  success: boolean
  events?: AuditEvent[]
  count?: number
  error?: string
}> {
  try {
    const { data, error, count } = await supabase
      .from('audit_log_queue')
      .select('*', { count: 'exact' })
      .eq('anchored', false)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching pending events:', error)
      return { success: false, error: 'Failed to fetch pending events' }
    }

    return { success: true, events: data || [], count: count || 0 }
  } catch (error) {
    console.error('Exception fetching pending events:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Create a batch and compute Merkle root
 * 
 * @param events Events to batch
 * @returns Batch data with Merkle tree
 */
export async function createAuditBatch(events: AuditEvent[]): Promise<{
  success: boolean
  batch?: {
    merkle_root: string
    tree: MerkleTreeData
    proofs: Array<{ event_id: string; proof: string[]; leaf_index: number }>
  }
  error?: string
}> {
  try {
    if (events.length === 0) {
      return { success: false, error: 'No events to batch' }
    }

    // Extract event hashes (these are the Merkle tree leaves)
    const leaves = events.map(e => e.event_hash)

    // Build Merkle tree
    const tree = buildMerkleTree(leaves)

    // Generate proofs for all events
    const allProofs = generateAllProofs(tree)
    const proofs = allProofs.map((proof, index) => ({
      event_id: events[index].id,
      proof: proof.proof,
      leaf_index: proof.leafIndex,
    }))

    return {
      success: true,
      batch: {
        merkle_root: tree.root,
        tree,
        proofs,
      },
    }
  } catch (error) {
    console.error('Exception creating audit batch:', error)
    return { success: false, error: 'Failed to create batch' }
  }
}

/**
 * Anchor a batch to the database (before blockchain submission)
 * 
 * @param events Events in the batch
 * @param merkleRoot Computed Merkle root
 * @param tree Merkle tree structure
 * @param proofs Proof data for each event
 * @param anchoredBy Profile ID of user anchoring the batch
 * @returns Batch record
 */
export async function anchorBatchToDatabase(
  events: AuditEvent[],
  merkleRoot: string,
  tree: MerkleTreeData,
  proofs: Array<{ event_id: string; proof: string[]; leaf_index: number }>,
  anchoredBy?: string
): Promise<{
  success: boolean
  batch?: AuditBatch
  error?: string
}> {
  try {
    // Insert batch record
    const { data: batch, error: batchError } = await supabase
      .from('audit_batches')
      .insert({
        merkle_root: merkleRoot,
        event_count: events.length,
        start_event_id: events[0].id,
        end_event_id: events[events.length - 1].id,
        anchored_by: anchoredBy,
        batch_data: serializeMerkleTree(tree),
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error inserting batch:', batchError)
      return { success: false, error: 'Failed to insert batch' }
    }

    // Update events to mark as anchored
    const { error: updateError } = await supabase
      .from('audit_log_queue')
      .update({
        batch_id: batch.id,
        anchored: true,
      })
      .in('id', events.map(e => e.id))

    if (updateError) {
      console.error('Error updating events:', updateError)
      return { success: false, error: 'Failed to update events' }
    }

    // Insert Merkle proofs
    const proofRecords = proofs.map(p => ({
      event_id: p.event_id,
      batch_id: batch.id,
      leaf_index: p.leaf_index,
      proof: p.proof,
    }))

    const { error: proofsError } = await supabase
      .from('merkle_proofs')
      .insert(proofRecords)

    if (proofsError) {
      console.error('Error inserting proofs:', proofsError)
      return { success: false, error: 'Failed to insert proofs' }
    }

    return { success: true, batch }
  } catch (error) {
    console.error('Exception anchoring batch:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Update batch with blockchain transaction details
 * 
 * @param batchId Batch ID
 * @param txHash Transaction hash
 * @param blockNumber Block number
 * @param gasUsed Gas used
 * @returns Success status
 */
export async function updateBatchWithTx(
  batchId: string,
  txHash: string,
  blockNumber?: number,
  gasUsed?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('audit_batches')
      .update({
        tx_hash: txHash,
        block_number: blockNumber,
        gas_used: gasUsed,
      })
      .eq('id', batchId)

    if (error) {
      console.error('Error updating batch with tx:', error)
      return { success: false, error: 'Failed to update batch' }
    }

    return { success: true }
  } catch (error) {
    console.error('Exception updating batch with tx:', error)
    return { success: false, error: 'Internal error' }
  }
}

/**
 * Get batch configuration from system settings
 */
export async function getBatchConfig(): Promise<{
  batchSize: number
  intervalMinutes: number
  enabled: boolean
}> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['audit_batch_size', 'audit_batch_interval_minutes', 'audit_batch_enabled'])

    if (error || !data) {
      // Return defaults if settings not found
      return {
        batchSize: 100,
        intervalMinutes: 60,
        enabled: true,
      }
    }

    const settings = Object.fromEntries(data.map(s => [s.key, s.value]))

    return {
      batchSize: parseInt(settings.audit_batch_size || '100'),
      intervalMinutes: parseInt(settings.audit_batch_interval_minutes || '60'),
      enabled: settings.audit_batch_enabled !== 'false',
    }
  } catch (error) {
    console.error('Error fetching batch config:', error)
    return {
      batchSize: 100,
      intervalMinutes: 60,
      enabled: true,
    }
  }
}

/**
 * Check if batching should be triggered
 * 
 * @returns True if batch should be created
 */
export async function shouldTriggerBatch(): Promise<{
  shouldTrigger: boolean
  reason?: string
  pendingCount?: number
}> {
  const config = await getBatchConfig()

  if (!config.enabled) {
    return { shouldTrigger: false, reason: 'Batching disabled' }
  }

  const { events, count } = await getPendingEvents(1)

  if (!events || count === 0) {
    return { shouldTrigger: false, reason: 'No pending events', pendingCount: 0 }
  }

  // Check if we have enough events
  if (count && count >= config.batchSize) {
    return {
      shouldTrigger: true,
      reason: `Event count threshold reached (${count} >= ${config.batchSize})`,
      pendingCount: count,
    }
  }

  // Check if oldest event is older than interval
  const oldestEvent = events[0]
  const eventAge = Date.now() - new Date(oldestEvent.created_at).getTime()
  const intervalMs = config.intervalMinutes * 60 * 1000

  if (eventAge >= intervalMs) {
    return {
      shouldTrigger: true,
      reason: `Time threshold reached (${Math.floor(eventAge / 60000)} min >= ${config.intervalMinutes} min)`,
      pendingCount: count,
    }
  }

  return {
    shouldTrigger: false,
    reason: `Waiting for threshold (${count}/${config.batchSize} events, ${Math.floor(eventAge / 60000)}/${config.intervalMinutes} min)`,
    pendingCount: count,
  }
}

/**
 * Get Merkle proof for a specific event
 * 
 * @param eventId Event ID
 * @returns Merkle proof data
 */
export async function getEventProof(eventId: string): Promise<{
  success: boolean
  proof?: {
    event: AuditEvent
    merkle_root: string
    leaf_index: number
    proof_path: string[]
    batch_id: string
    tx_hash?: string
  }
  error?: string
}> {
  try {
    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('audit_log_queue')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return { success: false, error: 'Event not found' }
    }

    if (!event.anchored || !event.batch_id) {
      return { success: false, error: 'Event not yet anchored' }
    }

    // Fetch proof
    const { data: proofData, error: proofError } = await supabase
      .from('merkle_proofs')
      .select('*')
      .eq('event_id', eventId)
      .single()

    if (proofError || !proofData) {
      return { success: false, error: 'Proof not found' }
    }

    // Fetch batch
    const { data: batch, error: batchError } = await supabase
      .from('audit_batches')
      .select('merkle_root, tx_hash')
      .eq('id', event.batch_id)
      .single()

    if (batchError || !batch) {
      return { success: false, error: 'Batch not found' }
    }

    return {
      success: true,
      proof: {
        event,
        merkle_root: batch.merkle_root,
        leaf_index: proofData.leaf_index,
        proof_path: proofData.proof,
        batch_id: event.batch_id,
        tx_hash: batch.tx_hash,
      },
    }
  } catch (error) {
    console.error('Exception fetching event proof:', error)
    return { success: false, error: 'Internal error' }
  }
}
