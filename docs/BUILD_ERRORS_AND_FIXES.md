# Build Errors and Fixes

**Status:** Build failing with TypeScript errors  
**Date:** September 17, 2026

## Issues Found

### 1. Supabase Client - createClient() is async

**Problem:** All code calls `createClient()` but doesn't await it, causing TypeScript errors.

**Current Code:**
```typescript
const supabase = await createClient();
const { data, error } = await supabase.auth.getUser(); // ERROR: supabase is Promise
```

**Fix:** Remove `await` from createClient call (it's already async in the implementation)
```typescript
const supabase = createClient();  // Returns SupabaseClient directly
const { data, error } = await supabase.auth.getUser(); // Now works
```

OR fix the server.ts file to not return a Promise:
```typescript
// src/lib/supabase/server.ts
export function createClient() {  // Remove async
  const cookieStore = cookies();  // Remove await
  // ... rest
}
```

### 2. Dynamic Route Params are Promises in Next.js 15+

**Problem:** Route handlers with [id] dynamic segments now receive params as Promise.

**Current Code:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }  // ERROR: params is Promise
)
```

**Fix:**
```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;  // Await the params
  // ... rest of code
}
```

**Files to Fix:**
- `src/app/api/approvals/[id]/route.ts`
- `src/app/api/incidents/[id]/route.ts`
- `src/app/api/incidents/[id]/notes/route.ts`
- `src/app/api/incidents/[id]/respond/route.ts`

### 3. Missing shadcn/ui Components

**Problem:** Dashboard components import UI components that aren't installed.

**Missing Components:**
- `@/components/ui/card`
- `@/components/ui/badge`
- `@/components/ui/button`
- `@/components/ui/table`
- `@/components/ui/tabs`
- `@/components/ui/progress`
- `@/components/ui/dialog`
- `@/components/ui/select`
- `@/components/ui/input`
- `@/components/ui/label`
- `@/components/ui/textarea`

**Fix:** Install shadcn/ui and add components:
```bash
npx shadcn@latest init
npx shadcn@latest add card badge button table tabs progress dialog select input label textarea
```

### 4. Headers API Issue

**Problem:** `headers()` returns Promise in new Next.js version

**Current Code:**
```typescript
const headersList = await headers();
const clientIP = headersList.get('x-forwarded-for');  // ERROR
```

**Fix:**
```typescript
const headersList = headers();  // Don't await
const clientIP = headersList.get('x-forwarded-for');  // Now works
```

### 5. Missing Optional Dependencies

**Problem:** admin-wallet.ts imports AWS KMS and Azure Key Vault packages that aren't installed.

**Fix:** Either install them or make them optional:
```bash
npm install @aws-sdk/client-kms @azure/keyvault-secrets @azure/identity
```

OR wrap in try-catch and make optional.

## Recommended Action Plan

### Quick Fix (Disable TypeScript checking for build)

Add to `next.config.ts`:
```typescript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,  // ← Add this
  },
  // ... rest
};
```

### Proper Fix (Recommended)

1. **Fix createClient to not be async:**
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {  // Remove async
  const cookieStore = cookies();  // Remove await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}
```

2. **Update all route handlers with dynamic params** to use Promise-based params

3. **Install shadcn/ui components**

4. **Install optional dependencies** or make them conditional

## Verification

After fixes, run:
```bash
npm run build
```

Should compile successfully with no TypeScript errors.

## Status

- ✅ Supabase packages installed
- ✅ Server client created
- ❌ createClient() needs to be synchronous
- ❌ Dynamic routes need param await
- ❌ UI components need installation
- ❌ Optional dependencies missing

## Estimated Fix Time

- Quick fix (ignore errors): 1 minute
- Proper fix: 30-60 minutes
