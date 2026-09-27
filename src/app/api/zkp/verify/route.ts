import { NextRequest, NextResponse } from 'next/server';
import {
  verifyClearanceProof,
  verifyMembershipProof,
  verifyAttributeProof,
  verifyIdentityOwnershipProof
} from '@/lib/zero-knowledge-proofs';

export async function POST(request: NextRequest) {
  try {
    const { proofType, proof, publicInputs } = await request.json();

    if (!proofType || !proof) {
      return NextResponse.json(
        { error: 'Proof type and proof data are required' },
        { status: 400 }
      );
    }

    let isValid = false;

    switch (proofType) {
      case 'clearance':
        if (!publicInputs?.requiredLevel) {
          return NextResponse.json(
            { error: 'requiredLevel is required for clearance verification' },
            { status: 400 }
          );
        }
        isValid = await verifyClearanceProof(proof, publicInputs.requiredLevel);
        break;

      case 'membership':
        if (!publicInputs?.groupId) {
          return NextResponse.json(
            { error: 'groupId is required for membership verification' },
            { status: 400 }
          );
        }
        isValid = await verifyMembershipProof(proof, publicInputs.groupId);
        break;

      case 'attribute':
        if (!publicInputs?.attributesToProve) {
          return NextResponse.json(
            { error: 'attributesToProve is required for attribute verification' },
            { status: 400 }
          );
        }
        isValid = await verifyAttributeProof(proof, publicInputs.attributesToProve);
        break;

      case 'ownership':
        if (!publicInputs?.assetId) {
          return NextResponse.json(
            { error: 'assetId is required for ownership verification' },
            { status: 400 }
          );
        }
        isValid = await verifyIdentityOwnershipProof(proof, publicInputs.assetId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown proof type: ${proofType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      verified: isValid,
      proofType,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('ZKP verification error:', error);
    return NextResponse.json(
      { 
        verified: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      },
      { status: 500 }
    );
  }
}
