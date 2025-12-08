'use server'

import { v4 as uuidv4 } from 'uuid';
import qs from 'qs';

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
}

type ErrorResponse = {
    success: boolean;
    message: string;
    code: number;
};

export const serverRequest = async <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Trace-Id', uuidv4());

    const method = initialOptions?.method || 'POST';

    const options: any = {
        method: method,
        mode: 'cors',
        credentials: 'same-origin',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        headers,
        ...initialOptions
    };

    if (method === 'POST' && initialOptions?.data) {
        options.body = JSON.stringify({ ...initialOptions.data });
    }

    let finalUrl = url;
    if (method === 'GET' && initialOptions?.data) {
        finalUrl = finalUrl + '?' + qs.stringify(initialOptions.data, { skipNulls: true });
    }

    try {
        // 🟦 捕获 Node fetch 可能抛出的所有异常
        const response = await fetch(finalUrl, options);

        if (!response.ok) {
            throw await parseError(response);
        }

        return await parseResponse<T>(response);

    } catch (err: any) {
        // 🟥 fetch 失败没有 response，例如 DNS 错误 / 连接拒绝 / 证书错误
        console.error('[ServerRequest Error]', err);

        // 如果已经是我们自定义的 ErrorResponse，则直接抛出
        if (err?.success === false && typeof err.code === 'number') {
            throw err;
        }

        // 统一规范化
        throw {
            success: false,
            message: err?.message ?? 'Network error: request failed',
            code: 0, // 0 表示未到达服务端
        } satisfies ErrorResponse;
    }
};


async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('Content-Type');
    return contentType?.includes('application/json')
        ? response.json()
        : response.text() as Promise<T>;
}

async function parseError(response: Response): Promise<ErrorResponse> {
    const contentType = response.headers.get('Content-Type');

    let errorData: any = {};
    try {
        errorData = contentType?.includes('application/json')
            ? await response.json()
            : await response.text();
    } catch (e) {
        errorData = {};
    }

    return {
        success: false,
        message: errorData?.message || "Unknown error occurred",
        code: response.status,
    };
}