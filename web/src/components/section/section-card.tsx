import { SectionInfo } from '@/generated';
import { formatDistance } from 'date-fns';
import { AlertTriangle, BookTextIcon } from 'lucide-react';
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
import { replacePath } from '@/lib/utils';

const SectionCard = ({ section }: { section: SectionInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const { podcastEngine, imageGenerateEngine } = useDefaultResourceAccess();
	const isOwner = mainUserInfo?.id === section.creator.id;
	const automationWarnings = getSectionAutomationWarnings({
		autoPodcast: section.auto_podcast,
		autoIllustration: section.auto_illustration,
		hasPodcastEngine:
			podcastEngine.configured && !podcastEngine.subscriptionLocked,
		hasImageEngine:
			imageGenerateEngine.configured &&
			!imageGenerateEngine.subscriptionLocked,
	});
	const warningBadges = isOwner
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
	return (
		<div className='group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md'>
			<Link href={`/section/detail/${section.id}`} className='block'>
				<div className='relative h-40 w-full overflow-hidden'>
					{coverSrc ? (
						<img
							src={coverSrc}
							alt='cover'
							className='h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center bg-card/60'>
							<div className='flex items-center justify-center rounded-xl border border-border/60 bg-card/75 p-4'>
								<BookTextIcon size={24} className='text-muted-foreground' />
							</div>
						</div>
					)}
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
					<p className='flex-1 line-clamp-3 text-sm/6 text-muted-foreground'>
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
										className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
										{label.name}
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
				<div className='mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground'>
					<div className='flex min-w-0 items-center gap-2'>
						<Avatar
							className='size-5'
							title={section?.creator.nickname ?? ''}
							onClick={(e) => {
								router.push(`/user/detail/${section.creator.id}`);
								e.preventDefault();
								e.stopPropagation();
							}}>
							<AvatarImage
								src={replacePath(section?.creator.avatar, section.creator.id)}
								alt='avatar'
								className='size-5 object-cover'
							/>
							<AvatarFallback className='size-5 font-semibold'>
								{section?.creator.nickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<span className='line-clamp-1'>
							{formatDistance(new Date(section.create_time), new Date(), {
								addSuffix: true,
								locale: locale === 'zh' ? zhCN : enUS,
							})}
						</span>
					</div>
					<div className='shrink-0 rounded-lg border border-border/50 bg-card/75 px-2.5 py-1'>
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
	);
};

export default SectionCard;
