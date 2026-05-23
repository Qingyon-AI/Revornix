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
} from '@/lib/request-core';

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
    /**
     * Number of *additional* attempts on top of the first one (default 0 = no retry).
     * Retries fire on network errors and HTTP 5xx / 408 / 429 responses with a
     * small exponential backoff.
     */
    retries?: number;
    /** Per-attempt timeout in milliseconds. 0 / undefined disables the timeout. */
    timeoutMs?: number;
    /**
     * When the backend returns 401 (typically because the access_token cookie
     * has expired), retry the request once without attaching the Authorization
     * header. Public/optional-auth endpoints (those using
     * `get_current_user_without_throw`) will then succeed as anonymous instead
     * of returning a fake "empty" page.
     *
     * Only set this on endpoints whose semantics are safe to demote to
     * anonymous — i.e. they expose a public read view and only enrich it for
     * authenticated callers.
     */
    anonymousFallback?: boolean;
}

export const serverRequest = async <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const headers = new Headers(initialOptions?.headers || undefined);
    if (!headers.has('Content-Type')) {
        headers.append('Content-Type', 'application/json');
    }
    headers.append('Trace-Id', uuidv4());

    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
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
    const hadAuthHeader = headers.has('Authorization');
    let triedAnonymousFallback = false;

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
                if (
                    response.status === 401 &&
                    anonymousFallback &&
                    hadAuthHeader &&
                    !triedAnonymousFallback
                ) {
                    // Drop the (likely expired) Authorization header and retry
                    // once as anonymous. Does not count against `retries`, and
                    // is only ever attempted a single time per call.
                    triedAnonymousFallback = true;
                    headers.delete('Authorization');
                    lastErr = parsed;
                    attempt -= 1; // don't consume a retry slot
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
