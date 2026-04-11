'use client';

import { v4 as uuidv4 } from 'uuid';
import qs from 'qs';
import Cookies from 'js-cookie';
import { getUserTimeZone } from '@/lib/time';

interface RequestOptions {
	method?: 'POST' | 'GET';
	data?: any;
	headers?: Headers;
	formData?: FormData;
}

type ErrorResponse = {
	success: boolean;
	message: string;
	code: number;
};

export const publicRequest = <T>(
	url: string,
	initialOptions?: RequestOptions,
): Promise<T> => {
	const headers = new Headers(initialOptions?.headers || undefined);
	if (!initialOptions?.formData && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	headers.set('Trace-Id', uuidv4());

	const accessToken = Cookies.get('access_token');
	if (accessToken && !headers.has('Authorization')) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	const userTimeZone = getUserTimeZone();
	if (userTimeZone) {
		headers.set('X-User-Timezone', userTimeZone);
	}

	return new Promise(async (resolve, reject) => {
		const method = initialOptions?.method || 'POST';
		const options: RequestInit & { body?: BodyInit | null } = {
			method,
			mode: 'cors',
			credentials: 'same-origin',
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
			...initialOptions,
			headers,
		};

		if (method === 'POST' && initialOptions?.data && !initialOptions.formData) {
			options.body = JSON.stringify({ ...initialOptions.data });
		}
		if (method === 'POST' && initialOptions?.formData) {
			options.body = initialOptions.formData;
		}

		let finalUrl = url;
		if (method === 'GET' && initialOptions?.data) {
			finalUrl =
				finalUrl + '?' + qs.stringify(initialOptions.data, { skipNulls: true });
		}

		let response: Response;
		try {
			response = await fetch(finalUrl, options);
		} catch (networkErr: any) {
			reject({
				success: false,
				message: networkErr?.message || 'Network error',
				code: 0,
			} satisfies ErrorResponse);
			return;
		}

		if (!response.ok) {
			reject(await parseError(response));
			return;
		}

		resolve(await parseResponse<T>(response));
	});
};

async function parseResponse<T>(response: Response): Promise<T> {
	const contentType = response.headers.get('Content-Type');
	return contentType?.includes('application/json')
		? response.json()
		: (response.text() as Promise<T>);
}

async function parseError(response: Response): Promise<ErrorResponse> {
	const contentType = response.headers.get('Content-Type');
	const errorData = contentType?.includes('application/json')
		? await response.json()
		: await response.text();

	return {
		success: false,
		message:
			typeof errorData === 'string'
				? errorData
				: errorData.message || 'Unknown error occurred',
		code: response.status,
	};
}
