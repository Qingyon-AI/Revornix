import { NextResponse, NextRequest } from 'next/server'

const whitelist = ['/login', '/register', '/.well-known/apple-app-site-association']

const privateSectionPaths = new Set([
    'detail',
    'create',
    'mine',
    'community',
    'today',
    'subscribed',
])

const normalizePath = (pathname: string) => {
    if (pathname.endsWith('/') && pathname !== '/') {
        return pathname.slice(0, -1)
    }
    return pathname
}

const isSeoSectionPath = (pathname: string) => {
    const normalizedPath = normalizePath(pathname)
    if (!normalizedPath.startsWith('/section/')) return false

    const sectionPath = normalizedPath.slice('/section/'.length)
    if (!sectionPath || sectionPath.includes('/')) return false

    return !privateSectionPaths.has(sectionPath)
}

const isPublicSingleSegmentPath = (pathname: string, prefix: string) => {
    const normalizedPath = normalizePath(pathname)
    if (!normalizedPath.startsWith(prefix)) return false

    const segment = normalizedPath.slice(prefix.length)
    return segment.length > 0 && !segment.includes('/')
}

const auth = (request: NextRequest) => {
    const normalizedPath = normalizePath(request.nextUrl.pathname)
    if (
        whitelist.includes(normalizedPath) ||
        normalizedPath === '/community' ||
        normalizedPath.startsWith('/integrations') ||
        isSeoSectionPath(normalizedPath) ||
        isPublicSingleSegmentPath(normalizedPath, '/user/') ||
        isPublicSingleSegmentPath(normalizedPath, '/document/')
    ) {
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
