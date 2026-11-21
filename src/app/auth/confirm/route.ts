import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type CookieEntry = { name: string; value: string; options?: Record<string, unknown> };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent('Invalid confirmation link. Please request a new one.')}`
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach(({ name, value, options }: CookieEntry) =>
            cookieStore.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('[auth/confirm] OTP verification failed:', error.message)
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
    )
  }

  const safeNext = next.startsWith('/') ? next : '/dashboard'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
