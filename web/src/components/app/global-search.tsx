'use client';

import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash-es';
import {
	BookOpen,
	FileText,
	LayoutDashboard,
	Search,
	Settings,
	Sparkles,
	Star,
	Inbox,
	Network,
	Flame,
	Compass,
	Library,
	UserCircle,
	X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { Fragment, useEffect, useMemo, useState } from 'react';

import {
	searchDocumentVector,
	searchPublicDocumentVector,
} from '@/service/document';
import {
	searchMineSection,
	searchPublicSectionAnonymous,
} from '@/service/section';
import { searchPublicUsers, searchUser } from '@/service/user';
import { cn } from '@/lib/utils';
import { getPublicSectionHref } from '@/lib/seo';
import HighlightedText, { buildSnippet } from './highlighted-text';

type Scope = 'private' | 'public';
type Mode = 'vector' | 'text';

type NavEntry = {
	href: string;
	label: string;
	keywords: string[];
	icon: React.ComponentType<{ className?: string }>;
};

const safeTranslate = (
	t: ReturnType<typeof useTranslations>,
	key: string,
): string => {
	try {
		return t(key);
	} catch {
		return key;
	}
};

const LeadingIcon = ({
	icon: Icon,
}: {
	icon: React.ComponentType<{ className?: string }>;
}) => (
	<span className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
		<Icon className='size-4' />
	</span>
);

interface ResultRowProps {
	value: string;
	onSelect: () => void;
	leading: React.ReactNode;
	title: string;
	subtitle?: string | null;
	rightSlot?: React.ReactNode;
	query: string;
}

const ResultRow = ({
	value,
	onSelect,
	leading,
	title,
	subtitle,
	rightSlot,
	query,
}: ResultRowProps) => (
	<CommandItem
		value={value}
		onSelect={onSelect}
		className='items-center gap-3 rounded-md'>
		{leading}
		<div className='flex min-w-0 flex-1 flex-col'>
			<HighlightedText
				text={title}
				query={query}
				className='truncate text-sm'
			/>
			{subtitle ? (
				<HighlightedText
					text={subtitle}
					query={query}
					className='truncate text-[11px] text-muted-foreground'
				/>
			) : null}
		</div>
		{rightSlot}
	</CommandItem>
);

const PRIVATE_NAV: NavEntry[] = [
	{ href: '/dashboard', label: 'nav_dashboard', keywords: ['dashboard', 'home', '主页', '仪表盘'], icon: LayoutDashboard },
	{ href: '/document/mine', label: 'nav_my_documents', keywords: ['documents', 'mine', '文档', '我的'], icon: FileText },
	{ href: '/document/star', label: 'nav_starred', keywords: ['star', 'favorite', '收藏', '星标'], icon: Star },
	{ href: '/section/mine', label: 'nav_my_sections', keywords: ['section', 'column', '专栏'], icon: BookOpen },
	{ href: '/section/subscribed', label: 'nav_subscribed_sections', keywords: ['subscribed', 'follow', '订阅'], icon: Library },
	{ href: '/revornix-ai', label: 'nav_revornix_ai', keywords: ['ai', 'chat', 'assistant'], icon: Sparkles },
	{ href: '/graph', label: 'nav_graph', keywords: ['graph', 'knowledge', '图谱'], icon: Network },
	{ href: '/dashboard/hot-search', label: 'nav_hot_search', keywords: ['hot', 'trending', '热搜'], icon: Flame },
	{ href: '/account/notifications', label: 'nav_notifications', keywords: ['notification', 'inbox', '通知'], icon: Inbox },
	{ href: '/setting', label: 'nav_settings', keywords: ['setting', 'preferences', '设置'], icon: Settings },
	{ href: '/account', label: 'nav_account', keywords: ['account', 'profile', '账户'], icon: UserCircle },
];

const PUBLIC_NAV: NavEntry[] = [
	{ href: '/community', label: 'seo_nav_community', keywords: ['community', 'explore', '社区'], icon: Compass },
	{ href: '/dashboard', label: 'seo_nav_dashboard', keywords: ['dashboard', 'app', '工作台'], icon: LayoutDashboard },
];

interface GlobalSearchProps {
	scope?: Scope;
	className?: string;
	triggerVariant?: 'default' | 'compact';
}

const GlobalSearch = ({
	scope = 'private',
	className,
	triggerVariant = 'default',
}: GlobalSearchProps) => {
	const t = useTranslations();
	const router = useRouter();

	const [open, setOpen] = useState(false);
	const [inputQuery, setInputQuery] = useState('');
	const [debouncedQuery, setDebouncedQuery] = useState('');
	const [mode, setMode] = useState<Mode>('text');

	const debouncedSetQuery = useMemo(
		() =>
			debounce((value: string) => {
				setDebouncedQuery(value.trim());
			}, 500),
		[],
	);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => () => debouncedSetQuery.cancel(), [debouncedSetQuery]);

	const query = debouncedQuery;
	const enabled = open && query.length > 0;
	// Vector mode adds latency and is noisy on 1-char queries (everything
	// matches loosely). For ≤1 char, fall back to keyword behaviour silently.
	const effectiveMode: Mode = mode === 'vector' && query.length < 2 ? 'text' : mode;

	const documentsQuery = useQuery({
		queryKey: ['global-search', 'documents', scope, effectiveMode, query],
		queryFn: () => {
			const fn = scope === 'public' ? searchPublicDocumentVector : searchDocumentVector;
			return fn({ query, mode: effectiveMode, limit: 6 });
		},
		enabled,
		staleTime: 30_000,
	});

	const sectionsQuery = useQuery({
		queryKey: ['global-search', 'sections', scope, query],
		queryFn: () => {
			const fn =
				scope === 'public' ? searchPublicSectionAnonymous : searchMineSection;
			return fn({ keyword: query, limit: 6, desc: true });
		},
		enabled,
		staleTime: 30_000,
	});

	const usersQuery = useQuery({
		queryKey: ['global-search', 'users', scope, query],
		queryFn: () => {
			if (scope === 'public') {
				return searchPublicUsers({ keyword: query, limit: 6 });
			}
			return searchUser({
				filter_name: 'nickname',
				filter_value: query,
				limit: 6,
			});
		},
		enabled,
		staleTime: 30_000,
	});

	const navEntries = scope === 'public' ? PUBLIC_NAV : PRIVATE_NAV;
	const navMatches = useMemo(() => {
		if (!query) return [];
		const q = query.toLowerCase();
		return navEntries.filter((entry) => {
			const labelTranslated = safeTranslate(t, entry.label).toLowerCase();
			if (labelTranslated.includes(q)) return true;
			// Keyword match is intentionally prefix-only to avoid noisy hits like
			// "re" matching "explore" via substring search.
			return entry.keywords.some((kw) => kw.toLowerCase().startsWith(q));
		});
	}, [query, navEntries, t]);

	const navigate = (href: string) => {
		setOpen(false);
		router.push(href);
	};

	const documents = documentsQuery.data?.documents ?? [];
	const documentSnippets = documentsQuery.data?.snippets ?? {};
	const sections = sectionsQuery.data?.elements ?? [];
	const users = usersQuery.data?.elements ?? [];

	const isFetching =
		documentsQuery.isFetching || sectionsQuery.isFetching || usersQuery.isFetching;

	const hasAnyResult =
		documents.length > 0 ||
		sections.length > 0 ||
		users.length > 0 ||
		navMatches.length > 0;

	return (
		<>
			{triggerVariant === 'compact' ? (
				<Button
					className={cn('rounded-xl', className)}
					variant='outline'
					size='icon-sm'
					onClick={() => setOpen(true)}
					aria-label={t('search_global')}>
					<Search />
				</Button>
			) : (
				<>
					<Button
						className={cn('rounded-xl md:hidden', className)}
						variant='outline'
						size='icon-sm'
						onClick={() => setOpen(true)}
						aria-label={t('search_global')}>
						<Search />
					</Button>
					<Button
						className={cn(
							'hidden rounded-xl px-3 text-xs text-muted-foreground md:flex',
							className,
						)}
						variant='outline'
						size='sm'
						onClick={() => setOpen(true)}>
						<span className='mr-2'>{t('search_global')}</span>
						<kbd className='pointer-events-none inline-flex h-4.5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100'>
							<span className='text-[10px]'>⌘</span>K
						</kbd>
					</Button>
				</>
			)}

			<CommandDialog
				open={open}
				onOpenChange={setOpen}
				showCloseButton={false}
				className='max-w-2xl'
				commandProps={{
					shouldFilter: false,
				}}>
				<CommandInput
					placeholder={t('search_placeholder')}
					value={inputQuery}
					onValueChange={(value) => {
						setInputQuery(value);
						debouncedSetQuery(value);
					}}
					endAdornment={
						inputQuery ? (
							<button
								type='button'
								aria-label={t('search_clear')}
								onClick={() => {
									setInputQuery('');
									setDebouncedQuery('');
									debouncedSetQuery.cancel();
								}}
								className='flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
								<X className='size-3.5' />
							</button>
						) : null
					}
				/>

				<div className='flex items-center justify-between gap-2 border-b px-3 py-2'>
					<div className='inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5 text-xs'>
						<button
							type='button'
							onClick={() => setMode('vector')}
							className={cn(
								'rounded-full px-3 py-1 font-medium transition-colors',
								mode === 'vector'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground',
							)}>
							{t('search_mode_vector')}
						</button>
						<button
							type='button'
							onClick={() => setMode('text')}
							className={cn(
								'rounded-full px-3 py-1 font-medium transition-colors',
								mode === 'text'
									? 'bg-background text-foreground shadow-sm'
									: 'text-muted-foreground hover:text-foreground',
							)}>
							{t('search_mode_text')}
						</button>
					</div>
					<span className='hidden text-[11px] text-muted-foreground sm:inline'>
						{mode === 'vector'
							? t('search_mode_vector_hint')
							: t('search_mode_text_hint')}
					</span>
				</div>

				<CommandList className='max-h-[60vh] py-1'>
					{!query && (
						<div className='flex flex-col items-center gap-2 px-6 py-10 text-center text-xs text-muted-foreground'>
							<Search className='size-5 opacity-50' />
							<span>{t('search_hint_empty')}</span>
						</div>
					)}

					{query && isFetching && !hasAnyResult && (
						<div className='flex flex-col gap-2 p-3'>
							{[...Array(3)].map((_, index) => (
								<Skeleton key={index} className='h-11 w-full rounded-md' />
							))}
						</div>
					)}

					{query && !isFetching && !hasAnyResult && (
						<CommandEmpty>{t('search_no_results')}</CommandEmpty>
					)}

					{(() => {
						const groups: Array<{
							key: string;
							heading: string;
							rows: React.ReactNode;
						}> = [];

						if (navMatches.length > 0) {
							groups.push({
								key: 'navigation',
								heading: t('search_group_navigation'),
								rows: navMatches.map((entry) => (
									<ResultRow
										key={entry.href}
										value={`nav-${entry.href}`}
										onSelect={() => navigate(entry.href)}
										leading={<LeadingIcon icon={entry.icon} />}
										title={safeTranslate(t, entry.label)}
										query={query}
										rightSlot={
											<span className='ml-auto font-mono text-[10px] text-muted-foreground/70'>
												{entry.href}
											</span>
										}
									/>
								)),
							});
						}

						if (documents.length > 0) {
							groups.push({
								key: 'documents',
								heading: t('search_group_documents'),
								rows: documents.map((doc) => {
									const rawSnippet = documentSnippets[doc.id];
									const subtitle = rawSnippet
										? buildSnippet(rawSnippet, query)
										: doc.description || '';
									const href =
										scope === 'public'
											? `/document/${doc.id}`
											: `/document/detail/${doc.id}`;
									return (
										<ResultRow
											key={`doc-${doc.id}`}
											value={`doc-${doc.id}`}
											onSelect={() => navigate(href)}
											leading={<LeadingIcon icon={FileText} />}
											title={doc.title}
											subtitle={subtitle}
											query={query}
										/>
									);
								}),
							});
						}

						if (sections.length > 0) {
							groups.push({
								key: 'sections',
								heading: t('search_group_sections'),
								rows: sections.map((section) => {
									const href =
										scope === 'public'
											? getPublicSectionHref(section)
											: `/section/detail/${section.id}`;
									return (
										<ResultRow
											key={`section-${section.id}`}
											value={`section-${section.id}`}
											onSelect={() => navigate(href)}
											leading={<LeadingIcon icon={BookOpen} />}
											title={section.title}
											subtitle={section.description}
											query={query}
										/>
									);
								}),
							});
						}

						if (users.length > 0) {
							groups.push({
								key: 'users',
								heading: t('search_group_users'),
								rows: users.map((user) => {
									const href =
										scope === 'public'
											? `/user/${user.id}`
											: `/user/detail/${user.id}`;
									return (
										<ResultRow
											key={`user-${user.id}`}
											value={`user-${user.id}`}
											onSelect={() => navigate(href)}
											leading={
												<Avatar className='size-8 shrink-0'>
													<AvatarImage
														src={user.avatar}
														alt={user.nickname}
														className='object-cover size-8'
													/>
													<AvatarFallback className='size-8 text-xs font-semibold'>
														{user.nickname?.slice(0, 1) || '?'}
													</AvatarFallback>
												</Avatar>
											}
											title={user.nickname}
											subtitle={user.slogan}
											query={query}
										/>
									);
								}),
							});
						}

						return groups.map((group, index) => (
							<Fragment key={group.key}>
								{index > 0 && <CommandSeparator />}
								<CommandGroup heading={group.heading}>
									{group.rows}
								</CommandGroup>
							</Fragment>
						));
					})()}
				</CommandList>

				<div className='flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground'>
					<div className='flex items-center gap-3'>
						<span className='inline-flex items-center gap-1'>
							<kbd className='rounded border bg-background px-1.5 py-px font-mono text-[10px]'>
								↵
							</kbd>
							{t('search_hint_open')}
						</span>
						<span className='hidden items-center gap-1 sm:inline-flex'>
							<kbd className='rounded border bg-background px-1.5 py-px font-mono text-[10px]'>
								esc
							</kbd>
							{t('search_hint_close')}
						</span>
					</div>
					{effectiveMode === 'vector' && documents.length > 0 && (
						<span className='hidden truncate sm:inline'>
							{t('search_note')}
						</span>
					)}
				</div>
			</CommandDialog>
		</>
	);
};

export default GlobalSearch;
