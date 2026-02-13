import { NextResponse, NextRequest } from 'next/server'

const whitelist = ['/login', '/login/', '/register', '/register/', '/.well-known/apple-app-site-association']

const auth = (request: NextRequest) => {
    const { pathname } = request.nextUrl
    if (whitelist.includes(pathname) || pathname.startsWith('/integrations') || (pathname.startsWith('/section/') && !pathname.startsWith('/section/detail/'))) {
        return true
    }
    if (!request.cookies.get('access_token')) {
        return false
    }
    return true
}

export function proxy(request: NextRequest) {
    // If the user is authenticated, continue as normal
    if (auth(request)) {
        return NextResponse.next()
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname + request.nextUrl.search)
    // Redirect to login page if not authenticated and the destination page is not the sign page
    return NextResponse.redirect(loginUrl)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - serviceWorker
         */
        '/((?!api|_next/static|_next/image|favicon.ico|serviceWorker).*)',
    ],
}
