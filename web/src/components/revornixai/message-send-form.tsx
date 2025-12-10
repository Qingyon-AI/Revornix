import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { uniqueId } from 'lodash-es';
import { useMutation, useQuery } from '@tanstack/react-query';
import aiApi from '@/api/ai';
import Cookies from 'js-cookie';
import { Info, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Message, ResponseItem } from '@/store/ai-chat';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from '@/components/ui/form';
import { Switch } from '../ui/switch';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAIChatContext } from '@/provider/ai-chat-provider';
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
import { isEmpty } from 'lodash-es';

const MessageSendForm = () => {
	const router = useRouter();
	const t = useTranslations();
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

	const {
		aiStatus,
		setAiStatus,
		tempMessages,
		setTempMessages,
		addSession,
		currentSession,
		setCurrentSessionId,
		sessions,
	} = useAIChatContext();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			message: '',
			enable_mcp: false,
		},
	});

	const addOrUpdateAIMessageToMessages = (responseItem: ResponseItem) => {
		if (!currentSession) {
			return;
		}
		const { event, data, run_id } = responseItem;
		setAiStatus(event);

		if (isEmpty(data) || isEmpty(data?.chunk?.content)) return;

		if (event === 'on_chat_model_stream') {
			const messageItem = tempMessages().find(
				(item) => item.chat_id === run_id
			);
			if (!messageItem) {
				const newMessageItem = {
					chat_id: run_id,
					content: data.chunk.content,
					role: 'assistant',
				};
				setTempMessages([...tempMessages(), newMessageItem]);
			} else {
				if (data.chunk.content && data.chunk.content.length > 0) {
					messageItem.content = messageItem.content + data.chunk.content;
				}
				setTempMessages(
					tempMessages().map((item) =>
						item.chat_id === messageItem.chat_id ? messageItem : item
					)
				);
			}
		}
	};

	const onSubmitMessageForm = async (
		event: React.FormEvent<HTMLFormElement>
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
			chat_id: uniqueId(),
			content: values.message,
			role: 'user',
			finish_reason: 'stop',
		};
		// if there is no current session
		if (!currentSession && !sessions.length) {
			const newSession = {
				id: uniqueId(),
				title: 'New Session',
				messages: [newMessage],
			};
			addSession(newSession);
			setCurrentSessionId(newSession.id);
		}
		// create a new array to update the state
		setTempMessages([...tempMessages(), newMessage]);
		mutateSendMessage.mutate({
			messages: [...tempMessages()],
			enable_mcp: values.enable_mcp,
		});
		form.resetField('message');
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const fetchStream = async ({
		messages,
		enable_mcp,
	}: {
		messages: Message[];
		enable_mcp: boolean;
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
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		if (!reader) return;
		let buffer = ''; // use to store partial data
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true }); // add data to the buffer
			try {
				// resove multiple lines JSON
				const lines = buffer.split('\n\n'); // 后段按照\n分段
				buffer = lines.pop() || ''; // may json fragment, save back
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const messageItem = JSON.parse(line);
						addOrUpdateAIMessageToMessages(messageItem);
					} catch (error) {
						console.error('JSON decede error', line, error);
					}
				}
			} catch (error) {
				console.error(error, decoder.decode(value, { stream: true }));
			}
		}
	};

	const mutateSendMessage = useMutation({
		mutationKey: ['sendAIMessage'],
		mutationFn: fetchStream,
		onError(error) {
			toast.error(t('revornix_ai_message_send_failed'));
			console.error(error);
		},
	});

	return (
		<Form {...form}>
			<form onSubmit={onSubmitMessageForm}>
				<div className='border rounded p-3'>
					<FormField
						control={form.control}
						name='message'
						render={({ field }) => (
							<FormItem className='flex-1'>
								<FormControl>
									<Textarea
										className='dark:bg-transparent shadow-none p-0 border-none outline-none ring-0 focus-visible:ring-0 resize-none'
										placeholder={t('revornix_ai_message_placeholder')}
										{...field}
										onKeyDown={(e) => {
											if (e.metaKey && e.key === 'Enter') {
												e.preventDefault(); // 阻止换行
												form.handleSubmit(
													onFormValidateSuccess,
													onFormValidateError
												)();
											}
										}}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<div className='flex flex-row justify-between items-end gap-5'>
						<div className='flex flex-row items-center gap-5'>
							<FormField
								control={form.control}
								name='enable_mcp'
								render={({ field }) => (
									<FormItem className='flex flex-row items-center'>
										<FormLabel className='flex flex-row gap-1 items-center'>
											{t('revornix_ai_mcp_status')}
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Info className='size-4 text-muted-foreground' />
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
						</div>
						<Button type='submit' size={'icon'} variant={'outline'}>
							<Send />
						</Button>
					</div>
				</div>
				<div className='w-full flex flex-row items-center justify-between mt-2'>
					<p className='text-xs text-muted-foreground'>
						{t('revornix_ai_default_model')}:
						<span className='text-[10px] ml-2 rounded bg-muted/50 px-1.5 py-1 font-mono text-muted-foreground'>
							{default_llm_model?.name
								? default_llm_model.name
								: t('setting_revornix_model_empty')}
						</span>
						<Link
							href={'/setting'}
							className='ml-2 underline underline-offset-4'>
							{t('revornix_ai_default_model_goto')}
						</Link>
					</p>
					<kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
						<span className='text-xs font-bold'>⌘</span>{' '}
						<span className='text-xs font-bold mr-1'>Enter</span>
						<span>{t('revornix_ai_quickly_send')}</span>
					</kbd>
				</div>
			</form>
		</Form>
	);
};

export default MessageSendForm;
