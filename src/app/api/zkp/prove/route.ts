import { NextRequest, NextResponse } from 'next/server';
import {
  proveClearanceLevel,
  proveMembership,
  proveAttribute,
  proveIdentityOwnership
} from '@/lib/zero-knowledge-proofs';

export async function POST(request: NextRequest) {
  try {
    const { proofType, data } = await request.json();

    if (!proofType || !data) {
      return NextResponse.json(
        { error: 'Proof type and data are required' },
        { status: 400 }
      );
    }

    let proof;

    switch (proofType) {
      case 'clearance':
        if (!data.level || !data.requiredLevel) {
          return NextResponse.json(
            { error: 'level and requiredLevel are required for clearance proof' },
            { status: 400 }
          );
        }
        proof = await proveClearanceLevel(data.level, data.requiredLevel);
        break;

      case 'membership':
        if (!data.memberId || !data.groupId || !data.validMembers) {
          return NextResponse.json(
            { error: 'memberId, groupId, and validMembers are required for membership proof' },
            { status: 400 }
          );
        }
        proof = await proveMembership(
          data.memberId,
          data.groupId,
          data.validMembers
        );
        break;

      case 'attribute':
        if (!data.attributes || !data.attributesToProve) {
          return NextResponse.json(
            { error: 'attributes and attributesToProve are required for attribute proof' },
            { status: 400 }
          );
        }
        proof = await proveAttribute(
          data.attributes,
          data.attributesToProve
        );
        break;

      case 'ownership':
        if (!data.assetId || !data.ownerId) {
          return NextResponse.json(
            { error: 'assetId and ownerId are required for ownership proof' },
            { status: 400 }
          );
        }
        proof = await proveIdentityOwnership(data.assetId, data.ownerId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown proof type: ${proofType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      proofType,
      proof,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('ZKP generation error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Proof generation failed'
      },
      { status: 500 }
    );
  }
}
