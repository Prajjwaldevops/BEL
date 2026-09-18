# B5: Incident Response System - Implementation Guide

**Status:** ✅ Implemented  
**Date:** 2026-09-17  
**Priority:** High Security Feature

## Overview

The Incident Response System provides automated and manual incident management for security events. It aggregates related events, executes automated responses via playbooks, tracks investigation progress, and generates comprehensive reports.

## Architecture

### Incident Lifecycle

```
1. DETECTION → Security event triggers incident creation
2. OPEN → Incident created, awaiting initial assessment
3. INVESTIGATING → Team analyzing root cause
4. CONTAINED → Threat neutralized, system secured
5. RESOLVED → Root cause fixed, preventive measures in place
6. CLOSED → Documentation complete, lessons learned captured
```

### Components

1. **Incident Management** - Create, track, and resolve incidents
2. **Automated Responses** - Playbook-driven actions
3. **Timeline Tracking** - Event correlation and chronology
4. **Investigation Notes** - Collaborative documentation
5. **Response Actions** - Manual and automated interventions
6. **Statistics & Reporting** - Analytics and metrics

## Database Schema

### Tables Created

**`security_incidents`**
```sql
- id: UUID (PK)
- incident_number: VARCHAR(50) UNIQUE (INC-2026-0001)
- title: TEXT
- description: TEXT
- severity: incident_severity (LOW/MEDIUM/HIGH/CRITICAL)
- status: incident_status
- category: VARCHAR(50)
- affected_entity_type: VARCHAR(50)
- affected_entity_id: UUID
- reporter_id: UUID (FK to profiles)
- assigned_to: UUID (FK to profiles)
- root_cause: TEXT
- resolution: TEXT
- detected_at: TIMESTAMPTZ
- responded_at: TIMESTAMPTZ
- contained_at: TIMESTAMPTZ
- resolved_at: TIMESTAMPTZ
- closed_at: TIMESTAMPTZ
```

**`incident_events`** (Timeline)
```sql
- id: UUID (PK)
- incident_id: UUID (FK)
- security_event_id: UUID (FK to security_events)
- event_type: VARCHAR(100)
- description: TEXT
- actor: UUID (FK to profiles)
- metadata: JSONB
- created_at: TIMESTAMPTZ
```

**`incident_responses`** (Actions Taken)
```sql
- id: UUID (PK)
- incident_id: UUID (FK)
- action_type: response_action_type
- action_description: TEXT
- target_entity_type: VARCHAR(50)
- target_entity_id: UUID
- automated: BOOLEAN
- executed_by: UUID (FK)
- execution_status: VARCHAR(20) (SUCCESS/FAILED/PARTIAL/PENDING)
- execution_result: JSONB
- execution_error: TEXT
```

**`incident_notes`** (Investigation Notes)
```sql
- id: UUID (PK)
- incident_id: UUID (FK)
- author_id: UUID (FK to profiles)
- note_type: VARCHAR(50) (GENERAL/FINDING/ACTION/HYPOTHESIS)
- content: TEXT
- is_internal: BOOLEAN
- created_at: TIMESTAMPTZ
```

**`incident_playbooks`** (Response Templates)
```sql
- id: UUID (PK)
- name: VARCHAR(100) UNIQUE
- description: TEXT
- severity_trigger: incident_severity
- category_trigger: VARCHAR(50)
- automated_actions: response_action_type[]
- requires_approval: BOOLEAN
- approval_action_type: VARCHAR(50)
- is_active: BOOLEAN
```

### Response Action Types

| Action Type | Description | Target | Auto/Manual |
|-------------|-------------|--------|-------------|
| **SUSPEND_ACCOUNT** | Disable user account | Profile | Both |
| **REVOKE_PERMISSIONS** | Remove all access grants | Profile | Both |
| **LOCK_ASSET** | Prevent asset modifications | Asset | Both |
| **PAUSE_CONTRACT** | Emergency contract pause | Contract | Manual |
| **NOTIFY_ADMINS** | Send alerts to admins | N/A | Auto |
| **CREATE_APPROVAL** | Require multi-sig approval | N/A | Auto |
| **ENABLE_MFA** | Force MFA on account | Profile | Manual |
| **FORCE_PASSWORD_RESET** | Require password change | Profile | Manual |
| **QUARANTINE_DATA** | Isolate suspicious data | Data | Manual |
| **BLOCK_IP** | Block IP address | IP | Manual |

### Functions

**`generate_incident_number()`**
- Generates unique incident number (INC-YYYY-NNNN)
- Incremental within year
- Returns VARCHAR(50)

**`create_incident_from_event(security_event_id, title, description, category)`**
- Creates incident from security event
- Links event to incident timeline
- Returns incident UUID

