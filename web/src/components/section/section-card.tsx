import type { ReactNode } from 'react';
import { SectionInfo } from '@/generated';
import { formatDistance } from 'date-fns';
import { AlertTriangle, BookTextIcon, Check } from 'lucide-react';
import Link from 'next/link';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { useRouter } from 'nextjs-toploader/app';
import { useLocale, useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { getSectionAutomationWarnings } from '@/lib/section-automation';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import SectionCardPodcast from './section-card-podcast';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { cn, replacePath } from '@/lib/utils';
import { CardViewMode } from '@/lib/card-view-mode';
import SectionVisibilityHint from './section-visibility-hint';
import ImageWithFallback from '../ui/image-with-fallback';
import type { ListSelection } from '@/components/document/document-list-table';

const SectionCard = ({
	section,
	layout = 'grid',
	selection,
}: {
	section: SectionInfo;
	layout?: CardViewMode;
	selection?: ListSelection;
}) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const { podcastEngine, imageGenerateEngine } = useDefaultResourceAccess();
	const isCreator = mainUserInfo?.id === section.creator.id;

	// 选择模式下才叠这一层：整张卡片变成一个可点选的目标（点哪都是切换选中，
	// 不再跳转），左上角给一个圆形的选中指示，选中的卡片整体套一圈高亮。
	// 不用带边框的小方块 —— 那在卡片上就是个「框里套框」。
	const withSelection = (node: ReactNode) => {
		if (!selection?.active) return node;
		const checked = selection.isSelected(section.id);
		return (
			<div className='relative h-full'>
				{node}
				<button
					type='button'
					aria-pressed={checked}
					aria-label={section.title ?? undefined}
					onClick={() => selection.toggle(section.id)}
					className={cn(
						'absolute inset-0 z-10 rounded-2xl transition-colors',
						checked ? 'bg-primary/5' : 'hover:bg-foreground/[0.03]',
					)}
				/>
				<span
					className={cn(
						'pointer-events-none absolute left-3 top-3 z-20 flex size-6 items-center justify-center rounded-full border shadow-sm transition-colors',
						checked
							? 'border-primary bg-primary text-primary-foreground'
							: 'border-border/70 bg-background/85 backdrop-blur-sm',
					)}>
					{checked ? <Check className='size-3.5' strokeWidth={3} /> : null}
				</span>
				{checked ? (
					<span className='pointer-events-none absolute inset-0 z-20 rounded-2xl ring-2 ring-primary' />
				) : null}
			</div>
		);
	};

	const automationWarnings = getSectionAutomationWarnings({
		autoPodcast: section.auto_podcast,
		autoIllustration: section.auto_illustration,
		hasPodcastEngine:
			podcastEngine.configured && !podcastEngine.subscriptionLocked,
		hasImageEngine:
			imageGenerateEngine.configured &&
			!imageGenerateEngine.subscriptionLocked,
	});
	const warningBadges = isCreator
		? [
				automationWarnings.missingPodcastEngine
					? t('section_card_warning_missing_podcast_engine')
					: null,
				automationWarnings.missingIllustrationEngine
					? t('section_card_warning_missing_illustration_engine')
					: null,
			].filter(Boolean)
		: [];
	const coverSrc = getSectionCoverSrc(section);
	const relativeTime = formatDistance(new Date(section.create_time), new Date(), {
		addSuffix: true,
		locale: locale === 'zh' ? zhCN : enUS,
	});

	const cover = coverSrc ? (
		<ImageWithFallback
			src={coverSrc}
			alt='cover'
			className='h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105'
			fallbackSvgClassName='max-w-[120px] p-4'
		/>
	) : (
		<div className='flex h-full w-full items-center justify-center bg-card/60'>
			<div className='flex items-center justify-center rounded-xl border border-border/60 bg-card/75 p-4'>
				<BookTextIcon size={24} className='text-muted-foreground' />
			</div>
		</div>
	);

	if (layout === 'list') {
		return withSelection(
			<div className='group flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-colors hover:border-border hover:bg-card/90'>
				<div className='flex w-full flex-col gap-3 p-3 sm:grid sm:grid-cols-[96px,minmax(0,1.8fr),minmax(220px,1fr),auto] sm:items-center sm:gap-4 sm:p-4'>
					<Link
						href={`/section/detail/${section.id}`}
						className='relative hidden h-16 overflow-hidden rounded-xl border border-border/60 bg-card/60 sm:block'>
						{cover}
					</Link>
					<Link
						href={`/section/detail/${section.id}`}
						className='min-w-0'>
						<div className='flex items-center gap-2'>
							<h1 className='line-clamp-1 text-sm font-semibold leading-6 sm:text-[15px]'>
								{section.title ? section.title : t('section_title_empty')}
							</h1>
							{section.is_day_section ? (
								<div className='inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
									{t('section_day_badge')}
								</div>
							) : null}
						</div>
						<p className='mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-5 text-muted-foreground sm:text-sm'>
							{section.description
								? section.description
								: t('section_description_empty')}
						</p>
						<div className='mt-2 flex flex-wrap gap-1.5'>
							{section.labels?.slice(0, 3).map((label) => {
								return (
								<div
									key={label.id}
									className='w-fit rounded-full border border-border/50 bg-card/75 px-2.5 py-1 text-[11px] text-muted-foreground'>
									# {label.name}
								</div>
							);
						})}
							{warningBadges.slice(0, 1).map((warning) => (
								<div
									key={warning}
									className='inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
									<AlertTriangle className='size-3' />
									<span className='line-clamp-1'>{warning}</span>
								</div>
							))}
						</div>
					</Link>
					<div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr),auto] sm:gap-x-3 sm:gap-y-1 sm:text-xs'>
						<Link
							href={`/user/detail/${section.creator.id}`}
							className='flex min-w-0 items-center gap-2 rounded-full transition-colors hover:text-foreground'>
							<Avatar className='size-5' title={section?.creator.nickname ?? ''}>
								<AvatarImage
									src={replacePath(section?.creator.avatar, section.creator.id)}
									alt='avatar'
									className='size-5 object-cover'
								/>
								<AvatarFallback className='size-5 font-semibold'>
									{section?.creator.nickname.slice(0, 1) ?? '?'}
								</AvatarFallback>
							</Avatar>
							<span className='line-clamp-1'>{relativeTime}</span>
						</Link>
						<div className='justify-self-start rounded-full border border-border/50 bg-card/75 px-2.5 py-1 sm:justify-self-end'>
							{t('section_card_documents_count', {
								section_documents_count: section.documents_count
									? section.documents_count
									: 0,
							})}
							{' · '}
							{t('section_card_subscribers_count', {
								section_subscribers_count: section.subscribers_count
									? section.subscribers_count
									: 0,
							})}
						</div>
						<div className='sm:col-span-2'>
							<SectionCardPodcast section={section} />
						</div>
					</div>
					<div className='hidden justify-end sm:flex'>
						<div className='flex flex-wrap justify-end gap-2'>
							<SectionVisibilityHint
								isPublished={Boolean(section.publish_uuid)}
							/>
							{warningBadges.length > 1 ? (
								<div className='rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
									+{warningBadges.length - 1}
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return withSelection(
		<div className='group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md'>
			<Link href={`/section/detail/${section.id}`} className='block'>
				<div className='relative h-40 w-full overflow-hidden'>
					{cover}
				</div>
			</Link>
			<div className='flex flex-1 flex-col gap-3 p-4'>
				<Link
					href={`/section/detail/${section.id}`}
					className='flex flex-1 flex-col gap-3'>
					<h1 className='line-clamp-2 text-base font-semibold leading-6'>
						{section.title ? section.title : t('section_title_empty')}
					</h1>
					{section.is_day_section ? (
						<div className='flex flex-wrap gap-2'>
							<div className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
								{t('section_day_badge')}
							</div>
						</div>
					) : null}
					<p className='flex-1 overflow-hidden text-sm leading-6 text-muted-foreground max-h-[4.5rem]'>
						{section.description
							? section.description
							: t('section_description_empty')}
					</p>
					{section.labels && section.labels.length > 0 && (
						<div className='flex flex-wrap gap-2'>
							{section.labels.map((label) => {
								return (
								<div
									key={label.id}
									className='w-fit rounded-full border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
									# {label.name}
								</div>
							);
						})}
						</div>
					)}
					{warningBadges.length > 0 ? (
						<div className='flex flex-wrap gap-2'>
							{warningBadges.map((warning) => (
								<div
									key={warning}
									className='inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300'>
									<AlertTriangle className='size-3.5' />
									<span>{warning}</span>
								</div>
							))}
						</div>
					) : null}
				</Link>
				<SectionCardPodcast section={section} />
				<div className='mt-auto flex flex-col gap-2 text-xs text-muted-foreground'>
					<Link
						href={`/user/detail/${section.creator.id}`}
						className='flex min-w-0 items-center gap-2 rounded-xl transition-colors hover:text-foreground'>
						<Avatar className='size-5' title={section?.creator.nickname ?? ''}>
							<AvatarImage
								src={replacePath(section?.creator.avatar, section.creator.id)}
								alt='avatar'
								className='size-5 object-cover'
							/>
							<AvatarFallback className='size-5 font-semibold'>
								{section?.creator.nickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0 flex-1'>
							<div className='truncate text-foreground'>
								{section?.creator.nickname ?? '?'}
							</div>
							<div className='truncate text-[11px] text-muted-foreground'>
								{relativeTime}
							</div>
						</div>
					</Link>
					<div className='flex flex-wrap gap-2'>
						<SectionVisibilityHint
							isPublished={Boolean(section.publish_uuid)}
						/>
						<div className='rounded-full border border-border/50 bg-card/75 px-2.5 py-1'>
							{t('section_card_documents_count', {
								section_documents_count: section.documents_count
									? section.documents_count
									: 0,
							})}
							{' · '}
							{t('section_card_subscribers_count', {
								section_subscribers_count: section.subscribers_count
									? section.subscribers_count
									: 0,
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SectionCard;
