import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function createSupabaseMiddlewareClient(request: NextRequest) {
  // CRITICAL: create response ONCE and mutate it throughout
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write to BOTH request (for downstream server components) AND response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // THIS must come BEFORE route guard. Refreshes token and writes new cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response };
}
