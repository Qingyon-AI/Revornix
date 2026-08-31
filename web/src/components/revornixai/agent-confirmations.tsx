'use client';

/**
 * 内联确认卡:智能体的写操作在这里等人批准。
 *
 * 轮询而不是推送:卡的生命周期是"人速"的(几秒到几分钟),100ms 级的新鲜度没有意义,
 * 2s 轮询足够,也比再开一条推送通道简单得多。
 */
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentChatStore } from '@/store/agent-chat';
import type { ToolConfirmation } from '@/types/agent';

const PermissionBadge = ({
	permission,
}: {
	permission: ToolConfirmation['permission'];
}) => {
	const t = useTranslations();
	const styles: Record<string, string> = {
		edit: 'bg-muted text-muted-foreground',
		'ai-cost': 'bg-amber-500/10 text-amber-600',
		destructive: 'bg-destructive/10 text-destructive',
	};
	return (
		<span
			className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[permission] ?? styles.edit}`}>
			{t(`agent_permission_${permission.replace('-', '_')}` as any)}
		</span>
	);
};

const AgentConfirmations = () => {
	const t = useTranslations();
	const confirmations = useAgentChatStore((s) => s.confirmations);
	const stream = useAgentChatStore((s) => s.stream);
	const refreshConfirmations = useAgentChatStore(
		(s) => s.refreshConfirmations,
	);
	const approve = useAgentChatStore((s) => s.approve);
	const reject = useAgentChatStore((s) => s.reject);
	const currentSessionId = useAgentChatStore((s) => s.currentSessionId);

	// 轮在跑(或刚跑完)时每 2s 看一次 pending 卡;闲下来就停。
	useEffect(() => {
		if (currentSessionId === null) return;
		if (stream?.done !== false) return;
		const timer = window.setInterval(() => {
			void refreshConfirmations();
		}, 2000);
		return () => window.clearInterval(timer);
	}, [currentSessionId, stream?.done, refreshConfirmations]);

	if (confirmations.length === 0) return null;

	return (
		<div className='mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 pb-2 sm:px-5'>
			{confirmations.map((card) => (
				<div
					key={card.id}
					className='rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3'>
					<div className='flex items-start gap-2.5'>
						<ShieldAlertIcon className='mt-0.5 size-4 shrink-0 text-amber-600' />
						<div className='min-w-0 flex-1'>
							<div className='flex items-center gap-2'>
								<span className='text-xs font-medium text-muted-foreground'>
									{card.tool}
								</span>
								<PermissionBadge permission={card.permission} />
							</div>
							<div className='mt-1 text-sm leading-6 break-words'>
								{card.summary}
							</div>
							<div className='mt-2.5 flex items-center gap-2'>
								<Button size='sm' onClick={() => void approve(card.id, false)}>
									<ShieldCheckIcon className='mr-1 size-3.5' />
									{t('agent_approve_once')}
								</Button>
								<Button
									size='sm'
									variant='outline'
									onClick={() => void approve(card.id, true)}>
									{t('agent_always_allow_session')}
								</Button>
								<Button
									size='sm'
									variant='ghost'
									className='text-destructive hover:text-destructive'
									onClick={() => void reject(card.id)}>
									<ShieldXIcon className='mr-1 size-3.5' />
									{t('agent_reject')}
								</Button>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};

export default AgentConfirmations;
