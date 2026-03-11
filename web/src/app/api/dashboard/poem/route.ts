import { NextRequest, NextResponse } from 'next/server';

interface JinrishiciTokenResponse {
	data?: string;
}

interface JinrishiciSentenceResponse {
	data?: {
		content?: string;
		origin?: {
			title?: string;
			dynasty?: string;
			author?: string;
		};
	};
	token?: string;
}

const fetchPoemToken = async (): Promise<string> => {
	const response = await fetch('https://v2.jinrishici.com/token', {
		cache: 'no-store',
	});
	if (!response.ok) {
		throw new Error('token_request_failed');
	}

	const result = (await response.json()) as JinrishiciTokenResponse;
	if (!result.data) {
		throw new Error('token_empty');
	}
	return result.data;
};

const fetchSentence = async (
	token: string,
): Promise<JinrishiciSentenceResponse> => {
	const response = await fetch('https://v2.jinrishici.com/sentence', {
		cache: 'no-store',
		headers: {
			'X-User-Token': token,
		},
	});
	if (!response.ok) {
		throw new Error('sentence_request_failed');
	}

	return (await response.json()) as JinrishiciSentenceResponse;
};

export async function GET(request: NextRequest) {
	try {
		let token = request.headers.get('x-user-token') ?? undefined;
		if (!token) {
			token = await fetchPoemToken();
		}

		try {
			const sentence = await fetchSentence(token);
			return NextResponse.json({
				data: sentence.data,
				token: sentence.token ?? token,
			});
		} catch {
			const nextToken = await fetchPoemToken();
			const sentence = await fetchSentence(nextToken);
			return NextResponse.json({
				data: sentence.data,
				token: sentence.token ?? nextToken,
			});
		}
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: 'poem_unavailable' },
			{ status: 502 },
		);
	}
}
