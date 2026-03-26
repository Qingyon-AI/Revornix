'use client';

import { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { Bot, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import sectionApi from '@/api/section';
import { useAIImageAttachments } from '@/hooks/use-ai-image-attachments';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { mergeChunkCitations, mergeDocumentSources } from '@/lib/ai-sources';
import { cn, replacePath } from '@/lib/utils';
import { getUserTimeZone } from '@/lib/time';
import { useUserContext } from '@/provider/user-provider';
import type {
	AIEvent,
	AIPhase,
	AIWorkflow,
	Message,
} from '@/types/ai';
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

const phaseLabelMap: Record<AIPhase, string> = {
	idle: 'revornix_ai_phase_idle',
	thinking: 'section_ai_phase_context',
	writing: 'section_ai_phase_answering',
	tool: 'revornix_ai_phase_tool',
	tool_result: 'revornix_ai_phase_tool_result',
	done: 'revornix_ai_phase_done',
	error: 'revornix_ai_phase_error',
};

function pushWorkflowStep(
	workflow: AIWorkflow | undefined,
	phase: AIPhase,
	label: string,
	meta?: any,
): AIWorkflow {
	const steps = workflow ? [...workflow] : [];
	const last = steps[steps.length - 1];

	if (last && last.phase === phase && last.label === label) {
		return steps;
	}

	steps.push({
		phase,
		label,
		meta,
	});
	return steps;
}

function updateAssistantMessage(
	messages: Message[],
	chatId: string,
	updater: (message: Message) => Message,
): Message[] {
	let found = false;
	const nextMessages = messages.map((message) => {
		if (message.chat_id !== chatId) {
			return message;
		}
		found = true;
		return updater(message);
	});

	if (found) {
		return nextMessages;
	}

	return [
		...nextMessages,
		updater({
			chat_id: chatId,
			role: 'assistant',
			content: '',
		}),
	];
}

function resolveSectionPhaseLabel(phase: AIPhase, label?: string) {
	if (
		typeof label === 'string' &&
		(label.startsWith('section_ai_') || label.startsWith('revornix_ai_'))
	) {
		return label;
	}
	return phaseLabelMap[phase];
}

const SectionOperateAI = ({
	section_id,
	section_title,
	disabled,
	className,
	onTriggerClick,
}: {
	section_id: number;
	section_title?: string;
	disabled?: boolean;
	className?: string;
	onTriggerClick?: () => void;
}) => {
	const t = useTranslations();
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

	const messageEndRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		messageEndRef.current?.scrollIntoView({
			behavior: 'auto',
			block: 'end',
		});
	}, [messages.length, messages.at(-1)?.content]);

	const handleEvent = (event: AIEvent) => {
		switch (event.type) {
			case 'status': {
				const label = resolveSectionPhaseLabel(
					event.payload.phase,
					event.payload.label,
				);
				setMessages((currentMessages) =>
					updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
						...message,
						role: 'assistant',
						ai_state: {
							phase: event.payload.phase,
							label,
						},
						ai_workflow: pushWorkflowStep(
							message.ai_workflow,
							event.payload.phase,
							label,
							event.payload.detail,
						),
					})),
				);
				break;
			}
			case 'artifact': {
				const artifact = event.payload;

				if (artifact.kind === 'tool_result') {
					const tool = artifact.tool;
					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							ai_workflow: pushWorkflowStep(
								message.ai_workflow,
								'tool_result',
								phaseLabelMap.tool_result,
								{
									tool,
								},
							),
						})),
					);
					return;
				}

				if (artifact.kind === 'document_sources') {
					const documentSources = artifact.items;
					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							document_sources: mergeDocumentSources(
								message.document_sources,
								documentSources,
							),
						})),
					);
					return;
				}

				if (artifact.kind === 'chunk_citations') {
					const chunkCitations = artifact.items;
					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							chunk_citations: mergeChunkCitations(
								message.chunk_citations,
								chunkCitations,
							),
						})),
					);
				}
				return;
			}
			case 'output': {
				const payload = event.payload;

				if (payload.kind === 'system_text') {
					const translatedMessage = t.has(payload.message as any)
						? t(payload.message as any)
						: payload.message;
					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							content: `${message.content}${payload.paragraph_break ? '\n\n' : ''}${translatedMessage}`,
							ai_state: {
								phase: 'writing',
								label: phaseLabelMap.writing,
							},
							ai_workflow: pushWorkflowStep(
								message.ai_workflow,
								'writing',
								phaseLabelMap.writing,
							),
						})),
					);
					break;
				}

				if (payload.kind === 'tool_result') {
					if (
						Array.isArray(payload.references) &&
						payload.references.length > 0
					) {
						setMessages((currentMessages) =>
							updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
								...message,
								role: 'assistant',
								document_sources: mergeDocumentSources(
									message.document_sources,
									payload.references,
								),
							})),
						);
					}

					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							ai_workflow: pushWorkflowStep(
								message.ai_workflow,
								'tool_result',
								phaseLabelMap.tool_result,
								{
									tool: payload.tool,
								},
							),
						})),
					);
					break;
				}

				if (payload.kind === 'token') {
					setMessages((currentMessages) =>
						updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
							...message,
							role: 'assistant',
							content: message.content + payload.content,
							ai_state: {
								phase: 'writing',
								label: phaseLabelMap.writing,
							},
							ai_workflow: pushWorkflowStep(
								message.ai_workflow,
								'writing',
								phaseLabelMap.writing,
							),
						})),
					);
				}
				break;
			}
			case 'done': {
				setMessages((currentMessages) =>
					updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
						...message,
						role: 'assistant',
						ai_state: {
							phase: 'done',
							label: phaseLabelMap.done,
						},
							ai_workflow: pushWorkflowStep(
								message.ai_workflow,
								'done',
								phaseLabelMap.done,
							),
							chunk_citations:
								event.payload?.references && event.payload.references.length > 0
									? mergeChunkCitations(
											message.chunk_citations,
											event.payload.references,
										)
									: message.chunk_citations,
						})),
					);
				break;
			}
			case 'error': {
				setMessages((currentMessages) =>
					updateAssistantMessage(currentMessages, event.chat_id, (message) => ({
						...message,
						role: 'assistant',
						ai_state: {
							phase: 'error',
							label: event.payload.message || phaseLabelMap.error,
							error: event.payload.message,
						},
						ai_workflow: pushWorkflowStep(
							message.ai_workflow,
							'error',
							event.payload.message || phaseLabelMap.error,
							event.payload,
						),
					})),
				);
				break;
			}
		}
	};

	const consumeSSE = async (response: Response) => {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error(t('something_wrong'));
		}
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() || '';

			for (let raw of parts) {
				if (!raw.trim()) {
					continue;
				}
				if (raw.startsWith('data:')) {
					raw = raw.slice(5).trim();
				}
				try {
					handleEvent(JSON.parse(raw));
				} catch (error) {
					console.error('Invalid SSE chunk', raw, error);
				}
			}
		}
	};

	const sendMessage = async (
		payloadMessages: Message[],
		enable_mcp: boolean,
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
		if (!mainUserInfo?.default_revornix_model_id) {
			toast.error(t('revornix_ai_model_not_set'));
			return;
		}
		if (revornixModel.subscriptionLocked) {
			toast.error(t('default_resource_subscription_locked'));
			return;
		}

		const nextUserMessage: Message = {
			chat_id: crypto.randomUUID(),
			role: 'user',
			content: trimmedInput,
			images: imagePaths.length > 0 ? [...imagePaths] : undefined,
		};
		const nextMessages = [...messages, nextUserMessage];
		setMessages(nextMessages);
		setInput('');
		clearAttachments();
		setIsSending(true);

		try {
			await sendMessage(nextMessages, enableMcp);
		} catch (error: any) {
			toast.error(error?.message || t('section_ai_send_failed'));
			console.error(error);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					title={t('section_ai_ask')}
					variant={'ghost'}
					className={cn('flex-1 text-xs w-full', className)}
					disabled={disabled}
					onClick={onTriggerClick}>
					<Bot />
					{t('section_ai_ask')}
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

				<div className='border-t border-border/60 px-5 py-4'>
					<div className='rounded-xl border border-border/70 bg-card/85 px-4 py-3'>
						{attachments.length > 0 && mainUserInfo?.id ? (
							<div className='mb-3 flex flex-wrap gap-2'>
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
							className='min-h-18 border-none bg-transparent p-0 shadow-none focus-visible:ring-0 resize-none dark:bg-transparent'
							disabled={isSending}
							onKeyDown={(event) => {
								if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
									event.preventDefault();
									void onSubmit();
								}
							}}
						/>
						<div className='flex items-center justify-between gap-4'>
							<div className='flex min-w-0 items-center gap-3 text-xs text-muted-foreground'>
								<Button
									type='button'
									size='sm'
									variant='ghost'
									className='h-8 rounded-full px-3 text-[11px] text-muted-foreground'
									onClick={openPicker}
									disabled={isSending || isUploadingImages}>
									{isUploadingImages ? (
										<Loader2 className='size-3.5 animate-spin' />
									) : (
										<ImagePlus className='size-3.5' />
									)}
									<span>{t('upload_image')}</span>
								</Button>
								<div
									className='flex items-center gap-2'
									title={t('revornix_ai_mcp_description')}>
									<span>{t('revornix_ai_mcp_status')}</span>
									<Switch
										checked={enableMcp}
										onCheckedChange={setEnableMcp}
										disabled={isSending}
									/>
								</div>
								<Link
									href={'/setting/mcp'}
									className='shrink-0 underline underline-offset-4'>
									{t('revornix_ai_go_to_configure_mcp')}
								</Link>
							</div>
							<Button
								type='button'
								size={'icon'}
								onClick={() => void onSubmit()}
								disabled={
									isSending ||
									(input.trim().length === 0 && imagePaths.length === 0) ||
									isUploadingImages ||
									revornixModel.loading ||
									revornixModel.subscriptionLocked
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
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateAI;
