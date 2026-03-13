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

const MessageSendForm = () => {
	const router = useRouter();
	const t = useTranslations();
	const isMobile = useIsMobile();
	const formSchema = z.object({
		message: z.string().min(1, t('revornix_ai_message_content_needed')),
		enable_mcp: z.boolean(),
	});
	const { mainUserInfo } = useUserContext();

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

				case 'output':
					if (event.payload.kind === 'tool_result') {
						if (
							Array.isArray(event.payload.references) &&
							event.payload.references.length > 0
						) {
							store.mergeChatMessageDocumentReferences(
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
					store.advanceChatMessageWorkflow(sessionId, event.chat_id, 'error', event.payload);
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

	const renderDesktopToolbar = () => {
		return (
			<div className='mb-2 flex flex-wrap items-center gap-1.5'>
				<div className='rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground'>
					{t('revornix_ai_default_model')}:
					<span className='ml-2 font-medium text-foreground'>
						{default_llm_model?.name
							? default_llm_model.name
							: t('setting_revornix_model_empty')}
					</span>
				</div>
				<Link
					href={'/setting'}
					className='text-xs text-muted-foreground underline underline-offset-4'>
					{t('revornix_ai_default_model_goto')}
				</Link>
				<FormField
					control={form.control}
					name='enable_mcp'
					render={({ field }) => (
						<FormItem className='ml-auto flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/72 px-2.5 py-1'>
							<FormLabel className='flex flex-row items-center gap-1 text-xs font-medium'>
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
							<Link
								href={'/setting/mcp'}
								className='text-xs text-muted-foreground underline underline-offset-4'>
								{t('revornix_ai_go_to_configure_mcp')}
							</Link>
						</FormItem>
					)}
				/>
				<kbd className='pointer-events-none inline-flex h-6.5 select-none items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 font-mono text-[10px] font-medium text-muted-foreground'>
					<span className='text-xs font-bold'>⌘</span>
					<span className='mr-1 text-xs font-bold'>Enter</span>
					<span>{t('revornix_ai_quickly_send')}</span>
				</kbd>
			</div>
		);
	};

	const renderMobileToolbar = () => {
		return (
			<div className='mb-2 flex items-center gap-2'>
				<div className='min-w-0 flex-1 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground'>
					<span className='block truncate font-medium text-foreground'>
						{default_llm_model?.name
							? default_llm_model.name
							: t('setting_revornix_model_empty')}
					</span>
				</div>
				<Drawer>
					<DrawerTrigger asChild>
						<Button
							type='button'
							variant='outline'
							size='icon'
							className='size-10 rounded-2xl border-border/60 bg-background/70 shadow-none'
							aria-label={t('revornix_ai_mobile_compose_settings')}>
							<SlidersHorizontal className='size-4.5' />
						</Button>
					</DrawerTrigger>
					<DrawerContent className='max-h-[80vh] rounded-t-[28px] border-t border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.14),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]'>
						<DrawerHeader className='border-b border-border/60 px-5 pb-4 pt-5 text-left'>
							<DrawerTitle className='text-lg tracking-tight'>
								{t('revornix_ai_mobile_compose_settings')}
							</DrawerTitle>
							<DrawerDescription className='text-sm leading-6'>
								{t('revornix_ai_mobile_compose_settings_description')}
							</DrawerDescription>
						</DrawerHeader>
						<div className='space-y-3 overflow-auto px-4 py-4'>
							<div className='rounded-[22px] border border-border/60 bg-background/72 p-4'>
								<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
									{t('revornix_ai_default_model')}
								</div>
								<div className='mt-2 text-base font-semibold'>
									{default_llm_model?.name
										? default_llm_model.name
										: t('setting_revornix_model_empty')}
								</div>
								<Link
									href={'/setting'}
									className='mt-3 inline-flex text-sm text-muted-foreground underline underline-offset-4'>
									{t('revornix_ai_default_model_goto')}
								</Link>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/72 p-4'>
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
				<div className='relative overflow-hidden rounded-[20px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.08),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-2 shadow-[0_16px_34px_-34px_rgba(15,23,42,0.38)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.12),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.8))]'>
					{isMobile ? renderMobileToolbar() : renderDesktopToolbar()}
					{isMobile ? (
						<FormField
							control={form.control}
							name='message'
							render={({ field }) => (
								<FormItem className='flex-1'>
									<div className='relative'>
										<Textarea
											className='min-h-[104px] max-h-[168px] resize-none overflow-y-auto rounded-[18px] border border-border/60 bg-background/72 px-3.5 py-3 pb-16 text-[15px] leading-6 shadow-none outline-none ring-0 focus-visible:ring-0'
											placeholder={t('revornix_ai_message_placeholder')}
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
										<Button
											type='submit'
											size={'icon'}
											className='absolute bottom-3 right-3 size-10 rounded-2xl bg-foreground text-background shadow-[0_14px_28px_-24px_rgba(15,23,42,0.65)] hover:bg-foreground/90'>
											<Send />
										</Button>
									</div>
								</FormItem>
							)}
						/>
					) : (
						<div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'>
							<FormField
								control={form.control}
								name='message'
								render={({ field }) => (
									<FormItem className='flex-1'>
										<Textarea
											className='min-h-[72px] max-h-[140px] resize-none overflow-y-auto rounded-[16px] border border-border/60 bg-background/72 px-3.5 py-2.5 text-[15px] leading-6 shadow-none outline-none ring-0 focus-visible:ring-0 sm:min-h-[80px] sm:max-h-[160px]'
											placeholder={t('revornix_ai_message_placeholder')}
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
									</FormItem>
								)}
							/>
							<Button
								type='submit'
								size={'icon'}
								className='size-10 rounded-2xl bg-foreground text-background shadow-[0_14px_28px_-24px_rgba(15,23,42,0.65)] hover:bg-foreground/90 sm:mb-0.5'>
								<Send />
							</Button>
						</div>
					)}
				</div>
			</form>
		</Form>
	);
};

export default MessageSendForm;
