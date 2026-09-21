'use client';

/**
 * 输入框上的「会话设置」—— 思考档位、工具权限、上下文水位收进一个弹出层。
 *
 * **为什么收起来。** 工具行上的东西按使用频率分层:每次都要看的(模型、MCP、发送)留在
 * 面上,「配好就不再动」的进这里。八个控件平铺在一行时,最常用的和最少用的权重完全一样。
 *
 * **为什么是它们三个。** 思考档位和工具权限此前**在界面上根本不存在** —— 接口收得下、
 * 数据库存得住、sidecar 也真的读,只是没有任何地方能改。上下文水位原先钉在页头,离
 * 「立即整理」那颗按钮隔着半个屏幕;它们是同一件事的两半:看还剩多少、据此决定要不要整理,
 * 拆开放会让读数变成一个没有下文的数字。
 */
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EraserIcon, Loader2Icon, SlidersHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAgentChatStore } from '@/store/agent-chat';
import type { AgentSession } from '@/types/agent';

const THINKING_LEVELS: AgentSession['thinking_level'][] = ['off', 'low', 'medium', 'high'];
const PERMISSION_MODES: AgentSession['permission_mode'][] = ['manual', 'auto', 'bypass'];

/** 一排互斥的小按钮。三四个选项用分段控件比下拉清楚 —— 下拉要点开才知道有哪几档。 */
const Segmented = <T extends string>({
	value,
	options,
	label,
	onChange,
}: {
	value: T;
	options: readonly T[];
	label: (option: T) => string;
	onChange: (next: T) => void;
}) => (
	<div className='flex items-center gap-1 rounded-lg bg-muted/60 p-0.5'>
		{options.map((option) => (
			<button
				key={option}
				type='button'
				aria-pressed={option === value}
				onClick={() => onChange(option)}
				className={cn(
					'min-w-0 flex-1 truncate rounded-md px-2 py-1 text-xs transition-colors',
					option === value
						? 'bg-background text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground',
				)}>
				{label(option)}
			</button>
		))}
	</div>
);

const AgentSessionSettings = () => {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [compacting, setCompacting] = useState(false);
	const session = useAgentChatStore((s) => s.currentSession);
	const patchSession = useAgentChatStore((s) => s.patchSession);
	const compact = useAgentChatStore((s) => s.compact);

	if (!session) return null;

	const context = session.context;
	const ratio = context?.window ? Math.min(1, context.tokens / context.window) : 0;
	const percent = Math.round(ratio * 100);
	const mode = session.permission_mode ?? 'manual';

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
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type='button'
					size='icon-sm'
					variant='ghost'
					className='relative rounded-full text-muted-foreground'
					aria-label={t('agent_session_settings')}>
					<SlidersHorizontalIcon className='size-4' />
					{/* 收起来之后也要看得见现在放了多少权 —— 用户不知道自己此刻授权了什么,
					    就等于没有授权。默认档不点灯:一个「一切正常」的常驻标记只会变成背景噪音。 */}
					{mode !== 'manual' && (
						<span
							className={cn(
								'absolute right-1 top-1 size-1.5 rounded-full',
								mode === 'bypass' ? 'bg-destructive' : 'bg-primary',
							)}
						/>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align='start' className='grid w-[280px] gap-3 p-3'>
				<div className='grid gap-1.5'>
					<span className='text-xs font-medium text-muted-foreground'>
						{t('agent_thinking_level')}
					</span>
					<Segmented
						value={session.thinking_level ?? 'off'}
						options={THINKING_LEVELS}
						label={(one) => t(`agent_thinking_${one}`)}
						onChange={(next) => void patchSession(session.id, { thinking_level: next })}
					/>
				</div>
				<div className='grid gap-1.5'>
					<span className='text-xs font-medium text-muted-foreground'>
						{t('agent_permission_mode')}
					</span>
					<Segmented
						value={mode}
						options={PERMISSION_MODES}
						label={(one) => t(`agent_permission_mode_${one}`)}
						onChange={(next) => void patchSession(session.id, { permission_mode: next })}
					/>
					<p className='text-[11px] leading-5 text-muted-foreground'>
						{t(`agent_permission_mode_${mode}_hint`)}
					</p>
				</div>
				{context && context.window > 0 && (
					<div className='grid gap-2 border-t border-border/60 pt-3'>
						<div className='flex items-center justify-between gap-2'>
							<span className='text-xs font-medium text-muted-foreground'>
								{t('agent_context_title')}
							</span>
							<span
								className='flex items-center gap-1.5'
								title={`${context.tokens} / ${context.window} tokens`}>
								<span className='h-1.5 w-16 overflow-hidden rounded-full bg-muted'>
									<span
										className={cn(
											'block h-full',
											ratio > 0.8
												? 'bg-destructive'
												: ratio > 0.6
													? 'bg-amber-500'
													: 'bg-primary',
										)}
										style={{ width: `${percent}%` }}
									/>
								</span>
								<span className='text-[11px] tabular-nums text-muted-foreground'>
									{percent}%
								</span>
							</span>
						</div>
						{/* **不关弹出层**:水位条就在这颗按钮上面,整理的结果(剩余百分比变化)恰恰
						    在这里显示。关掉它等于把用户刚触发的那件事的结果藏起来。 */}
						<Button
							type='button'
							size='sm'
							variant='outline'
							className='w-full gap-1.5'
							disabled={compacting || session.status === 'running'}
							onClick={handleCompact}>
							{compacting ? (
								<Loader2Icon className='size-3.5 animate-spin' />
							) : (
								<EraserIcon className='size-3.5' />
							)}
							{t('agent_compact_now')}
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
};

export default AgentSessionSettings;
