import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { uniqueId } from 'lodash-es';
import { useMutation } from '@tanstack/react-query';
import aiApi from '@/api/ai';
import Cookies from 'js-cookie';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Message } from '@/store/ai-chat';
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

const formSchema = z.object({
	message: z.string().min(1, '消息内容不得为空'),
	deepSearch: z.boolean(),
	searchWeb: z.boolean(),
});

const MessageSendForm = () => {
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
			deepSearch: true,
			searchWeb: true,
		},
	});

	const addOrUpdateAIMessageToMessages = (messageResponse: Message) => {
		if (!currentSession) {
			return;
		}
		const messageItem = tempMessages().find(
			(item) => item.chat_id === messageResponse.chat_id
		);
		if (!messageItem) {
			const newMessageItem = {
				chat_id: messageResponse.chat_id,
				content: messageResponse.content,
				role: messageResponse.role,
				quote: messageResponse.quote,
				reasoning_content: messageResponse.reasoning_content,
				finish_reason: messageResponse.finish_reason,
				references: messageResponse.references,
			};
			setTempMessages([...tempMessages(), newMessageItem]);
		} else {
			if (
				messageResponse.content &&
				messageResponse.content.length > 0 &&
				!messageResponse.reasoning_content?.length
			) {
				aiStatus !== '回答中' && setAiStatus('回答中');
				messageItem.content = messageItem.content + messageResponse.content;
			}
			if (
				messageResponse.reasoning_content &&
				messageResponse.reasoning_content.length > 0 &&
				!messageResponse.content.length
			) {
				aiStatus !== '深度思考中' && setAiStatus('深度思考中');
				messageItem.reasoning_content =
					messageItem.reasoning_content + messageResponse.reasoning_content;
			}
			if (messageResponse.finish_reason === 'stop') {
				setAiStatus('');
				messageItem.quote = messageResponse.quote;
			}
			messageItem.finish_reason = messageResponse.finish_reason;
			setTempMessages(
				tempMessages().map((item) =>
					item.chat_id === messageItem.chat_id ? messageItem : item
				)
			);
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
		const newMessage = {
			chat_id: uniqueId(),
			content: values.message,
			role: 'user',
			finish_reason: 'stop',
		};
		// 如果当前没有会话
		if (!currentSession && !sessions.length) {
			const newSession = {
				id: uniqueId(),
				title: 'New Session',
				messages: [newMessage],
			};
			addSession(newSession);
			setCurrentSessionId(newSession.id);
		}
		// 创建一个新数组来更新状态
		setTempMessages([...tempMessages(), newMessage]);
		mutateSendMessage.mutate({
			messages: [newMessage],
			deep_search: values.deepSearch,
			search_web: values.searchWeb,
		});
		form.resetField('message');
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error('表单校验失败');
	};

	const fetchStream = async ({
		messages,
		search_web,
		deep_search,
	}: {
		messages: Message[];
		search_web: boolean;
		deep_search: boolean;
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
				search_web,
				deep_search,
			}),
		});
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();
		if (!reader) return;
		let buffer = ''; // 用于存储流式数据
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true }); // 追加数据
			try {
				// 处理多行 JSON 解析
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // 可能是 JSON 片段，存回 buffer
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const messageItem = JSON.parse(line);
						addOrUpdateAIMessageToMessages(messageItem);
					} catch (error) {
						console.error('JSON 解析失败', line, error);
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
			toast.error('发送消息失败');
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
										className='shadow-none p-0 border-none outline-none ring-0 focus-visible:ring-0 resize-none'
										placeholder='输入想要提问的问题'
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
								name='deepSearch'
								render={({ field }) => (
									<FormItem className='flex flex-row items-center'>
										<FormLabel className='flex flex-row gap-1 items-center'>
											深度思考
										</FormLabel>
										<Switch
											checked={field.value}
											onCheckedChange={(e) => {
												field.onChange(e);
											}}
										/>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='searchWeb'
								render={({ field }) => (
									<FormItem className='flex flex-row items-center'>
										<FormLabel className='flex flex-row gap-1 items-center'>
											网络搜索
										</FormLabel>
										<Switch
											checked={field.value}
											onCheckedChange={(e) => {
												field.onChange(e);
											}}
										/>
									</FormItem>
								)}
							/>
						</div>
						<Button type='submit' size={'icon'} variant={'outline'}>
							<Send />
						</Button>
					</div>
				</div>
				<div className='w-full flex flex-row items-center justify-end mt-2'>
					<kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
						<span className='text-xs'>⌘</span>Enter
					</kbd>
				</div>
			</form>
		</Form>
	);
};

export default MessageSendForm;
