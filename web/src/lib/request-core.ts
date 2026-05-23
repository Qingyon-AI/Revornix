// Shared low-level helpers for `request` (browser) and `serverRequest` (SSR).
// Anything that is identical in both transports lives here so the two
// entry-point files only have to express what's actually different about
// each runtime (token source, refresh policy, retry policy, etc.).

import qs from 'qs';

export type ErrorResponse = {
    success: boolean;
    message: string;
    code: number;
};

export interface ServerRequestOptions {
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
     * Explicit opt-in for public optional-auth endpoints.
     * A stale access token is refreshed first; anonymous retry is the last
     * resort when refresh fails so public pages still render readable data.
     */
    anonymousFallback?: boolean;
}

/**
 * Statuses where a retry has a reasonable chance of succeeding without any
 * caller-side change. 4xx (other than the few listed) signal "do not retry —
 * the request itself is wrong".
 */
export const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type');
    return contentType?.includes('application/json')
        ? response.json()
        : (response.text() as Promise<T>);
}

export async function parseError(response: Response): Promise<ErrorResponse> {
    const contentType = response.headers.get('Content-Type');

    let errorData: any = {};
    try {
        errorData = contentType?.includes('application/json')
            ? await response.json()
            : await response.text();
    } catch {
        errorData = {};
    }

    return {
        success: false,
        message:
            typeof errorData === 'string'
                ? errorData
                : errorData?.message || 'Unknown error occurred',
        code: response.status,
    };
}

/**
 * Default fetch init shared by both transports. Callers spread their own
 * extras on top (headers, body, signal, ...).
 */
export const BASE_FETCH_INIT: Pick<
    RequestInit,
    'mode' | 'credentials' | 'redirect' | 'referrerPolicy'
> = {
    mode: 'cors',
    credentials: 'same-origin',
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
};

/** Append a `qs`-encoded data object to a URL as a query string. */
export const appendQueryString = (url: string, data: unknown) => {
    const query = qs.stringify(data, { skipNulls: true });
    if (!query) {
        return url;
    }
    return url + (url.includes('?') ? '&' : '?') + query;
};
