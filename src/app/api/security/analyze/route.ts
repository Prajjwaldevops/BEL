import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeSecurityThreat,
  detectAnomalies,
  generateSecurityReport
} from '@/lib/aws-bedrock-security';

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    if (!action || !data) {
      return NextResponse.json(
        { error: 'Action and data are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'threat':
        if (!data.event) {
          return NextResponse.json(
            { error: 'Event data is required for threat analysis' },
            { status: 400 }
          );
        }
        result = await analyzeSecurityThreat(data.event);
        break;

      case 'anomaly':
        if (!data.activities || !Array.isArray(data.activities)) {
          return NextResponse.json(
            { error: 'Activities array is required for anomaly detection' },
            { status: 400 }
          );
        }
        result = await detectAnomalies(data.activities);
        break;

      case 'report':
        if (!data.incidents || !Array.isArray(data.incidents)) {
          return NextResponse.json(
            { error: 'Incidents array is required for report generation' },
            { status: 400 }
          );
        }
        result = await generateSecurityReport(data.incidents);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security analysis error:', error);
    
    // Check if it's an AWS configuration error
    if (error instanceof Error && error.message.includes('AWS')) {
      return NextResponse.json(
        { 
          error: 'AWS Bedrock not configured. Add AWS credentials to environment variables.',
          details: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Analysis failed'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check AWS Bedrock configuration status
    const isConfigured = !!(
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    );

    return NextResponse.json({
      configured: isConfigured,
      region: process.env.AWS_REGION || 'not-set',
      features: {
        threatAnalysis: isConfigured,
        anomalyDetection: isConfigured,
        reportGeneration: isConfigured
      }
    });

  } catch (error) {
    console.error('Configuration check error:', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}
