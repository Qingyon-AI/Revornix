import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import aiApi from '@/api/ai';
import Cookies from 'js-cookie';
import {
	ImagePlus,
	Info,
	Loader2,
	Send,
	SlidersHorizontal,
	X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AIEvent, Message } from '@/types/ai';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
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
import { replacePath } from '@/lib/utils';
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
import AIModelSelect from '@/components/ai/model-select';
import { useEffect, useState } from 'react';

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
		queryKey: [
			'getRevornixSelectedModel',
			selectedModelId,
		],
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
			chat_id: crypto.randomUUID(),
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
	const defaultModelName = default_llm_model?.name
		? default_llm_model.name
		: t('setting_revornix_model_empty');

	const renderDesktopToolbar = () => {
		return (
			<div className='p-2 flex flex-wrap items-center gap-1.5 border-t border-b border-border/60'>
				<div className='inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/60 bg-background px-3 text-xs'>
					<span className='shrink-0 text-muted-foreground'>
						{t('use_model')}
					</span>
					<AIModelSelect
						value={selectedModelId}
						onChange={setSelectedModelId}
						disabled={mutateSendMessage.isPending}
						variant='inline'
						size='sm'
						placeholder={t('setting_model_select')}
					/>
				</div>
				<FormField
					control={form.control}
					name='enable_mcp'
					render={({ field }) => (
						<FormItem className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5'>
							<FormLabel className='flex flex-row items-center gap-1.5 text-xs font-medium text-foreground'>
								{t('revornix_ai_mcp_status')}
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<Info className='size-3.5 text-muted-foreground' />
										</TooltipTrigger>
										<TooltipContent>
											<p>{t('revornix_ai_mcp_description')}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</FormLabel>
							<Switch
								checked={field.value}
								onCheckedChange={(e) => {
									field.onChange(e);
								}}
							/>
							<span className='h-3.5 w-px shrink-0 bg-border' />
							<Link
								href={settingAnchorHrefs.mcpServerManage}
								className='text-xs text-muted-foreground transition-colors hover:text-foreground'>
								{t('revornix_ai_go_to_configure_mcp')}
							</Link>
						</FormItem>
					)}
				/>
			</div>
		);
	};

	const renderMobileToolbar = () => {
		return (
			<div className='mb-2 flex items-center gap-1.5'>
				<div className='min-w-0 flex-1 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-muted-foreground'>
					<div className='truncate'>
						<span>{t('revornix_ai_default_model')}</span>
						<span className='mx-1'>·</span>
						<span className='font-medium text-foreground'>
							{defaultModelName}
						</span>
					</div>
				</div>
				<Drawer>
					<DrawerTrigger asChild>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='size-9 rounded-full border-border/60 bg-background shadow-none'
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
							<div className='rounded-[22px] border border-border/60 bg-background p-4'>
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
								<div className='mt-2 text-xs text-muted-foreground'>
									{t('current_default_model', {
										model: defaultModelName,
									})}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background p-4'>
								<div className='flex items-start justify-between gap-3'>
									<div className='min-w-0'>
										<div className='flex items-center gap-1.5 text-sm font-semibold'>
											{t('revornix_ai_mcp_status')}
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Info className='size-3.5 text-muted-foreground' />
													</TooltipTrigger>
													<TooltipContent>
														<p>{t('revornix_ai_mcp_description')}</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
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
			</div>
		);
	};

	return (
		<Form {...form}>
			<form onSubmit={onSubmitMessageForm}>
				<div className='rounded-[22px] bg-card'>
					<div>
						{isMobile ? renderMobileToolbar() : renderDesktopToolbar()}
						<FormField
							control={form.control}
							name='message'
							render={({ field }) => (
								<FormItem className='flex-1'>
									<div className='relative'>
										{attachments.length > 0 && mainUserInfo?.id ? (
											<div className='flex flex-wrap gap-2 px-2 pb-2 pt-1'>
												{attachments.map((attachment) => (
													<div
														key={attachment.path}
														className='group relative h-14 w-14 overflow-hidden rounded-xl border border-border/60 bg-muted/30 sm:h-16 sm:w-16'>
														<img
															src={replacePath(
																attachment.path,
																mainUserInfo.id,
															)}
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
											className={`bg-transparent! resize-none overflow-y-auto rounded-[14px] border-none bg-transparent px-3 py-2.5 text-sm leading-6 shadow-none outline-none ring-0 focus-visible:ring-0 ${
													isMobile
														? 'min-h-[88px] max-h-[144px] pb-[3.25rem]'
														: 'min-h-[78px] max-h-[140px] pb-[3.25rem] pr-[3.5rem]'
												}`}
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
										<div className='absolute inset-x-2.5 bottom-2.5 flex items-end justify-between gap-2'>
											<div className='flex min-h-9 items-center gap-2'>
												<Button
													type='button'
													size='sm'
													variant='link'
													className='h-9 rounded-full text-[11px] text-muted-foreground'
													onClick={openPicker}
													disabled={
														mutateSendMessage.isPending || isUploadingImages
													}>
													{isUploadingImages ? (
														<Loader2 className='size-3.5 animate-spin' />
													) : (
														<ImagePlus className='size-3.5' />
													)}
													<span>{t('upload_image')}</span>
												</Button>
											</div>
											<div className='flex flex-row items-center gap-2'>
												{!isMobile ? (
													<div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
														<kbd className='pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-full border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground'>
															<span className='text-xs font-bold'>⌘</span>
															<span className='font-bold'>Enter</span>
														</kbd>
														<span>{t('revornix_ai_quickly_send')}</span>
													</div>
												) : null}
												<Button
													type='submit'
													size='icon'
													variant='default'
													disabled={!canSubmit}
													className='size-9 rounded-[14px]'>
													<Send className='size-4' />
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
									</div>
								</FormItem>
							)}
						/>
					</div>
				</div>
			</form>
		</Form>
	);
};

export default MessageSendForm;
