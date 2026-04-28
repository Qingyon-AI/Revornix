import { v4 as uuidv4 } from 'uuid';
import { updateToken } from '@/service/user';
import qs from 'qs';
import Cookies from 'js-cookie'
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { getUserTimeZone } from '@/lib/time';

type Subscriber = {
    resolve: () => void;
    reject: (error: ErrorResponse) => void;
};

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
    formData?: FormData;
}

type ErrorResponse = {
    success: boolean
    message: string
    code: number
}

// 防止多次请求token获取接口（限制三次，三次以后直接显示账号信息错误）
const MAX_REFRESH_TOKEN_RETRY_TIMES = 3;
let refreshTokenTimes = 0;
// 被拦截的请求数组
let subscribers: Subscriber[] = [];
// 刷新状态锁
let isRefreshing = false;

const createAuthExpiredError = (message: string): ErrorResponse => ({
    success: false,
    message,
    code: 401,
});

const handleAuthExpired = (
    message: string = '用户登陆状态已过期，请重新登陆',
) => {
    isRefreshing = false;
    toast.error(message);
    clearAuthCookies();
    setTimeout(() => {
        window.location.reload()
    }, 500);
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

async function refreshToken() {
    while (refreshTokenTimes < MAX_REFRESH_TOKEN_RETRY_TIMES) {
        refreshTokenTimes++;
        const refresh_token = Cookies.get('refresh_token');
        if (!refresh_token) {
            console.error('Cannot find refresh_token in local cookie')
            const authExpiredError = createAuthExpiredError('用户登陆状态已过期，请重新登陆');
            onAccessTokenRefreshFailed(authExpiredError);
            handleAuthExpired(authExpiredError.message);
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
    onAccessTokenRefreshFailed(authExpiredError);
    handleAuthExpired(authExpiredError.message);
}

// 将请求缓存到请求数组中
const addSubscriber = (subscriber: Subscriber) => {
    subscribers.push(subscriber)
}

const checkTokenRefreshStatus = <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const retryOriginalRequest = new Promise<T>((resolve, reject) => {
        addSubscriber({
            resolve: () => {
                resolve(request<T>(url, initialOptions));
            },
            reject,
        });
    });

    if (!isRefreshing) {
        isRefreshing = true;
        refreshToken();
    }

    return retryOriginalRequest;
}

export const request = <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
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
        const options: any = {
            method: method,
            mode: 'cors',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            ...initialOptions,
            headers,
        }

        if (method === 'POST' && initialOptions?.data && !initialOptions.formData) {
            options.body = JSON.stringify({ ...initialOptions.data });
        }
        if (method === 'POST' && initialOptions?.formData) {
            options.body = initialOptions.formData;
        }

        let finalUrl = url;
        if (method === 'GET' && initialOptions?.data) {
            const query = qs.stringify(initialOptions.data, { skipNulls: true });
            if (query) {
                finalUrl += finalUrl.includes('?') ? `&${query}` : `?${query}`;
            }
        }

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
            // Token 过期：尝试刷新
            if (response.status === 401) {
                const retryPromise = checkTokenRefreshStatus<T>(url, initialOptions);
                return retryPromise && retryPromise.then(resolve).catch(reject);
            }

            // 其他错误：返回规范化错误对象
            reject(await parseError(response));
            return;
        }

        // 🟦 正常返回
        resolve(await parseResponse<T>(response));
    });
};

async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type');
    return contentType?.includes('application/json')
        ? response.json()
        : response.text() as Promise<T>;
}

async function parseError(response: Response): Promise<ErrorResponse> {
    const contentType = response.headers.get('Content-Type');
    const errorData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
    // 返回规范化的 ErrorResponse 对象
    return {
        success: false,
        message:
            typeof errorData === 'string'
                ? errorData
                : errorData.message || "Unknown error occurred",
        code: response.status
    };
}
