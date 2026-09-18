# Database Migrations

This directory contains SQL migration files for the BEL Secure Platform database.

## Naming Convention

Migrations are named: `YYYYMMDD_HHMMSS_description.sql`

Example: `20260917_001_add_invite_tokens.sql`

## Migration Order

Migrations must be applied in chronological order. Each migration file should:
1. Be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`)
2. Include both UP (apply) and DOWN (rollback) sections if complex
3. Document what changed and why in comments

## Applying Migrations

**Manually:**
```bash
psql $SUPABASE_DB_URL < database/migrations/YYYYMMDD_HHMMSS_description.sql
```

**Via Supabase CLI:**
```bash
supabase db push
```

## Current Schema

Base schema: `database/schema.sql` (bootstraps new installations)

Migrations: Applied on top of base schema for existing installations

## Migration Log

| Date | File | Description | Applied |
|------|------|-------------|---------|
| 2026-09-17 | Initial schema | Base schema v2.0 | ✓ |
| 2026-09-17 | 20260917_001_add_invite_tokens.sql | Replace static registration_secret_key with invite tokens | ✓ |
| 2026-09-17 | 20260917_002_add_audit_batching.sql | Add batched audit logging with Merkle root anchoring | ✓ |
| 2026-09-17 | 20260917_003_encrypt_sensitive_fields.sql | Encrypt sensitive fields & add access logging | ✓ |
