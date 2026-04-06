export { middleware } from 'nextra/locales'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - img (image files)
     * - _pagefind (pagefind search index)
     * - .well-known (standard verification directory)
     * - HL81yzkFvB.txt (custom verification file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|img|_pagefind|.well-known|HL81yzkFvB\\.txt).*)',
  ],
}