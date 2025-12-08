import { NextResponse, NextRequest } from 'next/server'

const whitelist = ['/login', '/register', '/.well-known/apple-app-site-association']

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
    // 获取当前路径，并编码以防止 URL 解析问题
    const originalPath = encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)
    const loginUrl = new URL(`/login?redirect_to=${originalPath}`, request.url)
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