**`execute_incident_response(incident_id, action_type, target_entity_type, target_entity_id, executed_by)`**
- Executes response action
- Records result and errors
- Updates affected entities
- Returns response UUID

**`handle_critical_security_event()` [TRIGGER]**
- Automatically triggered on CRITICAL security events
- Creates incident
- Executes matching playbooks
- Notifies admins via pg_notify

**`update_incident_status(incident_id, new_status, updated_by, note)`**
- Updates incident status
- Tracks timestamps (responded_at, contained_at, etc.)
- Logs status change to timeline
- Adds optional note

## API Endpoints

### GET /api/incidents/list?status=OPEN&severity=CRITICAL
**List incidents with filters**

**Response:**
```json
{
  "incidents": [
    {
      "id": "uuid",
      "incidentNumber": "INC-2026-0001",
      "title": "CRITICAL: Brute Force Attack Detected",
      "description": "Multiple failed login attempts from IP 192.168.1.100",
      "severity": "CRITICAL",
      "status": "OPEN",
      "category": "BRUTE_FORCE_DETECTED",
      "detectedAt": "2026-09-17T14:30:00Z",
      "createdAt": "2026-09-17T14:30:05Z"
    }
  ],
  "total": 1
}
```

### POST /api/incidents/create
**Create incident manually**

**Request:**
```json
{
  "title": "Suspicious data access pattern",
  "description": "User accessed 1000+ records in 5 minutes",
  "severity": "HIGH",
  "category": "DATA_BREACH",
  "affectedEntityType": "PROFILE",
  "affectedEntityId": "uuid"
}
```

### GET /api/incidents/[id]
**Get incident details with timeline, responses, and notes**

**Response:**
```json
{
  "incident": {...},
  "timeline": [
    {
      "id": "uuid",
      "eventType": "BRUTE_FORCE_DETECTED",
      "description": "10 failed login attempts",
      "createdAt": "2026-09-17T14:30:00Z"
    }
  ],
  "responses": [
    {
      "id": "uuid",
      "actionType": "SUSPEND_ACCOUNT",
      "executionStatus": "SUCCESS",
      "automated": true,
      "createdAt": "2026-09-17T14:30:10Z"
    }
  ],
  "notes": [...]
}
```

### PATCH /api/incidents/[id]
**Update incident (status, assignment)**

**Request:**
```json
{
  "status": "INVESTIGATING",
  "assignedTo": "uuid",
  "note": "Started investigation, reviewing access logs"
}
```

### POST /api/incidents/[id]/notes
**Add investigation note**

**Request:**
```json
{
  "noteType": "FINDING",
  "content": "Attack originated from compromised VPN credentials",
  "isInternal": false
}
```

### POST /api/incidents/[id]/respond
**Execute response action**

**Request:**
```json
{
  "actionType": "REVOKE_PERMISSIONS",
  "targetEntityType": "PROFILE",
  "targetEntityId": "uuid"
}
```

### GET /api/incidents/statistics?startDate=2026-09-01&endDate=2026-09-30
**Get incident metrics**

**Response:**
```json
{
  "total": 15,
  "byStatus": {
    "OPEN": 2,
    "INVESTIGATING": 3,
    "RESOLVED": 8,
    "CLOSED": 2
  },
  "bySeverity": {
    "CRITICAL": 1,
    "HIGH": 4,
    "MEDIUM": 7,
    "LOW": 3
  },
  "avgResponseTime": 2.5,
  "avgResolutionTime": 18.3
}
```

## Components

### IncidentDashboard
**Location:** `src/components/IncidentDashboard.tsx`

**Features:**
- Statistics cards (total, critical count, avg times)
- Active incidents table
- Severity and status badges
- Response time calculation
- Update status dialog
- Filter by status/severity
- Real-time refresh

**Usage:**
```tsx
import { IncidentDashboard } from '@/components/IncidentDashboard';

export default function SecurityPage() {
  return <IncidentDashboard />;
}
```

## Automated Response (Playbooks)

### Default Playbooks

**1. Brute Force Response**
```typescript
{
  name: 'BRUTE_FORCE_RESPONSE',
  severityTrigger: 'CRITICAL',
  categoryTrigger: 'BRUTE_FORCE_DETECTED',
  automatedActions: [
    'SUSPEND_ACCOUNT',
    'NOTIFY_ADMINS',
    'CREATE_APPROVAL'
  ],
  requiresApproval: true
}
```

**2. Data Breach Response**
```typescript
{
  name: 'DATA_BREACH_RESPONSE',
  severityTrigger: 'CRITICAL',
  categoryTrigger: 'DATA_BREACH',
  automatedActions: [
    'REVOKE_PERMISSIONS',
    'NOTIFY_ADMINS',
    'QUARANTINE_DATA'
  ],
  requiresApproval: true
}
```

