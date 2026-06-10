'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2Icon, LockKeyholeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AccessKeyGate = ({ incorrect = false }: { incorrect?: boolean }) => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [accessKey, setAccessKey] = useState('');
	// useTransition (instead of a manual flag) so the button re-enables
	// automatically when the refreshed server render lands — the component
	// instance survives the navigation, so manual state would stay stuck.
	const [isPending, startTransition] = useTransition();

	const handleSubmit = () => {
		const normalized = accessKey.trim();
		if (!normalized) return;
		// The key is carried in the URL only (?key=...), never persisted
		// locally — the server reads it from searchParams on re-render.
		const params = new URLSearchParams(searchParams.toString());
		params.set('key', normalized);
		startTransition(() => {
			router.replace(`${pathname}?${params.toString()}`);
		});
	};

	return (
		<div className='flex min-h-[calc(100dvh-3.5rem)] w-full items-center justify-center px-4'>
			<div className='flex w-full max-w-sm flex-col items-center gap-4 text-center'>
				<div className='flex size-12 items-center justify-center rounded-full bg-muted'>
					<LockKeyholeIcon className='size-6 text-muted-foreground' />
				</div>
				<h1 className='text-lg font-semibold'>{t('access_key_gate_title')}</h1>
				<p className='text-sm text-muted-foreground'>
					{t('access_key_gate_description')}
				</p>
				<Input
					type='password'
					autoFocus
					value={accessKey}
					placeholder={t('access_key_placeholder')}
					onChange={(event) => setAccessKey(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') handleSubmit();
					}}
				/>
				{incorrect && (
					<p className='text-sm text-destructive'>
						{t('access_key_incorrect')}
					</p>
				)}
				<Button
					className='w-full'
					disabled={!accessKey.trim() || isPending}
					onClick={handleSubmit}>
					{isPending ? (
						<>
							<Loader2Icon className='size-4 animate-spin' />
							{t('loading')}
						</>
					) : (
						t('access_key_gate_submit')
					)}
				</Button>
			</div>
		</div>
	);
};

export default AccessKeyGate;
