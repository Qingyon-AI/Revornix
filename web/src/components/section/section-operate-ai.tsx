'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Bot, ImagePlus, Loader2, Plus, Send, X } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import sectionApi from '@/api/section';
import { useAIImageAttachments } from '@/hooks/use-ai-image-attachments';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { settingAnchorHrefs } from '@/lib/setting-navigation';
import {
	applyAIEventToMessages,
	pushAIWorkflowStep,
	updateAssistantMessage,
} from '@/lib/ai-message-events';
import { consumeAIEventStream } from '@/lib/ai-stream';
import { cn, replacePath } from '@/lib/utils';
import { getUserTimeZone } from '@/lib/time';
import { formatUploadSize, IMAGE_MAX_UPLOAD_BYTES } from '@/lib/upload';
import { useUserContext } from '@/provider/user-provider';
import type { AIEvent, AIPhase, Message } from '@/types/ai';
import AIModelSelect from '@/components/ai/model-select';
import MessageCard from '../revornixai/message-card';
import { Button } from '../ui/button';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { generateUUID } from '@/lib/uuid';

const phaseLabelMap: Record<AIPhase, string> = {
	idle: 'revornix_ai_phase_idle',
	thinking: 'section_ai_phase_context',
	writing: 'section_ai_phase_answering',
	tool: 'revornix_ai_phase_tool',
	tool_result: 'revornix_ai_phase_tool_result',
	done: 'revornix_ai_phase_done',
	error: 'revornix_ai_phase_error',
};