**3. Unauthorized Access Response**
```typescript
{
  name: 'UNAUTHORIZED_ACCESS_RESPONSE',
  severityTrigger: 'HIGH',
  categoryTrigger: 'UNAUTHORIZED_ACCESS',
  automatedActions: [
    'SUSPEND_ACCOUNT',
    'NOTIFY_ADMINS'
  ],
  requiresApproval: false
}
```

### Creating Custom Playbooks

```sql
INSERT INTO incident_playbooks (
  name,
  description,
  severity_trigger,
  category_trigger,
  automated_actions,
  requires_approval
) VALUES (
  'MALWARE_DETECTED_RESPONSE',
  'Automated response to malware detection',
  'CRITICAL',
  'MALWARE_DETECTED',
  ARRAY['QUARANTINE_DATA', 'SUSPEND_ACCOUNT', 'NOTIFY_ADMINS']::response_action_type[],
  TRUE
);
```

## Integration with Security Events

### Trigger Flow

```
1. CRITICAL security event inserted into security_events
2. Trigger: handle_critical_security_event() fires
3. Incident created via create_incident_from_event()
4. Matching playbooks found
5. Automated actions executed
6. pg_notify alerts sent
7. Admin notifications triggered
```

### Example: Brute Force Detection

```typescript
// Security event logged
await logSecurityEvent({
  eventType: 'BRUTE_FORCE_DETECTED',
  severity: 'CRITICAL',
  actor: 'john.doe',
  description: '10 failed login attempts',
  metadata: {
    ip: '192.168.1.100',
    attempts: 10,
    timeWindow: '5 minutes'
  }
});

// Trigger automatically:
// 1. Creates INC-2026-0001
// 2. Suspends john.doe account
// 3. Creates multi-sig approval for reinstatement
// 4. Notifies all admins
```

## Investigation Workflow

### Step 1: Detection & Triage
- Incident auto-created or manually reported
- Initial assessment and severity assignment
- Assignment to on-call admin

### Step 2: Investigation
```typescript
// Add findings
await addIncidentNote({
  incidentId,
  noteType: 'FINDING',
  content: 'Identified compromised API key',
  isInternal: false
});

// Update status
await updateIncidentStatus({
  incidentId,
  newStatus: 'INVESTIGATING',
  updatedBy: adminId,
  note: 'Investigation started'
});
```

### Step 3: Containment
```typescript
// Execute response actions
await executeResponseAction({
  incidentId,
  actionType: 'REVOKE_PERMISSIONS',
  targetEntityId: affectedUserId
});

// Update status
await updateIncidentStatus({
  incidentId,
  newStatus: 'CONTAINED',
  note: 'Threat neutralized, permissions revoked'
});
```

### Step 4: Resolution
```typescript
// Document root cause
await db.update('security_incidents')
  .set({
    rootCause: 'Exposed API key in public repository',
    resolution: 'Rotated all API keys, enabled secret scanning'
  })
  .where({ id: incidentId });

// Close incident
await updateIncidentStatus({
  incidentId,
  newStatus: 'RESOLVED',
  note: 'Preventive measures implemented'
});
```

## Monitoring & Alerting

### Key Metrics

```sql
-- Open incidents by severity
SELECT severity, COUNT(*) as count
FROM security_incidents
WHERE status IN ('OPEN', 'INVESTIGATING')
GROUP BY severity;

-- SLA compliance (CRITICAL: 4h response time)
SELECT 
  incident_number,
  EXTRACT(EPOCH FROM (responded_at - detected_at))/3600 as response_hours,
  CASE 
    WHEN responded_at - detected_at <= INTERVAL '4 hours' THEN 'Met SLA'
    ELSE 'Breached SLA'
  END as sla_status
FROM security_incidents
WHERE severity = 'CRITICAL'
AND detected_at > NOW() - INTERVAL '30 days';

-- Mean Time To Respond (MTTR)
SELECT 
  severity,
  AVG(EXTRACT(EPOCH FROM (responded_at - detected_at))/3600) as avg_hours
FROM security_incidents
WHERE responded_at IS NOT NULL
GROUP BY severity;

-- Mean Time To Resolve (MTTR)
SELECT 
  AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))/3600) as avg_hours
FROM security_incidents
WHERE resolved_at IS NOT NULL;
```

### Alerts

Configure alerts for:
- **CRITICAL incident created** - Immediate notification
- **SLA breach** - CRITICAL not responded within 4h
- **Repeated incidents** - Same category 3+ times in 24h
- **Failed automated responses** - Execution status = FAILED
- **Unassigned incidents** - OPEN > 1 hour with no assignment

## Testing

