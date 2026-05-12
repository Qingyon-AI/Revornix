'use client';

import { RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const JINRISHICI_TOKEN_STORAGE_KEY = 'revornix-dashboard-jinrishici-token';

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

interface ClassicalPoem {
	content: string;
	title?: string;
	dynasty?: string;
	author?: string;
}

const normalizePoem = (
	result: JinrishiciSentenceResponse | undefined,
): ClassicalPoem | null => {
	if (!result?.data?.content) {
		return null;
	}

	return {
		content: result.data.content,
		title: result.data.origin?.title,
		dynasty: result.data.origin?.dynasty,
		author: result.data.origin?.author,
	};
};

const getStoredToken = (): string | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	return window.localStorage.getItem(JINRISHICI_TOKEN_STORAGE_KEY);
};

const setStoredToken = (token: string) => {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.setItem(JINRISHICI_TOKEN_STORAGE_KEY, token);
};

const clearStoredToken = () => {
	if (typeof window === 'undefined') {
		return;
	}

	window.localStorage.removeItem(JINRISHICI_TOKEN_STORAGE_KEY);
};

const fetchPoemByJsonApi = async (
	token?: string,
): Promise<ClassicalPoem | null> => {
	const requestInit: RequestInit = {
		cache: 'no-store',
	};

	if (token) {
		requestInit.headers = {
			'x-user-token': token,
		};
	}

	const response = await fetch('/api/dashboard/poem', requestInit);
	if (!response.ok) {
		throw new Error('poem_request_failed');
	}

	const sentenceResult = (await response.json()) as JinrishiciSentenceResponse;
	if (sentenceResult.token) {
		setStoredToken(sentenceResult.token);
	}

	return normalizePoem(sentenceResult);
};

const SeoCommunityPoem = () => {
	const t = useTranslations();
	const [poem, setPoem] = useState<ClassicalPoem | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const loadPoem = async () => {
		setIsLoading(true);
		setHasError(false);

		try {
			const token = getStoredToken() ?? undefined;
			let nextPoem = await fetchPoemByJsonApi(token);
			if (!nextPoem) {
				clearStoredToken();
				nextPoem = await fetchPoemByJsonApi();
			}

			setPoem(nextPoem);
			setHasError(!nextPoem);
		} catch (error) {
			console.error(error);
			setHasError(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadPoem();
	}, []);

	const meta = [poem?.dynasty, poem?.author, poem?.title && `《${poem.title}》`]
		.filter(Boolean)
		.join(' · ');

	return (
		<div className='flex items-start justify-between gap-3 py-4'>
			<div className='min-w-0 flex-1'>
				{isLoading ? (
					<div className='space-y-2'>
						<Skeleton className='h-5 w-full rounded-md' />
						<Skeleton className='h-5 w-[72%] rounded-md' />
						<Skeleton className='h-4 w-[48%] rounded-md' />
					</div>
				) : (
					<>
						<div className='text-sm leading-7 text-foreground'>
							{hasError || !poem
								? t('dashboard_random_poem_error')
								: poem.content}
						</div>
						{!hasError && meta ? (
							<div className='pt-2 text-xs text-muted-foreground'>{meta}</div>
						) : null}
					</>
				)}
			</div>
			<Button
				type='button'
				size='icon-sm'
				variant='ghost'
				className='shrink-0 rounded-full text-muted-foreground'
				title={t('refresh')}
				onClick={() => void loadPoem()}
				disabled={isLoading}>
				<RefreshCcw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
			</Button>
		</div>
	);
};

export default SeoCommunityPoem;
