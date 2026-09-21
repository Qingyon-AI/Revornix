'use client';

/**
 * 智能体的输入卡。
 *
 * 版式抄的是同一套架构的另一份实现(Mosael 的 ChatComposer):**一张卡、一条工具行、
 * 一个圆按钮**。此前这里的毛病不是少了什么,是每个控件各按各的刻度来 —— 模型下拉 h-8、
 * MCP 是个裸 Switch、图片是 size='sm' 的方按钮、发送是带文字的方按钮,四个东西四种高度
 * 四种圆角,眼睛没有任何一条线可以扫过去。现在工具行上的东西统一 28px,右边只留一个
 * 圆按钮 —— 那才是这张卡唯一的主动作。
 *
 * 发送键的含义会变(和 ChatGPT / Mosael 一致):正在回答且输入框是空的 → 停止;
 * 只要打了字 → 还是发送。**这不只是好看**:后端本来就支持在一轮跑着的时候再收消息
 * (排队,见 app/agent/host.py 的抢占),队列条也一直画在这张卡里 —— 只是原先这个按钮
 * 在 running 时一律变成「停止」,用户根本没有入口把消息排进去,那条队列条等于死的。
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Send, Square, Wrench, X, ZapIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
//: 用纯 tooltip 而不是 hybrid-tooltip —— 后者在触屏上会退化成 Popover,那意味着点一下
//: 「发送」除了把消息发出去还弹一张小卡。这一行上的东西都是要被点的,不是用来看的。
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUserContext } from '@/provider/user-provider';
import { useAIImageAttachments } from '@/hooks/use-ai-image-attachments';
import { useAgentChatStore } from '@/store/agent-chat';
import AIModelSelect from '@/components/ai/model-select';
import { cn, replacePath } from '@/lib/utils';

const AgentSendForm = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [message, setMessage] = useState('');
	const currentSession = useAgentChatStore((s) => s.currentSession);
	const sending = useAgentChatStore((s) => s.sending);
	const stream = useAgentChatStore((s) => s.stream);
	const queue = useAgentChatStore((s) => s.queue);
	const sendMessage = useAgentChatStore((s) => s.sendMessage);
	const stop = useAgentChatStore((s) => s.stop);
	const steer = useAgentChatStore((s) => s.steer);
	const cancelQueued = useAgentChatStore((s) => s.cancelQueued);
	const patchSession = useAgentChatStore((s) => s.patchSession);
	const {
		attachments,
		imagePaths,
		isUploading: isUploadingImages,
		inputRef: imageInputRef,
		openPicker,
		handleFileChange,
		removeAttachment,
		clearAttachments,
	} = useAIImageAttachments();

	const running = currentSession?.status === 'running' || (stream && !stream.done);
	const hasDraft = message.trim().length > 0 || imagePaths.length > 0;
	/** 空手 + 正在回答 = 这个按钮是「停止」,其余时候都是「发送」。 */
	const showStop = Boolean(running) && !hasDraft;
	const mcpOn = currentSession?.enable_mcp ?? false;

	const handleSend = async () => {
		const content = message.trim();
		if (!content && imagePaths.length === 0) {
			toast.error(t('revornix_ai_message_content_needed'));
			return;
		}
		if (!currentSession) return;
		setMessage('');
		try {
			await sendMessage(content, imagePaths.length > 0 ? [...imagePaths] : undefined);
			clearAttachments();
		} catch (error: any) {
			toast.error(error?.message ?? t('revornix_ai_error_server_failed'));
		}
	};

	return (
		<div className='flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-background px-3 pb-2 pt-2.5 shadow-sm transition-colors focus-within:border-ring/70'>
			{queue.length > 0 && (
				<div className='flex flex-col gap-1'>
					{queue.map((queued) => (
						<div
							key={queued.id}
							className='flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs'>
							<span className='min-w-0 flex-1 truncate text-muted-foreground'>
								{queued.content}
							</span>
							<button
								type='button'
								className='inline-flex shrink-0 items-center gap-1 text-primary hover:underline'
								title={t('agent_steer_hint')}
								onClick={() => void steer(queued.id)}>
								<ZapIcon className='size-3' />
								{t('agent_steer')}
							</button>
							<button
								type='button'
								className='shrink-0 text-muted-foreground hover:text-foreground'
								title={t('agent_cancel_queued')}
								onClick={() => void cancelQueued(queued.id)}>
								<X className='size-3' />
							</button>
						</div>
					))}
				</div>
			)}
			{attachments.length > 0 && (
				<div className='flex flex-wrap gap-2'>
					{attachments.map((attachment) => (
						<div
							key={attachment.path}
							className='group relative size-14 overflow-hidden rounded-lg border border-border/60 bg-muted/40'>
							{mainUserInfo?.id && (
								<img
									src={replacePath(attachment.path, mainUserInfo.id)}
									alt={attachment.name}
									className='h-full w-full object-cover'
								/>
							)}
							<button
								type='button'
								className='absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 shadow'
								onClick={() => removeAttachment(attachment.path)}
								aria-label={t('delete')}>
								<X className='size-2.5' />
							</button>
						</div>
					))}
				</div>
			)}
			{/* 空的时候只占一行高 —— 原先固定 72px,一张卡有一半是空白。
			    输满之后自己长(Textarea 默认 field-sizing-content),到 200px 封顶转内部滚动。 */}
			<Textarea
				value={message}
				onChange={(event) => setMessage(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
						event.preventDefault();
						void handleSend();
					}
				}}
				placeholder={t('revornix_ai_quickly_send')}
				className='max-h-[200px] min-h-9 resize-none overflow-y-auto border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 dark:bg-transparent'
			/>
			<div className='flex items-center gap-1'>
				<AIModelSelect
					value={currentSession?.model_id ?? mainUserInfo?.default_revornix_model_id ?? null}
					onChange={(id) => {
						if (currentSession) void patchSession(currentSession.id, { model_id: id });
					}}
					size='sm'
					variant='inline'
					/* 和右边那颗 MCP 药丸同一个形状,这一行才扫得过去:同样 28px 高、
					   同样的圆角、同样只有 hover 时才浮出底色。 */
					className='px-2! text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
				/>
				{/* 开关做成一颗药丸,而不是裸 Switch:Switch 是表单控件的分量,而这一行上
				    其余都是图标按钮 —— 混在一起时它比模型名还抢眼,可它并不是主角。
				    亮起来就是开着,和 ChatGPT 那排模式键同一个读法。 */}
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type='button'
							role='switch'
							aria-checked={mcpOn}
							disabled={!currentSession}
							onClick={() => {
								if (currentSession)
									void patchSession(currentSession.id, { enable_mcp: !mcpOn });
							}}
							className={cn(
								'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50',
								mcpOn
									? 'border-primary/30 bg-primary/10 text-primary'
									: 'border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
							)}>
							<Wrench className='size-3.5' />
							MCP
						</button>
					</TooltipTrigger>
					<TooltipContent>
						{mcpOn ? t('agent_mcp_on_hint') : t('agent_mcp_off_hint')}
					</TooltipContent>
				</Tooltip>
				<div className='flex-1' />
				<input
					ref={imageInputRef}
					type='file'
					accept='image/*'
					multiple
					className='hidden'
					onChange={handleFileChange}
				/>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type='button'
							size='icon-sm'
							variant='ghost'
							className='rounded-full text-muted-foreground'
							disabled={isUploadingImages}
							onClick={openPicker}
							aria-label={t('agent_add_image')}>
							{isUploadingImages ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<ImagePlus className='size-4' />
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{t('agent_add_image')}</TooltipContent>
				</Tooltip>
				{showStop ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type='button'
								size='icon-sm'
								className='rounded-full'
								onClick={() => void stop()}
								aria-label={t('agent_stop')}>
								<Square className='size-3' fill='currentColor' />
							</Button>
						</TooltipTrigger>
						<TooltipContent>{t('agent_stop')}</TooltipContent>
					</Tooltip>
				) : (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								type='button'
								size='icon-sm'
								className='rounded-full'
								disabled={sending || !currentSession || !hasDraft || isUploadingImages}
								onClick={() => void handleSend()}
								aria-label={running ? t('agent_queue_send') : t('agent_send')}>
								{sending ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<Send className='size-4' />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{running ? t('agent_queue_send') : t('agent_send')}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
};

export default AgentSendForm;
