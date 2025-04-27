'use client';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import { searchDocumentVector } from '@/service/document';
import { useRouter } from 'nextjs-toploader/app';
import { Skeleton } from '../ui/skeleton';
import { debounce } from 'lodash-es';
import { useTranslations } from 'next-intl';

const CommandPanel = () => {
	const t = useTranslations();
	const router = useRouter();
	const [inputQuery, setInputQuery] = useState(''); // 绑定输入框
	const [debouncedQuery, setDebouncedQuery] = useState(''); // 仅用于触发搜索 API

	const [showCommandPanel, setShowCommandPanel] = useState(false);
	// 使用 useMemo 避免 debounce 重新创建
	const debouncedSearch = useMemo(
		() =>
			debounce((searchQuery) => {
				setDebouncedQuery(searchQuery); // 只在 debounce 触发时更新
			}, 500), // 500ms 防抖
		[]
	);

	// 监听防抖后的 query 进行请求
	const { data, isFetching, isSuccess } = useQuery({
		queryKey: ['vectorSearch', debouncedQuery],
		queryFn: async () => {
			return searchDocumentVector({ query: debouncedQuery });
		},
		enabled: !!debouncedQuery, // 只有 debouncedQuery 存在时才触发请求
	});

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setShowCommandPanel((show) => !show);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
	}, []);

	// 确保组件卸载时取消防抖
	useEffect(() => {
		return () => debouncedSearch.cancel();
	}, [debouncedSearch]);

	return (
		<>
			<Button
				className='md:hidden'
				variant={'outline'}
				size={'icon'}
				onClick={() => setShowCommandPanel(true)}>
				<Search />
			</Button>
			<Button
				className='hidden md:flex text-muted-foreground'
				variant={'outline'}
				onClick={() => setShowCommandPanel(true)}>
				<span className='mr-2'>{t('search_global')}</span>
				<kbd className='pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
					<span className='text-xs'>⌘</span>K
				</kbd>
			</Button>
			<CommandDialog
				open={showCommandPanel}
				onOpenChange={setShowCommandPanel}
				filter={(value, search, keywords) => {
					return 1;
				}}>
				<CommandInput
					placeholder={t('search_placeholder')}
					value={inputQuery}
					onValueChange={(value) => {
						setInputQuery(value); // 直接更新输入框，不触发请求
						debouncedSearch(value); // 触发防抖逻辑
					}}
				/>
				<CommandList>
					{isFetching && (
						<div className='p-3 flex flex-col gap-3'>
							{[...Array(3)].map((item, index) => {
								return <Skeleton key={index} className='w-full h-12' />;
							})}
						</div>
					)}
					{isSuccess && !isFetching && !data.documents.length && (
						<CommandEmpty>{t('search_empty')}</CommandEmpty>
					)}
					{isSuccess && !isFetching && data && (
						<CommandGroup heading={t('search_recommend')}>
							{data?.documents.map((document) => {
								return (
									<CommandItem
										value={`${document.id}`}
										onSelect={() => {
											router.push(`/document/detail/${document.id}`);
											setShowCommandPanel(false);
										}}
										key={document.id}>
										{document.title}
									</CommandItem>
								);
							})}
						</CommandGroup>
					)}
					<p className='text-muted-foreground text-center p-3 text-xs'>
						{t('search_note')}
					</p>
				</CommandList>
			</CommandDialog>
		</>
	);
};

export default CommandPanel;
