import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> };

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach(({ name, value }: CookieEntry) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: CookieEntry) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  let user = null;
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user;
  } catch (error) {
    console.error('Middleware Supabase error:', error);
  }

  const isCallbackRoute =
    request.nextUrl.pathname === '/api/auth/callback' ||
    request.nextUrl.pathname === '/auth/confirm' ||
    // update-password must be reachable by a freshly-authed user coming
    // from the password-reset callback — skip both guards for it.
    request.nextUrl.pathname === '/auth/update-password'

  const isOnboardingRoute = request.nextUrl.pathname === '/auth/onboarding'

  const isAuthRoute =
    !isCallbackRoute && !isOnboardingRoute && request.nextUrl.pathname.startsWith('/auth')

  // Allow public access to individual post pages /community/[id]
  const isCommunityPostRoute = request.nextUrl.pathname.startsWith('/community/') && 
    request.nextUrl.pathname !== '/community/';

  const isProtectedRoute =
    !isCallbackRoute && !isCommunityPostRoute && (
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/community') ||
      request.nextUrl.pathname.startsWith('/solving') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      request.nextUrl.pathname.startsWith('/admin') ||
      isOnboardingRoute
    )

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