const SectionOperateAI = ({
	section_id,
	section_title,
	disabled,
	className,
	onTriggerClick,
	iconOnly = false,
	open,
	onOpenChange,
}: {
	section_id: number;
	section_title?: string;
	disabled?: boolean;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { mainUserInfo } = useUserContext();
	const { revornixModel } = useDefaultResourceAccess();
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
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState('');
	const [enableMcp, setEnableMcp] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);
	const [selectedModelId, setSelectedModelId] = useState<number | null>(
		mainUserInfo?.default_revornix_model_id ?? null,
	);
	const sheetOpen = open ?? internalOpen;
	const setSheetOpen = onOpenChange ?? setInternalOpen;

	const messageEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setSelectedModelId(mainUserInfo?.default_revornix_model_id ?? null);
	}, [mainUserInfo?.default_revornix_model_id]);

	useEffect(() => {
		messageEndRef.current?.scrollIntoView({
			behavior: 'auto',
			block: 'end',
		});
	}, [messages.length, messages.at(-1)?.content]);

	const handleEvent = (event: AIEvent) => {
		setMessages((currentMessages) =>
			applyAIEventToMessages({
				messages: currentMessages,
				event,
				phaseLabelMap,
				phaseLabelPrefixes: ['section_ai_', 'revornix_ai_'],
				translate: (key) => (t.has(key as any) ? t(key as any) : key),
			}),
		);

		if (event.type === 'done') {
			void queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			void queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		}
	};

	const consumeSSE = async (response: Response) => {
		await consumeAIEventStream(response, handleEvent, {
			missingBodyMessage: t('something_wrong'),
			onInvalidChunk: (raw, error) => {
				console.error('Invalid SSE chunk', raw, error);
			},
		});
	};
	const sendMessage = async (
		payloadMessages: Message[],
		enable_mcp: boolean,
		model_id: number | null,
		assistant_chat_id?: string,
	) => {
		const headers = new Headers();
		headers.append('Content-Type', 'application/json');
		const accessToken = Cookies.get('access_token');
		if (accessToken) {
			headers.append('Authorization', `Bearer ${accessToken}`);
		}
		const userTimeZone = getUserTimeZone();
		if (userTimeZone) {
			headers.append('X-User-Timezone', userTimeZone);
		}

		const response = await fetch(sectionApi.askSectionAi, {
			headers,
			method: 'POST',
			mode: 'cors',
			credentials: 'same-origin',
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
			body: JSON.stringify({
				section_id,
				messages: payloadMessages.map((message) => ({
					chat_id: message.chat_id,
					role: message.role,
					content: message.content,
					images: message.images,
				})),
				enable_mcp,
				model_id,
				assistant_chat_id,
			}),
		});

		if (response.status !== 200) {
			let errorMessage = t('section_ai_send_failed');
			try {
				errorMessage = (await response.json()).message || errorMessage;
			} catch (error) {
				console.error(error);
			}
			throw new Error(errorMessage);
		}

		await consumeSSE(response);
	};

	const onSubmit = async () => {
		const trimmedInput = input.trim();
		if (!trimmedInput && imagePaths.length === 0) {
			return;
		}
		if (!selectedModelId) {
			toast.error(t('select_model_first'));
			return;
		}
		if (
			selectedModelId === mainUserInfo?.default_revornix_model_id &&
			revornixModel.subscriptionLocked
		) {
			toast.error(t('default_resource_subscription_locked'));
			return;
		}

		const nextUserMessage: Message = {
			chat_id: generateUUID(),
			role: 'user',
			content: trimmedInput,
			images: imagePaths.length > 0 ? [...imagePaths] : undefined,
		};
		const optimisticAssistantChatId = generateUUID();
		const nextMessages = [...messages, nextUserMessage];
		setMessages(nextMessages);
		setMessages((currentMessages) =>
			updateAssistantMessage(currentMessages, optimisticAssistantChatId, (message) => ({
				...message,
				role: 'assistant',
				ai_state: {
					phase: 'thinking',
					label: 'section_ai_phase_context',
				},
				ai_workflow: pushAIWorkflowStep(
					message.ai_workflow,
					'thinking',
					'section_ai_phase_context',
				),
			})),
		);
		setInput('');
		clearAttachments();
		setIsSending(true);

		try {
			await sendMessage(
				nextMessages,
				enableMcp,
				selectedModelId,
				optimisticAssistantChatId,
			);
		} catch (error: any) {
			const errorMessage = error?.message || t('section_ai_send_failed');
			setMessages((currentMessages) =>
				updateAssistantMessage(
					currentMessages,
					optimisticAssistantChatId,
					(message) => ({
						...message,
						role: 'assistant',
						ai_state: {
							phase: 'error',
							label: errorMessage,
							error: errorMessage,
						},
						ai_workflow: pushAIWorkflowStep(
							message.ai_workflow,
							'error',
							errorMessage,
							{ message: errorMessage },
						),
					}),
				),
			);
			toast.error(errorMessage);
			console.error(error);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
			<SheetTrigger asChild>
				<Button
					title={t('section_ai_ask')}
					data-seo-ai-button
					variant={'ghost'}
					className={cn('flex-1 text-xs w-full', className)}
					disabled={disabled}
					onClick={onTriggerClick}>
					<Bot />
					{iconOnly ? (
						<span
							data-seo-ai-label
							aria-hidden='true'
							className='ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[margin,max-width,opacity] duration-300'>
							{t('section_ai_ask')}
						</span>
					) : (
						t('section_ai_ask')
					)}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-2xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3'>
					<SheetTitle className='text-xl'>{t('section_ai_ask')}</SheetTitle>
					<SheetDescription className='max-w-2xl text-sm leading-5'>
						{t('section_ai_description', {
							title: section_title || t('sidebar_section'),
						})}
					</SheetDescription>
					<div className='rounded-lg border border-border/60 bg-card/65 px-3 py-2 text-xs leading-5 text-muted-foreground'>
						{t('section_ai_session_notice')}
					</div>
				</SheetHeader>

				<div className='flex-1 overflow-auto px-5 py-4'>
					{messages.length === 0 && (
						<div className='rounded-xl border border-border/60 bg-card/65 px-4 py-3'>
							<div className='text-sm text-foreground'>
								{t('section_ai_empty')}
							</div>
							<div className='mt-1 text-xs leading-5 text-muted-foreground'>
								{t('section_ai_tip')}
							</div>
						</div>
					)}

					{messages.length > 0 && (
						<div className='flex flex-col gap-4'>
							{messages.map((message) => (
								<div
									key={message.chat_id}
									className={cn('max-w-full', {
										'pl-8': message.role === 'user',
									})}>
									<MessageCard message={message} />
								</div>
							))}
							<div ref={messageEndRef} />
						</div>
					)}
				</div>

				<div>
					<div className='flex flex-wrap items-center gap-1.5 border-y border-border/60 p-2'>
						<div className='inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/60 bg-background px-3 text-xs'>
							<span className='shrink-0 text-muted-foreground'>
								{t('use_model')}
							</span>
							<AIModelSelect
								value={selectedModelId}
								onChange={setSelectedModelId}
								disabled={isSending}
								variant='inline'
								size='sm'
								placeholder={t('choose_conversation_model')}
							/>
						</div>
						<div
							className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5'
							title={t('revornix_ai_mcp_description')}>
							<span className='text-xs font-medium text-foreground'>
								{t('revornix_ai_mcp_status')}
							</span>
							<Switch
								checked={enableMcp}
								onCheckedChange={setEnableMcp}
								disabled={isSending}
							/>
							<span className='h-3.5 w-px shrink-0 bg-border' />
							<Link
								href={settingAnchorHrefs.mcpServerManage}
								className='text-xs text-muted-foreground transition-colors hover:text-foreground'>
								{t('revornix_ai_go_to_configure_mcp')}
							</Link>
						</div>
					</div>
					{attachments.length > 0 && mainUserInfo?.id ? (
						<div className='flex flex-wrap gap-2 p-2'>
							{attachments.map((attachment) => (
								<div
									key={attachment.path}
									className='relative h-14 w-14 overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:h-16 sm:w-16'>
									<img
										src={replacePath(attachment.path, mainUserInfo.id)}
										alt={attachment.name}
										className='h-full w-full object-cover'
									/>
									<button
										type='button'
										className='absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background'
										onClick={() => removeAttachment(attachment.path)}
										aria-label={t('delete')}>
										<X className='size-3' />
									</button>
								</div>
							))}
						</div>
					) : null}
					<Textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						placeholder={t('section_ai_placeholder')}
						className='min-h-[112px] max-h-[240px] border-none bg-transparent shadow-none focus-visible:ring-0 resize-none dark:bg-transparent'
						disabled={isSending}
						onKeyDown={(event) => {
							if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
								event.preventDefault();
								void onSubmit();
							}
						}}
					/>
					<div className='flex items-center justify-between gap-4 p-2'>
						<div className='flex min-w-0 items-center gap-3 text-xs text-muted-foreground'>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										type='button'
										size='icon'
										variant='outline'
										className='size-8 rounded-full shadow-none'
										disabled={isSending || isUploadingImages}
										aria-label={t('chat_add_menu')}>
										{isUploadingImages ? (
											<Loader2 className='size-4 animate-spin' />
										) : (
											<Plus className='size-4' />
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start' side='top' className='shadow-none'>
									<DropdownMenuItem
										onClick={openPicker}
										disabled={isSending || isUploadingImages}>
										<ImagePlus className='size-4' />
										<span>{t('upload_image')}</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<Button
							type='button'
							size={'icon'}
							onClick={() => void onSubmit()}
							disabled={
								isSending ||
								(input.trim().length === 0 && imagePaths.length === 0) ||
								isUploadingImages ||
								!selectedModelId ||
								(selectedModelId === mainUserInfo?.default_revornix_model_id &&
									(revornixModel.loading || revornixModel.subscriptionLocked))
							}>
							<Send />
						</Button>
					</div>
					<input
						ref={imageInputRef}
						type='file'
						accept='image/*'
						multiple
						className='hidden'
						onChange={(event) => {
							void handleFileChange(event);
						}}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateAI;
