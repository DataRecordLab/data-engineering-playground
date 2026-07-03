import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 未ログイン → /admin はログインへリダイレクト（admin権限チェックはページ側で実施）
  if (!user && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 未ログイン → /dashboard 以降はログインへリダイレクト
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!user && pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!user && pathname.startsWith('/debug')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!user && pathname.startsWith('/pipeline')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!user && pathname.startsWith('/dbt')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  // /profile は要ログイン、/profile/[userId] は公開
  if (!user && pathname === '/profile') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ログイン済み → /login, /signup はダッシュボードへリダイレクト
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/onboarding/:path*', '/debug/:path*', '/pipeline/:path*', '/dbt/:path*', '/profile', '/login', '/signup'],
};
