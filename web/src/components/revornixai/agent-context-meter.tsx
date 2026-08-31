'use client';

/** 上下文水位 + 「立即整理」。数字来自后端(session.context),压缩走一次模型调用。 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EraserIcon, Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAgentChatStore } from '@/store/agent-chat';

const AgentContextMeter = () => {
	const t = useTranslations();
	const session = useAgentChatStore((s) => s.currentSession);
	const compact = useAgentChatStore((s) => s.compact);
	const [compacting, setCompacting] = useState(false);

	const context = session?.context;
	if (!context || !context.window) return null;
	const ratio = Math.min(1, context.tokens / context.window);
	const percent = Math.round(ratio * 100);

	const handleCompact = async () => {
		setCompacting(true);
		try {
			await compact();
			toast.success(t('agent_compact_done'));
		} catch (error: any) {
			toast.error(error?.message ?? t('agent_compact_failed'));
		} finally {
			setCompacting(false);
		}
	};

	return (
		<div className='flex items-center gap-2'>
			<div className='flex items-center gap-1.5' title={`${context.tokens} / ${context.window} tokens`}>
				<div className='h-1.5 w-16 overflow-hidden rounded-full bg-muted'>
					<div
						className={
							ratio > 0.8
								? 'h-full bg-destructive'
								: ratio > 0.6
									? 'h-full bg-amber-500'
									: 'h-full bg-primary'
						}
						style={{ width: `${percent}%` }}
					/>
				</div>
				<span className='text-[11px] text-muted-foreground'>{percent}%</span>
			</div>
			<Button
				type='button'
				size='sm'
				variant='ghost'
				className='h-7 px-2 text-xs text-muted-foreground'
				disabled={compacting || session?.status === 'running'}
				onClick={handleCompact}
				title={t('agent_compact_now')}>
				{compacting ? (
					<Loader2Icon className='size-3.5 animate-spin' />
				) : (
					<EraserIcon className='size-3.5' />
				)}
				<span className='ml-1 hidden sm:inline'>{t('agent_compact_now')}</span>
			</Button>
		</div>
	);
};

export default AgentContextMeter;
