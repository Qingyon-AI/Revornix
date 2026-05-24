import { v4 as uuidv4 } from 'uuid';
import { updateToken } from '@/service/user';
import Cookies from 'js-cookie'
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { getUserTimeZone } from '@/lib/time';
import {
    appendQueryString,
    BASE_FETCH_INIT,
    parseError,
    parseResponse,
    type ErrorResponse,
} from '@/lib/request-core';

type Subscriber = {
    resolve: () => void;
    reject: (error: ErrorResponse) => void;
    redirectOnRefreshFailure: boolean;
};

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
    formData?: FormData;
    signal?: AbortSignal;
    /** Defaults to true. Set false only when the caller handles 401 locally. */
    redirectOnAuthFailure?: boolean;
}

// 防止多次请求token获取接口（限制三次，三次以后直接显示账号信息错误）
const MAX_REFRESH_TOKEN_RETRY_TIMES = 3;
let refreshTokenTimes = 0;
// 被拦截的请求数组
let subscribers: Subscriber[] = [];
// 刷新状态锁
let isRefreshing = false;
let isRedirectingToLogin = false;

const createAuthExpiredError = (message: string): ErrorResponse => ({
    success: false,
    message,
    code: 401,
});

const shouldRedirectOnAuthFailure = (initialOptions?: RequestOptions) =>
    initialOptions?.redirectOnAuthFailure ?? true;

const handleAuthExpired = (
    message: string = '用户登陆状态已过期，请重新登陆',
) => {
    isRefreshing = false;
    toast.error(message);
    clearAuthCookies();
    if (typeof window === 'undefined' || isRedirectingToLogin) {
        return;
    }

    isRedirectingToLogin = true;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    const isAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
    const loginUrl = isAuthPage
        ? '/login'
        : `/login?redirect_to=${encodeURIComponent(currentPath)}`;

    window.setTimeout(() => {
        window.location.replace(loginUrl);
    }, 300);
}

// 处理被缓存的请求
function onAccessTokenFetched() {
    subscribers.forEach(({ resolve }) => {
        resolve();
    });
    subscribers = [];
    refreshTokenTimes = 0;
}

function onAccessTokenRefreshFailed(error: ErrorResponse) {
    subscribers.forEach(({ reject }) => {
        reject(error);
    });
    subscribers = [];
    refreshTokenTimes = 0;
}

function failAccessTokenRefresh(error: ErrorResponse) {
    const shouldRedirect = subscribers.some(
        ({ redirectOnRefreshFailure }) => redirectOnRefreshFailure,
    );
    onAccessTokenRefreshFailed(error);
    if (shouldRedirect) {
        handleAuthExpired(error.message);
    } else {
        isRefreshing = false;
    }
}

async function refreshToken() {
    while (refreshTokenTimes < MAX_REFRESH_TOKEN_RETRY_TIMES) {
        refreshTokenTimes++;
        const refresh_token = Cookies.get('refresh_token');
        if (!refresh_token) {
            console.error('Cannot find refresh_token in local cookie')
            const authExpiredError = createAuthExpiredError('用户登陆状态已过期，请重新登陆');
            failAccessTokenRefresh(authExpiredError);
            return;
        };
        const [res] = await utils.to(updateToken(refresh_token));
        if (res) {
            setAuthCookies(res);
            isRefreshing = false;
            onAccessTokenFetched();
            return;
        }
        console.error(`Token refresh attempt #${refreshTokenTimes}. Refresh failed. Maximum of three attempts allowed; exceeding this limit will force a logout.`)
    }

    const authExpiredError = createAuthExpiredError('用户登陆状态已过期，请重新登陆');
    failAccessTokenRefresh(authExpiredError);
}

// 将请求缓存到请求数组中
const addSubscriber = (subscriber: Subscriber) => {
    subscribers.push(subscriber)
}

const checkTokenRefreshStatus = <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const retryOriginalRequest = new Promise<T>((resolve, reject) => {
        addSubscriber({
            resolve: () => {
                // Re-issue the original request with `_retriedAfterRefresh=true`
                // so that if it 401s *again* we fail loudly instead of looping
                // through another refresh. Guards against pathological cases:
                // - server clock skew immediately invalidates the new token
                // - updateToken bug returns a wrong-typed token
                // - user banned/deleted in the narrow refresh window
                // - replication lag (refresh hits primary, business call hits replica)
                resolve(request<T>(url, initialOptions, true));
            },
            reject,
            redirectOnRefreshFailure: shouldRedirectOnAuthFailure(initialOptions),
        });
    });

    if (!isRefreshing) {
        isRefreshing = true;
        refreshToken();
    }

    return retryOriginalRequest;
}

export const request = <T>(
    url: string,
    initialOptions?: RequestOptions,
    _retriedAfterRefresh: boolean = false,
): Promise<T> => {
    const headers = new Headers(initialOptions?.headers || undefined);
    if (!initialOptions?.formData && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    headers.set('Trace-Id', uuidv4());

    const isServer = typeof window === 'undefined';
    if (!isServer) {
        const accessToken = Cookies.get('access_token');
        if (accessToken && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${accessToken}`);
        }
        const userTimeZone = getUserTimeZone();
        if (userTimeZone) {
            headers.set('X-User-Timezone', userTimeZone);
        }
    }

    return new Promise(async (resolve, reject) => {
        const method = initialOptions?.method || 'POST';
        const options: RequestInit = {
            ...BASE_FETCH_INIT,
            ...initialOptions,
            method,
            headers,
        }

        if (method === 'POST' && initialOptions?.data && !initialOptions.formData) {
            options.body = JSON.stringify({ ...initialOptions.data });
        }
        if (method === 'POST' && initialOptions?.formData) {
            options.body = initialOptions.formData;
        }

        const finalUrl =
            method === 'GET' && initialOptions?.data
                ? appendQueryString(url, initialOptions.data)
                : url;

        // 🟦【关键补充】捕获 fetch 网络层错误（Failed to fetch、CORS 错误、DNS 错误、证书错误等）
        let response: Response;
        try {
            response = await fetch(finalUrl, options);
        } catch (networkErr: any) {
            console.error('[Network Error]', networkErr);

            reject({
                success: false,
                message: networkErr?.message || 'Network error',
                code: 0, // 0 代表未到达服务端
            } as ErrorResponse);
            return;
        }

        // 🟦 Response 不是 OK 的情况
        if (!response.ok) {
            // Token 过期：尝试刷新（每个原始请求最多刷新-重试一次,避免死循环）
            if (response.status === 401 && !_retriedAfterRefresh) {
                const retryPromise = checkTokenRefreshStatus<T>(url, initialOptions);
                return retryPromise
                    .then(resolve)
                    .catch(reject);
            }

            const parsedError = await parseError(response);
            if (
                response.status === 401 &&
                shouldRedirectOnAuthFailure(initialOptions)
            ) {
                handleAuthExpired(parsedError.message);
            }

            // 其他错误（含"刷新后仍然 401"）：返回规范化错误对象
            reject(parsedError);
            return;
        }

        // 🟦 正常返回
        resolve(await parseResponse<T>(response));
    });
};
