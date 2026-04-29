import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import aiApi from '@/api/ai';
import Cookies from 'js-cookie';
import {
	ImagePlus,
	Loader2,
	Send,
	SlidersHorizontal,
	Wrench,
	X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AIEvent, Message } from '@/types/ai';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { Switch } from '../ui/switch';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { getAiModel } from '@/service/ai';
import Link from 'next/link';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/hybrid-tooltip';
import { useRouter } from 'nextjs-toploader/app';
import { useAiChatStore } from '@/store/ai-chat';
import { createEmptySession } from '@/lib/ai-session';
import { cn, replacePath } from '@/lib/utils';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAIImageAttachments } from '@/hooks/use-ai-image-attachments';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { settingAnchorHrefs } from '@/lib/setting-navigation';
import { formatUploadSize, IMAGE_MAX_UPLOAD_BYTES } from '@/lib/upload';
import AIModelSelect from '@/components/ai/model-select';
import { useEffect, useState } from 'react';
import { generateUUID } from '@/lib/uuid';

const MessageSendForm = () => {
	const router = useRouter();
	const t = useTranslations();
	const isMobile = useIsMobile();
	const queryClient = useQueryClient();
	const formSchema = z.object({
		message: z.string(),
		enable_mcp: z.boolean(),
	});
	const { mainUserInfo } = useUserContext();
	const { revornixModel } = useDefaultResourceAccess();
	const [selectedModelId, setSelectedModelId] = useState<number | null>(
		mainUserInfo?.default_revornix_model_id ?? null,
	);

	const { data: default_llm_model } = useQuery({
		queryKey: ['getRevornixSelectedModel', selectedModelId],
		queryFn: () => {
			if (!selectedModelId) {
				return;
			}
			return getAiModel({ model_id: selectedModelId });
		},
		enabled: !!selectedModelId,
	});

	const addSession = useAiChatStore((s) => s.addSession);
	const setCurrentSessionId = useAiChatStore((s) => s.setCurrentSessionId);
	const updateSessionMeta = useAiChatStore((s) => s.updateSessionMeta);
	const updateChatMessage = useAiChatStore((s) => s.updateChatMessage);
	const currentSession = useAiChatStore((s) => s.currentSession);
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

	const createAIResponseEventHandler = (sessionId: string) => {
		return (event: AIEvent) => {
			const store = useAiChatStore.getState();
			switch (event.type) {
				case 'status':
					store.advanceChatMessageWorkflow(
						sessionId,
						event.chat_id,
						event.payload.phase,
						event.payload.detail,
					);
					break;

				case 'artifact':
					if (event.payload.kind === 'document_sources') {
						if (event.payload.items.length > 0) {
							store.mergeChatMessageDocumentSources(
								sessionId,
								event.chat_id,
								event.payload.items,
							);
						}
						break;
					}

					if (event.payload.kind === 'tool_result') {
						store.advanceChatMessageWorkflow(
							sessionId,
							event.chat_id,
							'tool_result',
							{
								tool: event.payload.tool,
							},
						);
						break;
					}
					break;

				case 'output':
					if (event.payload.kind === 'system_text') {
						const translatedMessage = t.has(event.payload.message as any)
							? t(event.payload.message as any)
							: event.payload.message;
						store.advanceChatMessageWorkflow(
							sessionId,
							event.chat_id,
							'writing',
						);
						store.updateChatMessage(
							sessionId,
							event.chat_id,
							'assistant',
							`${event.payload.paragraph_break ? '\n\n' : ''}${translatedMessage}`,
						);
						break;
					}

					if (event.payload.kind === 'tool_result') {
						if (
							Array.isArray(event.payload.references) &&
							event.payload.references.length > 0
						) {
							store.mergeChatMessageDocumentSources(
								sessionId,
								event.chat_id,
								event.payload.references,
							);
						}
						store.advanceChatMessageWorkflow(
							sessionId,
							event.chat_id,
							'tool_result',
							{
								tool: event.payload.tool,
							},
						);
						break;
					}

					if (event.payload.kind === 'token') {
						store.advanceChatMessageWorkflow(
							sessionId,
							event.chat_id,
							'writing',
						);
						store.updateChatMessage(
							sessionId,
							event.chat_id,
							'assistant',
							event.payload.content,
						);
					}
					break;

				case 'done':
					store.advanceChatMessageWorkflow(sessionId, event.chat_id, 'done');
					void queryClient.invalidateQueries({
						queryKey: ['paySystemUserInfo'],
					});
					void queryClient.invalidateQueries({
						queryKey: ['paySystemUserComputeLedger'],
					});
					break;

				case 'error':
					store.advanceChatMessageWorkflow(
						sessionId,
						event.chat_id,
						'error',
						event.payload,
					);
					break;
			}
		};
	};

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			message: '',
			enable_mcp: false,
		},
	});
	useEffect(() => {
		setSelectedModelId(mainUserInfo?.default_revornix_model_id ?? null);
	}, [mainUserInfo?.default_revornix_model_id]);
	const enableMcp = form.watch('enable_mcp');

	const onSubmitMessageForm = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		const trimmedMessage = values.message.trim();
		if (!trimmedMessage && imagePaths.length === 0) {
			toast.error(t('revornix_ai_message_content_needed'));
			return;
		}
		// 如果用户没有设置默认交互模型则引导用户前往设置
		if (!selectedModelId) {
			toast.error(t('revornix_ai_model_not_set'), {
				action: {
					label: t('revornix_ai_default_model_goto'),
					onClick: () => {
						router.push(settingAnchorHrefs.defaultRevornixAIModel);
					},
				},
			});
			return;
		}
		if (
			selectedModelId === mainUserInfo?.default_revornix_model_id &&
			revornixModel.subscriptionLocked
		) {
			toast.error(t('revornix_ai_access_hint'), {
				action: {
					label: t('revornix_ai_default_model_goto'),
					onClick: () => {
						router.push(settingAnchorHrefs.defaultRevornixAIModel);
					},
				},
			});
			return;
		}

		const newMessage = {
			chat_id: generateUUID(),
			content: trimmedMessage,
			images: imagePaths.length > 0 ? [...imagePaths] : undefined,
			role: 'user',
		};

		let targetSessionId = currentSession()?.id ?? null;
		const baseMessages = currentSession()?.messages ?? [];

		if (!targetSessionId) {
			const newSession = createEmptySession({
				model_name: default_llm_model?.name,
			});
			addSession(newSession);
			setCurrentSessionId(newSession.id);
			targetSessionId = newSession.id;
		} else {
			updateSessionMeta(targetSessionId, {
				model_name: default_llm_model?.name,
			});
		}

		updateChatMessage(
			targetSessionId,
			newMessage.chat_id,
			'user',
			newMessage.content,
			{
				images: newMessage.images,
			},
		);

		const messagesToSend = [...baseMessages, newMessage];

		mutateSendMessage.mutate({
			messages: messagesToSend,
			enable_mcp: values.enable_mcp,
			model_id: selectedModelId,
			onEvent: createAIResponseEventHandler(targetSessionId),
		});
		clearAttachments();
		form.resetField('message');
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const consumeSSE = async (
		response: Response,
		onEvent: (evt: any) => void,
	) => {
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() || '';

			for (let raw of parts) {
				if (!raw.trim()) continue;

				if (raw.startsWith('data:')) {
					raw = raw.slice(5).trim();
				}

				try {
					const evt = JSON.parse(raw);
					onEvent(evt);
				} catch (e) {
					console.error('Invalid SSE chunk', raw);
				}
			}
		}
	};

	const fetchStream = async ({
		messages,
		enable_mcp,
		model_id,
		onEvent,
	}: {
		messages: Message[];
		enable_mcp: boolean;
		model_id: number | null;
		onEvent: (event: AIEvent) => void;
	}) => {
		const headers = new Headers();
		headers.append('Content-Type', 'application/json');
		headers.append('Authorization', `Bearer ${Cookies.get('access_token')}`);
		const response = await fetch(`${aiApi.askAi}`, {
			headers: headers,
			method: 'POST',
			mode: 'cors',
			credentials: 'same-origin',
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
			body: JSON.stringify({
				messages,
				enable_mcp,
				model_id,
			}),
		});
		if (response.status !== 200) {
			let errorMessage;
			try {
				errorMessage = (await response.json()).message;
			} catch (e) {
				errorMessage = 'Unknown error';
			}
			if (
				typeof errorMessage === 'string' &&
				errorMessage.includes(
					'Paid subscription or available compute points required.',
				)
			) {
				errorMessage = t('revornix_ai_access_hint');
			}
			if (
				typeof errorMessage === 'string' &&
				errorMessage.includes('Official LLM quota exceeded')
			) {
				errorMessage = t('revornix_ai_quota_hint');
			}
			throw new Error(`Failed to send message, ${errorMessage}`);
		}
		await consumeSSE(response, onEvent);
	};

	const mutateSendMessage = useMutation({
		mutationKey: ['sendAIMessage'],
		mutationFn: fetchStream,
		onError(error) {
			toast.error(error.message || t('revornix_ai_message_send_failed'));
			console.error(error);
		},
	});
	const messageValue = form.watch('message');
	const canSubmit =
		(messageValue.trim().length > 0 || imagePaths.length > 0) &&
		Boolean(selectedModelId) &&
		!mutateSendMessage.isPending &&
		!isUploadingImages &&
		(selectedModelId !== mainUserInfo?.default_revornix_model_id ||
			(!revornixModel.loading && !revornixModel.subscriptionLocked));

	const renderInlineModelSelect = () => (
		<AIModelSelect
			value={selectedModelId}
			onChange={setSelectedModelId}
			disabled={mutateSendMessage.isPending}
			variant='inline'
			size='sm'
			placeholder={t('setting_model_select')}
		/>
	);

	const renderMcpToggle = () => (
		<FormField
			control={form.control}
			name='enable_mcp'
			render={({ field }) => (
				<FormItem className='inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-muted'>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type='button'
									onClick={() => field.onChange(!field.value)}
									className={cn(
										'inline-flex items-center gap-1.5 text-xs',
										field.value ? 'text-foreground' : 'text-muted-foreground',
									)}>
									<Wrench className='size-3.5' />
									<span>{t('revornix_ai_mcp_status')}</span>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t('revornix_ai_mcp_description')}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<Switch
						checked={field.value}
						onCheckedChange={(e) => field.onChange(e)}
						className='scale-75'
					/>
				</FormItem>
			)}
		/>
	);

	return (
		<Form {...form}>
			<form onSubmit={onSubmitMessageForm} className='pb-3'>
				<div className='rounded-2xl border border-border/60 bg-background shadow-sm focus-within:border-border focus-within:shadow-md transition-shadow'>
					<FormField
						control={form.control}
						name='message'
						render={({ field }) => (
							<FormItem className='gap-0'>
								{attachments.length > 0 && mainUserInfo?.id ? (
									<div className='flex flex-wrap gap-2 px-3 pt-3'>
										{attachments.map((attachment) => (
											<div
												key={attachment.path}
												className='group relative h-14 w-14 overflow-hidden rounded-lg bg-muted/40'>
												<img
													src={replacePath(attachment.path, mainUserInfo.id)}
													alt={attachment.name}
													className='h-full w-full object-cover'
												/>
												<button
													type='button'
													className='absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition hover:bg-background'
													onClick={() => removeAttachment(attachment.path)}
													aria-label={t('delete')}>
													<X className='size-2.5' />
												</button>
											</div>
										))}
									</div>
								) : null}
								<Textarea
									className='resize-none overflow-y-auto border-none bg-transparent! px-3.5 pt-3 pb-1 text-sm leading-6 shadow-none outline-none ring-0 focus-visible:ring-0 min-h-[56px] max-h-[240px]'
									placeholder={t('revornix_ai_message_placeholder')}
									disabled={mutateSendMessage.isPending}
									{...field}
									onKeyDown={(e) => {
										if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
											e.preventDefault();
											form.handleSubmit(
												onFormValidateSuccess,
												onFormValidateError,
											)();
										}
									}}
								/>
								<div className='flex items-center justify-between gap-2 px-2 pb-2'>
									<div className='flex items-center gap-0.5 min-w-0'>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														type='button'
														size='icon'
														variant='ghost'
														className='size-8 rounded-full text-muted-foreground hover:text-foreground'
														onClick={openPicker}
														disabled={
															mutateSendMessage.isPending || isUploadingImages
														}>
														{isUploadingImages ? (
															<Loader2 className='size-4 animate-spin' />
														) : (
															<ImagePlus className='size-4' />
														)}
													</Button>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														{t('upload_image')} ·{' '}
														{t('upload_limit_hint', {
															size: formatUploadSize(IMAGE_MAX_UPLOAD_BYTES),
														})}
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
										{isMobile ? (
											<Drawer>
												<DrawerTrigger asChild>
													<Button
														type='button'
														variant='ghost'
														size='icon'
														className='size-8 rounded-full text-muted-foreground hover:text-foreground'
														aria-label={t('revornix_ai_mobile_compose_settings')}>
														<SlidersHorizontal className='size-4' />
													</Button>
												</DrawerTrigger>
												<DrawerContent className='max-h-[80vh] rounded-t-[28px] border-t border-border/70 bg-card'>
													<DrawerHeader className='border-b border-border/60 px-5 pb-4 pt-5 text-left'>
														<DrawerTitle className='text-lg tracking-tight'>
															{t('revornix_ai_mobile_compose_settings')}
														</DrawerTitle>
														<DrawerDescription className='text-sm leading-6'>
															{t('revornix_ai_mobile_compose_settings_description')}
														</DrawerDescription>
													</DrawerHeader>
													<div className='space-y-3 overflow-auto px-4 py-4'>
														<div className='rounded-2xl bg-muted/40 p-4'>
															<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
																{t('use_model')}
															</div>
															<div className='mt-3'>
																<AIModelSelect
																	value={selectedModelId}
																	onChange={setSelectedModelId}
																	disabled={mutateSendMessage.isPending}
																	variant='panel'
																	className='w-full'
																	placeholder={t('setting_model_select')}
																/>
															</div>
														</div>
														<div className='rounded-2xl bg-muted/40 p-4'>
															<div className='flex items-start justify-between gap-3'>
																<div className='min-w-0'>
																	<div className='flex items-center gap-1.5 text-sm font-semibold'>
																		{t('revornix_ai_mcp_status')}
																	</div>
																	<p className='mt-2 text-sm leading-6 text-muted-foreground'>
																		{t('revornix_ai_mcp_description')}
																	</p>
																</div>
																<Switch
																	checked={enableMcp}
																	onCheckedChange={(checked) => {
																		form.setValue('enable_mcp', checked, {
																			shouldDirty: true,
																		});
																	}}
																/>
															</div>
															<Link
																href={settingAnchorHrefs.mcpServerManage}
																className='mt-3 inline-flex text-sm text-muted-foreground underline underline-offset-4'>
																{t('revornix_ai_go_to_configure_mcp')}
															</Link>
														</div>
													</div>
												</DrawerContent>
											</Drawer>
										) : (
											<>
												<div className='inline-flex h-8 items-center rounded-full px-2 hover:bg-muted'>
													{renderInlineModelSelect()}
												</div>
												{renderMcpToggle()}
											</>
										)}
									</div>
									<div className='flex flex-row items-center gap-2'>
										{!isMobile && (
											<kbd className='pointer-events-none hidden lg:inline-flex h-6 select-none items-center gap-1 rounded-md bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground'>
												<span>⌘</span>
												<span>Enter</span>
											</kbd>
										)}
										<Button
											type='submit'
											size='icon'
											variant='default'
											disabled={!canSubmit}
											className='size-8 rounded-full'>
											<Send className='size-3.5' />
										</Button>
									</div>
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
							</FormItem>
						)}
					/>
				</div>
			</form>
		</Form>
	);
};

export default MessageSendForm;
