'use server'

import { v4 as uuidv4 } from 'uuid';
import qs from 'qs';

interface RequestOptions {
    method?: 'POST' | 'GET';
    data?: any;
    headers?: Headers;
}

export const serverRequest = async <T>(url: string, initialOptions?: RequestOptions): Promise<T> => {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Trace-Id', uuidv4())
    return new Promise(async (resolve, reject) => {
        const method = initialOptions?.method || 'POST';
        const options: any = {
            method: method,
            mode: 'cors', // no-cors, *cors, same-origin
            credentials: 'same-origin', // include, *same-origin, omit
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            headers: headers,
            ...initialOptions
        }
        if (method === 'POST' && initialOptions?.data) {
            options.body = JSON.stringify({ ...initialOptions?.data }) // body data type must match "Content-Type" header
        }
        let finalUrl = url;
        if (method === 'GET' && initialOptions?.data) {
            finalUrl = finalUrl + '?' + qs.stringify(initialOptions.data, { skipNulls: true });
        }
        const response = await fetch(finalUrl, options);
        if (!response.ok) {
            reject(await parseError(response));
            return;
        }
        // 请求正常
        resolve(await parseResponse<T>(response));
    })
}

const parseResponse = async <T>(response: Response): Promise<T> => {
    const contentType = response.headers.get('Content-Type');
    return contentType?.includes('application/json')
        ? response.json()
        : response.text() as Promise<T>;
}

const parseError = async (response: Response): Promise<Error> => {
    const contentType = response.headers.get('Content-Type');
    const errorData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
    return new Error(
        typeof errorData === 'object'
            ? JSON.stringify(errorData)
            : errorData
    );
}