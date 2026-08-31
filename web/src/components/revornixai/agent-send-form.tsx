'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Send, Square, Wrench, X, ZapIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useUserContext } from '@/provider/user-provider';
import { useAIImageAttachments } from '@/hooks/use-ai-image-attachments';
import { useAgentChatStore } from '@/store/agent-chat';
import AIModelSelect from '@/components/ai/model-select';
import { replacePath } from '@/lib/utils';

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
		<div className='rounded-2xl border border-border/60 bg-background p-3 shadow-sm'>
			{queue.length > 0 && (
				<div className='mb-2 flex flex-col gap-1'>
					{queue.map((queued) => (
						<div
							key={queued.id}
							className='flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs'>
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
				<div className='mb-2 flex flex-wrap gap-2'>
					{attachments.map((attachment) => (
						<div key={attachment.path} className='group relative h-14 w-14 overflow-hidden rounded-lg bg-muted/40'>
							{mainUserInfo?.id && (
								<img
									src={replacePath(attachment.path, mainUserInfo.id)}
									alt={attachment.name}
									className='h-full w-full object-cover'
								/>
							)}
							<button
								type='button'
								className='absolute top-0.5 right-0.5 rounded-full bg-background/90 p-0.5 shadow'
								onClick={() => removeAttachment(attachment.path)}
								aria-label={t('delete')}>
								<X className='size-2.5' />
							</button>
						</div>
					))}
				</div>
			)}
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
				className='min-h-[72px] resize-none border-0 p-1 shadow-none focus-visible:ring-0'
			/>
			<div className='mt-2 flex items-center gap-2'>
				<AIModelSelect
					value={currentSession?.model_id ?? mainUserInfo?.default_revornix_model_id ?? null}
					onChange={(id) => {
						if (currentSession) void patchSession(currentSession.id, { model_id: id });
					}}
					size='sm'
					variant='inline'
				/>
				<div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
					<Wrench className='size-3.5' />
					<span>MCP</span>
					<Switch
						checked={currentSession?.enable_mcp ?? false}
						onCheckedChange={(checked) => {
							if (currentSession)
								void patchSession(currentSession.id, { enable_mcp: checked });
						}}
					/>
				</div>
				<div className='flex-1' />
				<input
					ref={imageInputRef}
					type='file'
					accept='image/*'
					multiple
					className='hidden'
					onChange={handleFileChange}
				/>
				<Button
					type='button'
					size='sm'
					variant='ghost'
					disabled={isUploadingImages}
					onClick={openPicker}
					title={t('agent_add_image')}>
					{isUploadingImages ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<ImagePlus className='size-4' />
					)}
				</Button>
				{running ? (
					<Button type='button' size='sm' variant='outline' onClick={() => void stop()}>
						<Square className='mr-1 size-3.5' />
						{t('agent_stop')}
					</Button>
				) : (
					<Button
						type='button'
						size='sm'
						disabled={sending || !currentSession}
						onClick={() => void handleSend()}>
						{sending ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							<Send className='size-4' />
						)}
					</Button>
				)}
			</div>
		</div>
	);
};

export default AgentSendForm;
