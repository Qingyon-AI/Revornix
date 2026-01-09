import { v4 as uuidv4 } from 'uuid';
import { updateToken } from '@/service/user';
import qs from 'qs';
import Cookies from 'js-cookie'
import { toast } from 'sonner';
import { utils } from '@kinda/utils';

type SubscriberCallback = () => void;

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
    formData?: FormData;
}

// 防止多次请求token获取接口（限制三次，三次以后直接显示账号信息错误）
let refreshTokenTimes = 0;
// 被拦截的请求数组
let subscribers: SubscriberCallback[] = [];
// 刷新状态锁
let isRefreshing = false;


// 处理被缓存的请求
function onAccessTokenFetched() {
    subscribers.forEach((callback) => {
        callback();
    });
    // 处理完后清空缓存请求数组
    subscribers = [];
    refreshTokenTimes = 0; // 重置重试次数
}

async function refreshToken() {
    if (refreshTokenTimes >= 3) {
        toast.error('用户登陆状态已过期，请重新登陆')
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        setTimeout(() => {
            window.location.reload()
        }, 500)
        return;
    }
    refreshTokenTimes++;
    const refresh_token = Cookies.get('refresh_token');
    if (!refresh_token) {
        console.error('Cannot find refresh_token in local cookie')
        Cookies.remove('access_token');
        window.location.reload()
        return;
    };
    const [res, err] = await utils.to(updateToken(refresh_token));
    if (err) {
        console.error(`Token refresh attempt #${refreshTokenTimes}. Refresh failed. Maximum of three attempts allowed; exceeding this limit will force a logout.`)
        isRefreshing = false;
        refreshToken();
    }
    if (res) {
        Cookies.set('access_token', res.access_token);
        Cookies.set('refresh_token', res.refresh_token);
        isRefreshing = false;
        onAccessTokenFetched();
    }
}

// 将请求缓存到请求数组中
const addSubscriber = (callback: SubscriberCallback) => {
    subscribers.push(callback)
}

const checkTokenRefreshStatus = <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    // 无论是否正在刷新，都将当前请求加入队列
    const retryOriginalRequest = new Promise<T>((resolve) => {
        addSubscriber(() => {
            resolve(request<T>(url, initialOptions));
        });
    });

    if (!isRefreshing) {
        // 首次触发刷新，开始刷新流程
        isRefreshing = true;
        refreshToken();
    }

    return retryOriginalRequest;
};

export const request = <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const headers = new Headers();
    if (!initialOptions?.formData) {
        headers.append('Content-Type', 'application/json');
    }
    headers.append('Trace-Id', uuidv4())

    const isServer = typeof window === 'undefined';
    if (!isServer) {
        const accessToken = Cookies.get('access_token');
        if (accessToken) headers.append('Authorization', `Bearer ${accessToken}`);
    }

    return new Promise(async (resolve, reject) => {
        const method = initialOptions?.method || 'POST';
        const options: any = {
            method: method,
            mode: 'cors',
            credentials: 'same-origin',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            headers: headers,
            ...initialOptions
        }

        if (method === 'POST' && initialOptions?.data && !initialOptions.formData) {
            options.body = JSON.stringify({ ...initialOptions.data });
        }
        if (method === 'POST' && initialOptions?.formData) {
            options.body = initialOptions.formData;
        }

        let finalUrl = url;
        if (method === 'GET' && initialOptions?.data) {
            finalUrl = finalUrl + '?' + qs.stringify(initialOptions.data, { skipNulls: true });
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
                return retryPromise && retryPromise.then(resolve);
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

type ErrorResponse = {
    success: boolean
    message: string
    code: number
}

async function parseError(response: Response): Promise<ErrorResponse> {
    const contentType = response.headers.get('Content-Type');
    const errorData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
    // 返回规范化的 ErrorResponse 对象
    return {
        success: false,
        message: errorData.message || "Unknown error occurred",
        code: response.status
    };
}