### Manual Testing Checklist
- [ ] Create incident manually
- [ ] Trigger automatic incident from CRITICAL event
- [ ] Verify playbook execution
- [ ] Add investigation notes
- [ ] Update incident status
- [ ] Execute manual response actions
- [ ] Assign incident to admin
- [ ] Verify timeline accuracy
- [ ] Check statistics calculation
- [ ] Test incident closure workflow

### Integration Tests
```bash
npm run test:integration incidents

# Test scenarios:
# - Auto-create from security event
# - Execute response actions
# - Playbook triggering
# - Status transitions
# - Note creation
# - Statistics aggregation
```

## Deployment

### Migration
```bash
psql $DATABASE_URL -f database/migrations/20260917_008_add_incident_response.sql
```

### Verification
```sql
-- Verify tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('security_incidents', 'incident_events', 'incident_responses', 'incident_notes', 'incident_playbooks');

-- Verify trigger
SELECT tgname FROM pg_trigger WHERE tgname = 'tr_critical_security_event';

-- Verify playbooks
SELECT name, severity_trigger FROM incident_playbooks WHERE is_active = TRUE;
```

### Rollback
```sql
DROP TRIGGER IF EXISTS tr_critical_security_event ON security_events;
DROP TABLE IF EXISTS incident_notes CASCADE;
DROP TABLE IF EXISTS incident_responses CASCADE;
DROP TABLE IF EXISTS incident_events CASCADE;
DROP TABLE IF EXISTS incident_playbooks CASCADE;
DROP TABLE IF EXISTS security_incidents CASCADE;
DROP TYPE IF EXISTS incident_severity CASCADE;
DROP TYPE IF EXISTS incident_status CASCADE;
DROP TYPE IF EXISTS response_action_type CASCADE;
DROP FUNCTION IF EXISTS handle_critical_security_event CASCADE;
DROP FUNCTION IF EXISTS create_incident_from_event CASCADE;
DROP FUNCTION IF EXISTS execute_incident_response CASCADE;
DROP FUNCTION IF EXISTS update_incident_status CASCADE;
DROP FUNCTION IF EXISTS generate_incident_number CASCADE;
```

## Best Practices

### 1. Incident Numbering
- Use year-based sequences (INC-2026-0001)
- Reset counter annually
- Never reuse incident numbers

### 2. Severity Assignment
```
CRITICAL: System compromise, data breach, availability impact
HIGH: Unauthorized access, privilege escalation
MEDIUM: Policy violations, suspicious activity
LOW: Failed attempts, informational events
```

### 3. Status Progression
- Never skip INVESTIGATING → go through each stage
- Document reason for status changes
- Include evidence in notes

### 4. Response Actions
- Test automated responses in staging first
- Require approval for destructive actions
- Log all manual interventions
- Review failed executions immediately

### 5. Documentation
- Add notes at each status change
- Document root cause before RESOLVED
- Include lessons learned before CLOSED
- Keep internal vs. external notes separate

## Compliance

### SOC 2
- Incident tracking and response (CC7.3)
- Timely detection and response (CC7.2)
- Complete audit trail
- SLA monitoring

### GDPR
- Data breach notification < 72h
- Incident records = personal data
- Retention policy enforcement
- Right to access incident records

### NIST 800-61
- Preparation: Playbooks and tools
- Detection and Analysis: Automated correlation
- Containment, Eradication, Recovery: Response actions
- Post-Incident Activity: Lessons learned in notes

## Troubleshooting

### Issue: Trigger not firing for CRITICAL events
**Check:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'tr_critical_security_event';
```

**Fix:**
```sql
DROP TRIGGER IF EXISTS tr_critical_security_event ON security_events;
CREATE TRIGGER tr_critical_security_event
  AFTER INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_critical_security_event();
```

### Issue: Response action execution fails
**Debug:**
```sql
SELECT * FROM incident_responses
WHERE execution_status = 'FAILED'
ORDER BY created_at DESC;
```

### Issue: Playbook not triggering
**Check playbook config:**
```sql
SELECT * FROM incident_playbooks
WHERE is_active = TRUE
AND severity_trigger = 'CRITICAL';
```

## Summary

B5: Incident Response System is now fully implemented with:
- ✅ Automated incident creation from CRITICAL events
- ✅ 5 core tables for incidents, events, responses, notes, playbooks
- ✅ 10 response action types
- ✅ 3 default playbooks (brute force, data breach, unauthorized access)
- ✅ Trigger-based automation
- ✅ Complete API (6 endpoints)
- ✅ Investigation workflow support
- ✅ Statistics and reporting
- ✅ IncidentDashboard component
- ✅ Comprehensive documentation

**Estimated Implementation Time:** 4-5 days ✅  
**Actual Implementation Time:** 1 day  
**Security Impact:** VERY HIGH - Rapid response to threats  
**User Impact:** LOW - Automated background process

---

**Last Updated:** 2026-09-17  
**Version:** 1.0  
**Status:** Production Ready
