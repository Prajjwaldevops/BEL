/**
 * Merkle Tree Implementation for Audit Log Batching
 * 
 * Computes Merkle roots and generates proofs for efficient on-chain anchoring
 * of audit events while maintaining individual event verifiability.
 */

import { createHash } from 'crypto'

export interface MerkleProof {
  leaf: string
  leafIndex: number
  proof: string[]
  root: string
}

export interface MerkleTreeData {
  root: string
  leaves: string[]
  layers: string[][]
}

/**
 * Hash a single value with SHA-256
 */
function hash(data: string): string {
  return '0x' + createHash('sha256').update(data).digest('hex')
}

/**
 * Hash two values together (for internal nodes)
 */
function hashPair(left: string, right: string): string {
  // Sort hashes to make tree structure deterministic
  const [a, b] = [left, right].sort()
  return hash(a + b)
}

/**
 * Build a Merkle tree from an array of leaf hashes
 * 
 * @param leaves Array of leaf hashes (must be hex strings starting with 0x)
 * @returns Merkle tree structure with root and all layers
 */
export function buildMerkleTree(leaves: string[]): MerkleTreeData {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree from empty leaves array')
  }

  // Ensure all leaves are hex strings
  const validatedLeaves = leaves.map(leaf => {
    if (!leaf.startsWith('0x')) {
      throw new Error(`Invalid leaf hash: ${leaf} (must start with 0x)`)
    }
    return leaf.toLowerCase()
  })

  // Build tree bottom-up
  const layers: string[][] = [validatedLeaves]
  
  while (layers[layers.length - 1].length > 1) {
    const currentLayer = layers[layers.length - 1]
    const nextLayer: string[] = []
    
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i]
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left // Duplicate if odd
      nextLayer.push(hashPair(left, right))
    }
    
    layers.push(nextLayer)
  }

  const root = layers[layers.length - 1][0]

  return {
    root,
    leaves: validatedLeaves,
    layers,
  }
}

/**
 * Generate a Merkle proof for a specific leaf
 * 
 * @param tree Merkle tree structure
 * @param leafIndex Index of the leaf to prove (0-based)
 * @returns Merkle proof (array of sibling hashes)
 */
export function generateMerkleProof(tree: MerkleTreeData, leafIndex: number): MerkleProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(`Invalid leaf index: ${leafIndex}`)
  }

  const proof: string[] = []
  let index = leafIndex

  // Traverse tree from leaf to root, collecting sibling hashes
  for (let layerIndex = 0; layerIndex < tree.layers.length - 1; layerIndex++) {
    const layer = tree.layers[layerIndex]
    const isRightNode = index % 2 === 1
    const siblingIndex = isRightNode ? index - 1 : index + 1

    // Add sibling hash if it exists
    if (siblingIndex < layer.length) {
      proof.push(layer[siblingIndex])
    }

    // Move to parent index
    index = Math.floor(index / 2)
  }

  return {
    leaf: tree.leaves[leafIndex],
    leafIndex,
    proof,
    root: tree.root,
  }
}

/**
 * Verify a Merkle proof
 * 
 * @param leaf Leaf hash to verify
 * @param proof Array of sibling hashes
 * @param root Expected Merkle root
 * @param leafIndex Position of leaf in tree (needed to determine left/right)
 * @returns True if proof is valid
 */
export function verifyMerkleProof(
  leaf: string,
  proof: string[],
  root: string,
  leafIndex: number
): boolean {
  let computedHash = leaf.toLowerCase()
  let index = leafIndex

  for (const sibling of proof) {
    const isRightNode = index % 2 === 1
    
    if (isRightNode) {
      computedHash = hashPair(sibling.toLowerCase(), computedHash)
    } else {
      computedHash = hashPair(computedHash, sibling.toLowerCase())
    }
    
    index = Math.floor(index / 2)
  }

  return computedHash === root.toLowerCase()
}

/**
 * Batch generate proofs for all leaves in a tree
 * 
 * @param tree Merkle tree structure
 * @returns Array of proofs for each leaf
 */
export function generateAllProofs(tree: MerkleTreeData): MerkleProof[] {
  return tree.leaves.map((_, index) => generateMerkleProof(tree, index))
}

/**
 * Compute Merkle root directly from leaves (convenience function)
 * 
 * @param leaves Array of leaf hashes
 * @returns Merkle root hash
 */
export function computeMerkleRoot(leaves: string[]): string {
  const tree = buildMerkleTree(leaves)
  return tree.root
}

/**
 * Serialize Merkle tree for database storage
 * 
 * @param tree Merkle tree structure
 * @returns JSON-serializable object
 */
export function serializeMerkleTree(tree: MerkleTreeData): object {
  return {
    root: tree.root,
    leaves: tree.leaves,
    leafCount: tree.leaves.length,
    depth: tree.layers.length - 1,
    // Store only necessary layers for space efficiency
    layers: tree.layers.slice(0, Math.min(tree.layers.length, 10)), // Limit storage
  }
}

/**
 * Compute hash of audit event data (matches database function)
 * 
 * @param event Audit event data
 * @returns SHA-256 hash of event
 */
export function computeEventHash(event: {
  actor_id?: string
  action: string
  resource_id?: string
  resource_type?: string
  result?: string
  details?: string
  created_at: string
}): string {
  const data = [
    event.actor_id || '',
    event.action || '',
    event.resource_id || '',
    event.resource_type || '',
    event.result || '',
    event.details || '',
    event.created_at || '',
  ].join('|')

  return hash(data)
}

/**
 * Validate Merkle tree structure
 * 
 * @param tree Merkle tree to validate
 * @returns True if tree is valid
 */
export function validateMerkleTree(tree: MerkleTreeData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check leaves exist
  if (!tree.leaves || tree.leaves.length === 0) {
    errors.push('Tree has no leaves')
  }

  // Check all leaves are valid hashes
  tree.leaves.forEach((leaf, i) => {
    if (!leaf.startsWith('0x') || leaf.length !== 66) {
      errors.push(`Invalid leaf at index ${i}: ${leaf}`)
    }
  })

  // Check layers exist and are correctly sized
  if (!tree.layers || tree.layers.length === 0) {
    errors.push('Tree has no layers')
  } else {
    // First layer should match leaves
    if (tree.layers[0].length !== tree.leaves.length) {
      errors.push('First layer does not match leaves')
    }

    // Each layer should be roughly half the size of previous
    for (let i = 1; i < tree.layers.length; i++) {
      const prevSize = tree.layers[i - 1].length
      const currSize = tree.layers[i].length
      const expectedSize = Math.ceil(prevSize / 2)
      
      if (currSize !== expectedSize) {
        errors.push(`Layer ${i} has incorrect size: ${currSize} (expected ${expectedSize})`)
      }
    }

    // Last layer should have exactly 1 element (the root)
    if (tree.layers[tree.layers.length - 1].length !== 1) {
      errors.push('Root layer does not have exactly 1 element')
    }

    // Root should match
    if (tree.layers[tree.layers.length - 1][0] !== tree.root) {
      errors.push('Root does not match top of tree')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
