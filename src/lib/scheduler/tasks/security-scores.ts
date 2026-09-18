/**
 * Security Score Update Task
 * Calculates and updates security posture scores for all users/resources
 */

import { createServiceClient } from '@/lib/supabase/service';

export async function updateSecurityScores() {
  const supabase = createServiceClient();

  // Calculate security scores using the database function
  const { data, error } = await supabase
    .rpc('calculate_security_score');

  if (error) {
    console.error('[SecurityScores] Failed to calculate scores:', error);
    throw error;
  }

  console.log('[SecurityScores] Security scores calculated:', data);

  // Get all active users for individual score updates
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, wallet_address');

  if (profilesError) {
    console.error('[SecurityScores] Failed to fetch profiles:', profilesError);
    throw profilesError;
  }

  if (!profiles || profiles.length === 0) {
    console.log('[SecurityScores] No profiles to update');
    return { updated: 0 };
  }

  console.log(`[SecurityScores] Updating scores for ${profiles.length} profiles`);

  let updatedCount = 0;
  const now = new Date().toISOString();

  // Update score for each profile
  for (const profile of profiles) {
    try {
      // Calculate individual score based on various factors
      const { data: userIncidents } = await supabase
        .from('security_incidents')
        .select('severity')
        .eq('affected_user_id', profile.id)
        .eq('status', 'open');

      const { data: userAlerts } = await supabase
        .from('security_alerts')
        .select('severity')
        .eq('status', 'active');

      // Base score: 100
      let score = 100;

      // Deduct points for incidents
      if (userIncidents) {
        const criticalIncidents = userIncidents.filter(i => i.severity === 'critical').length;
        const highIncidents = userIncidents.filter(i => i.severity === 'high').length;
        const mediumIncidents = userIncidents.filter(i => i.severity === 'medium').length;
        
        score -= criticalIncidents * 20;
        score -= highIncidents * 10;
        score -= mediumIncidents * 5;
      }

      // Deduct points for active alerts
      if (userAlerts) {
        const criticalAlerts = userAlerts.filter(a => a.severity === 'critical').length;
        const highAlerts = userAlerts.filter(a => a.severity === 'high').length;
        
        score -= criticalAlerts * 10;
        score -= highAlerts * 5;
      }

      // Ensure score is between 0 and 100
      score = Math.max(0, Math.min(100, score));

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (score >= 80) riskLevel = 'low';
      else if (score >= 60) riskLevel = 'medium';
      else if (score >= 40) riskLevel = 'high';
      else riskLevel = 'critical';

      // Insert or update security score
      const { error: scoreError } = await supabase
        .from('security_scores')
        .upsert({
          entity_type: 'user',
          entity_id: profile.id,
          score: score,
          risk_level: riskLevel,
          factors: {
            incidents: userIncidents?.length || 0,
            alerts: userAlerts?.length || 0
          },
          recommendations: generateRecommendations(score, riskLevel),
          calculated_at: now
        }, {
          onConflict: 'entity_type,entity_id'
        });

      if (scoreError) {
        console.error(`[SecurityScores] Failed to update score for ${profile.id}:`, scoreError);
      } else {
        updatedCount++;
      }
    } catch (err) {
      console.error(`[SecurityScores] Error processing profile ${profile.id}:`, err);
    }
  }

  console.log(`[SecurityScores] Updated ${updatedCount} security scores`);

  return {
    updated: updatedCount,
    total: profiles.length
  };
}

function generateRecommendations(score: number, riskLevel: string): string[] {
  const recommendations: string[] = [];

  if (score < 80) {
    recommendations.push('Enable multi-factor authentication for all accounts');
  }

  if (score < 60) {
    recommendations.push('Review and resolve open security incidents');
    recommendations.push('Update security policies and access controls');
  }

  if (score < 40) {
    recommendations.push('Immediate security audit required');
    recommendations.push('Restrict access to critical resources');
    recommendations.push('Enable enhanced monitoring and alerting');
  }

  if (riskLevel === 'critical') {
    recommendations.push('CRITICAL: Contact security team immediately');
    recommendations.push('Suspend all non-essential access');
  }

  return recommendations;
}
