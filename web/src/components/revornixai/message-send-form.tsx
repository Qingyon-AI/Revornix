import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import aiApi from '@/api/ai';
import Cookies from 'js-cookie';
import { Info, Send, SlidersHorizontal } from 'lucide-react';
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
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';

const MessageSendForm = () => {
	const router = useRouter();
	const t = useTranslations();
	const isMobile = useIsMobile();
	const formSchema = z.object({
		message: z.string().min(1, t('revornix_ai_message_content_needed')),
		enable_mcp: z.boolean(),
	});
	const { mainUserInfo } = useUserContext();
	const { revornixModel } = useDefaultResourceAccess();

	const { data: default_llm_model } = useQuery({
		queryKey: [
			'getRevornixDefaultModel',
			mainUserInfo?.default_revornix_model_id,
		],
		queryFn: () => {
			if (!mainUserInfo?.default_revornix_model_id) {
				return;
			}
			return getAiModel({ model_id: mainUserInfo?.default_revornix_model_id });
		},
		enabled: !!mainUserInfo?.default_revornix_model_id,
	});

	const addSession = useAiChatStore((s) => s.addSession);
	const setCurrentSessionId = useAiChatStore((s) => s.setCurrentSessionId);
	const updateSessionMeta = useAiChatStore((s) => s.updateSessionMeta);
	const updateChatMessage = useAiChatStore((s) => s.updateChatMessage);
	const currentSession = useAiChatStore((s) => s.currentSession);

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

					store.advanceChatMessageWorkflow(sessionId, event.chat_id, 'writing');
					store.updateChatMessage(
						sessionId,
						event.chat_id,
						'assistant',
						event.payload.content,
					);
					break;

				case 'done':
					store.advanceChatMessageWorkflow(sessionId, event.chat_id, 'done');
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
		// 如果用户没有设置默认交互模型则引导用户前往设置
		if (!mainUserInfo?.default_revornix_model_id) {
			toast.error(t('revornix_ai_model_not_set'), {
				action: {
					label: t('revornix_ai_default_model_goto'),
					onClick: () => {
						router.push('/setting');
					},
				},
			});
			return;
		}
		if (revornixModel.subscriptionLocked) {
			toast.error(t('default_resource_subscription_locked'), {
				action: {
					label: t('revornix_ai_default_model_goto'),
					onClick: () => {
						router.push('/setting');
					},
				},
			});
			return;
		}

		const newMessage = {
			chat_id: crypto.randomUUID(),
			content: values.message,
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
		);

		const messagesToSend = [...baseMessages, newMessage];

		mutateSendMessage.mutate({
			messages: messagesToSend,
			enable_mcp: values.enable_mcp,
			onEvent: createAIResponseEventHandler(targetSessionId),
		});
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
		onEvent,
	}: {
		messages: Message[];
		enable_mcp: boolean;
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
			}),
		});
		if (response.status !== 200) {
			let errorMessage;
			try {
				errorMessage = (await response.json()).message;
			} catch (e) {
				errorMessage = 'Unknown error';
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
		messageValue.trim().length > 0 &&
		!mutateSendMessage.isPending &&
		!revornixModel.loading &&
		!revornixModel.subscriptionLocked;
	const defaultModelName = default_llm_model?.name
		? default_llm_model.name
		: t('setting_revornix_model_empty');

	const renderDesktopToolbar = () => {
		return (
			<div className='mb-2 flex flex-wrap items-center gap-1.5'>
				<div className='inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs'>
					<span className='shrink-0 text-muted-foreground'>
						{t('revornix_ai_default_model')}
					</span>
					<span className='truncate font-medium text-foreground'>
						{defaultModelName}
					</span>
					<span className='h-3.5 w-px shrink-0 bg-border' />
					<Link
						href={'/setting'}
						className='shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground'>
						{t('revornix_ai_default_model_goto')}
					</Link>
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
								href={'/setting/mcp'}
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
									{t('revornix_ai_default_model')}
								</div>
								<div className='mt-2 text-base font-semibold'>
									{defaultModelName}
								</div>
								<Link
									href={'/setting'}
									className='mt-3 inline-flex text-sm text-muted-foreground underline underline-offset-4'>
									{t('revornix_ai_default_model_goto')}
								</Link>
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
									href={'/setting/mcp'}
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
				<div className='rounded-[22px] border border-border/60 bg-card p-2 shadow-sm'>
					<div>
						{isMobile ? renderMobileToolbar() : renderDesktopToolbar()}
						<FormField
							control={form.control}
							name='message'
							render={({ field }) => (
								<FormItem className='flex-1'>
									<div className='relative rounded-[20px] border border-border/70 bg-background p-1.5'>
										<Textarea
											className={`resize-none overflow-y-auto rounded-[14px] border-none bg-transparent px-3 py-2.5 text-sm leading-6 shadow-none outline-none ring-0 focus-visible:ring-0 ${
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
											<div className='flex min-h-9 items-center'>
												{!isMobile ? (
													<div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
														<kbd className='pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-full border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground'>
															<span className='text-xs font-bold'>⌘</span>
															<span className='font-bold'>Enter</span>
														</kbd>
														<span>{t('revornix_ai_quickly_send')}</span>
													</div>
												) : null}
											</div>
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
