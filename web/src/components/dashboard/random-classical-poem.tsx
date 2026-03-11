'use client';

import { BookText, RefreshCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

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

const fetchPoemByJsonApi = async (token?: string): Promise<ClassicalPoem | null> => {
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

const RandomClassicalPoem = () => {
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
		<div className='flex max-w-sm items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2 text-left shadow-sm backdrop-blur-sm'>
			<div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'>
				<BookText className='size-4' />
			</div>
			<div className='min-w-0 flex-1'>
				<p className='line-clamp-2 text-sm leading-6 text-foreground/90'>
					{isLoading
						? t('dashboard_random_poem_loading')
						: hasError || !poem
							? t('dashboard_random_poem_error')
							: poem.content}
				</p>
				{!isLoading && !hasError && meta && (
					<p className='mt-1 line-clamp-1 text-[11px] text-muted-foreground'>
						{meta}
					</p>
				)}
			</div>
			<Button
				type='button'
				size='icon'
				variant='ghost'
				className='size-8 shrink-0 self-center rounded-lg text-muted-foreground'
				title={t('refresh')}
				onClick={() => void loadPoem()}
				disabled={isLoading}>
				<RefreshCcw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
			</Button>
		</div>
	);
};

export default RandomClassicalPoem;
