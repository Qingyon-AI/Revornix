'use server'

import { v4 as uuidv4 } from 'uuid';
import { cookies, headers as nextHeaders } from 'next/headers';
import {
    appendQueryString,
    BASE_FETCH_INIT,
    parseError,
    parseResponse,
    RETRYABLE_STATUS,
    sleep,
    type ErrorResponse,
    type ServerRequestOptions,
} from '@/lib/request-core';

const ACCESS_TOKEN_EXPIRES_DAYS = 7;
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
const REFRESH_PATH = '/user/token/update';
const HOP_BY_HOP_HEADERS = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
];

type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
};

const resolveRefreshUrl = (requestUrl: string) => {
    const parsedUrl = new URL(requestUrl);
    const usesGatewayApiPrefix =
        parsedUrl.pathname === '/api' ||
        parsedUrl.pathname.startsWith('/api/');
    const apiPrefix = usesGatewayApiPrefix ? '/api' : '';
    return `${parsedUrl.origin}${apiPrefix}${REFRESH_PATH}`;
};

const sanitizeOutboundHeaders = (headers: Headers) => {
    const connectionHeader = headers.get('connection');
    if (connectionHeader) {
        connectionHeader
            .split(',')
            .map((headerName) => headerName.trim())
            .filter(Boolean)
            .forEach((headerName) => headers.delete(headerName));
    }

    HOP_BY_HOP_HEADERS.forEach((headerName) => headers.delete(headerName));
};

const trySetServerAuthCookies = async (tokens: TokenResponse) => {
    try {
        const cookieStore = await cookies();
        const isSecure = process.env.NEXT_PUBLIC_HOST?.startsWith('https://') ?? false;
        const options = {
            path: '/',
            sameSite: 'lax' as const,
            secure: isSecure,
        };

        // Cookie mutation is only allowed in Server Actions / Route Handlers.
        // In Server Components this throws, but the refreshed access token is
        // still used for the current SSR request.
        const mutableCookieStore = cookieStore as any;
        mutableCookieStore.set('access_token', tokens.access_token, {
            ...options,
            expires: new Date(Date.now() + ACCESS_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
        });
        mutableCookieStore.set('refresh_token', tokens.refresh_token, {
            ...options,
            expires: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
        });
    } catch {
        // Ignore: current request can still use the refreshed token in memory.
    }
};

const refreshServerToken = async (
    requestUrl: string,
    refreshToken: string,
): Promise<TokenResponse | null> => {
    try {
        const response = await fetch(resolveRefreshUrl(requestUrl), {
            ...BASE_FETCH_INIT,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Trace-Id': uuidv4(),
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
            return null;
        }

        return await parseResponse<TokenResponse>(response);
    } catch {
        return null;
    }
};

export const serverRequest = async <T>(url: string, initialOptions?: ServerRequestOptions): Promise<T> => {
    const headers = new Headers(initialOptions?.headers || undefined);
    sanitizeOutboundHeaders(headers);
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }
    headers.append('Trace-Id', uuidv4());

    let refreshToken: string | undefined;
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        refreshToken = cookieStore.get('refresh_token')?.value;
        if (accessToken && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }
    } catch {
        // Ignore cookie access failures and continue as anonymous.
    }

    try {
        const requestHeaders = await nextHeaders();
        const userTimeZone = requestHeaders.get('x-user-timezone');
        if (userTimeZone && !headers.has('X-User-Timezone')) {
            headers.set('X-User-Timezone', userTimeZone);
        }
    } catch {
        // Ignore header access failures when request context is unavailable.
    }

    const method = initialOptions?.method || 'POST';
    const retries = Math.max(0, initialOptions?.retries ?? 0);
    const timeoutMs = Math.max(0, initialOptions?.timeoutMs ?? 0);
    const anonymousFallback = Boolean(initialOptions?.anonymousFallback);
    let triedAnonymousFallback = false;
    let triedRefreshToken = false;

    const baseOptions: RequestInit = {
        ...BASE_FETCH_INIT,
        method,
        headers,
    };

    if (method === 'POST' && initialOptions?.data) {
        baseOptions.body = JSON.stringify({ ...initialOptions.data });
    }

    const finalUrl =
        method === 'GET' && initialOptions?.data
            ? appendQueryString(url, initialOptions.data)
            : url;

    let lastErr: any = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const controller = timeoutMs > 0 ? new AbortController() : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), timeoutMs)
            : null;
        const options = controller
            ? { ...baseOptions, signal: controller.signal }
            : baseOptions;

        try {
            const response = await fetch(finalUrl, options);

            if (!response.ok) {
                const parsed = await parseError(response);
                const hadAuthHeader = headers.has('Authorization');
                if (
                    response.status === 401 &&
                    refreshToken &&
                    !triedRefreshToken
                ) {
                    triedRefreshToken = true;
                    const refreshedTokens = await refreshServerToken(finalUrl, refreshToken);
                    if (refreshedTokens) {
                        headers.set('Authorization', `Bearer ${refreshedTokens.access_token}`);
                        refreshToken = refreshedTokens.refresh_token;
                        await trySetServerAuthCookies(refreshedTokens);
                        lastErr = parsed;
                        attempt -= 1;
                        continue;
                    }
                }
                if (
                    response.status === 401 &&
                    anonymousFallback &&
                    hadAuthHeader &&
                    !triedAnonymousFallback
                ) {
                    triedAnonymousFallback = true;
                    headers.delete('Authorization');
                    lastErr = parsed;
                    attempt -= 1;
                    continue;
                }
                if (
                    attempt < retries &&
                    RETRYABLE_STATUS.has(response.status)
                ) {
                    lastErr = parsed;
                    await sleep(150 * Math.pow(2, attempt));
                    continue;
                }
                throw parsed;
            }

            return await parseResponse<T>(response);
        } catch (err: any) {
            const isAbort = err?.name === 'AbortError';
            const isStructured =
                err?.success === false && typeof err.code === 'number';
            const isNetwork = !isStructured;

            if (attempt < retries && (isAbort || isNetwork)) {
                lastErr = err;
                await sleep(150 * Math.pow(2, attempt));
                continue;
            }

            console.error('[ServerRequest Error]', {
                url,
                attempt,
                retries,
                err,
            });

            if (isStructured) {
                throw err;
            }

            throw {
                success: false,
                message: isAbort
                    ? `Request timed out after ${timeoutMs}ms`
                    : err?.message ?? 'Network error: request failed',
                code: 0,
            } satisfies ErrorResponse;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    // Should be unreachable — loop either returns or throws.
    throw (lastErr ?? {
        success: false,
        message: 'Request failed',
        code: 0,
    }) satisfies ErrorResponse;
};
