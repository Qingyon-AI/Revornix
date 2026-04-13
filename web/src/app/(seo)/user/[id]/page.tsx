import JsonLd from '@/components/seo/json-ld';
import SeoUserFollowButton from '@/components/seo/seo-user-follow-button';
import SeoUserSectionsBrowser from '@/components/seo/seo-user-sections-browser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/enums/user';
import {
	fetchPublicUserDetail,
	fetchPublicUserSections,
	isSeoNotFoundError,
} from '@/lib/seo';
import { cn, replacePath } from '@/lib/utils';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BookMarked, Shield, Users } from 'lucide-react';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
} from '@/lib/seo-metadata';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getSingleValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
};

const getStartValue = (value: string | string[] | undefined) => {
	const rawValue = getSingleValue(value);
	if (!rawValue) {
		return undefined;
	}

	const parsedValue = Number(rawValue);
	return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const getRoleMeta = (
	role: number,
	t: Awaited<ReturnType<typeof getTranslations>>,
) => {
	switch (role) {
		case UserRole.ROOT:
			return {
				label: t('user_detail_role_root'),
				className:
					'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
			};
		case UserRole.ADMIN:
			return {
				label: t('user_detail_role_admin'),
				className:
					'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
			};
		default:
			return {
				label: t('user_detail_role_user'),
				className: 'border-border/60 bg-background/75 text-muted-foreground',
			};
	}
};

const buildUserMetaDescription = (
	user: Awaited<ReturnType<typeof fetchPublicUserDetail>>,
	totalSections?: number,
) => {
	const slogan = user.slogan?.trim();
	if (slogan) {
		return slogan;
	}

	return [
		`${user.nickname} public creator profile`,
		typeof totalSections === 'number'
			? `${totalSections} public sections`
			: null,
		'Revornix community',
	]
		.filter(Boolean)
		.join(' • ');
};

export async function generateMetadata(props: {
	params: Params;
	searchParams: SearchParams;
}): Promise<Metadata> {
	const [{ id }, searchParams, t] = await Promise.all([
		props.params,
		props.searchParams,
		getTranslations(),
	]);
	const keyword = getSingleValue(searchParams.q)?.trim();
	const start = getStartValue(searchParams.start);
	const noIndex = Boolean(keyword) || start !== undefined;

	try {
		const user = await fetchPublicUserDetail({ user_id: Number(id) });
		const coverSrc =
			user.cover && user.cover.length > 0
				? replacePath(user.cover, user.id)
				: undefined;
		const avatarSrc =
			user.avatar && user.avatar.length > 0
				? replacePath(user.avatar, user.id)
				: undefined;
		const metaDescription = buildUserMetaDescription(user);

		return buildMetadata({
			title: formatMetaTitle(user.nickname, t('seo_user_title_suffix')),
			description: metaDescription,
			path: `/user/${user.id}`,
			noIndex,
			images: [coverSrc ?? avatarSrc],
			socialCard: {
				eyebrow: t('seo_user_title_suffix'),
				theme: 'user',
			},
			keywords: [user.nickname, 'creator', 'public profile'],
		});
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			return buildMetadata({
				title: formatMetaTitle(t('seo_user_title_suffix')),
				description: t('user_detail_public_profile_description'),
				path: `/user/${id}`,
				noIndex: true,
				socialCard: {
					eyebrow: t('seo_user_title_suffix'),
					theme: 'user',
				},
				keywords: ['creator', 'public profile'],
			});
		}
		throw error;
	}
}

const SeoUserDetailPage = async (props: {
	params: Params;
	searchParams: SearchParams;
}) => {
	const [{ id }, searchParams, locale, t] = await Promise.all([
		props.params,
		props.searchParams,
		getLocale(),
		getTranslations(),
	]);

	const userId = Number(id);
	if (Number.isNaN(userId)) {
		notFound();
	}

	const keyword = getSingleValue(searchParams.q)?.trim() || '';
	const start = getStartValue(searchParams.start);

	try {
		const [user, sectionsResponse] = await Promise.all([
			fetchPublicUserDetail({ user_id: userId }),
			fetchPublicUserSections({
				user_id: userId,
				keyword: keyword || undefined,
				start,
				limit: 10,
				desc: true,
			}),
		]);
		const sections = sectionsResponse.elements ?? [];
		const totalSections = sectionsResponse.total ?? 0;
		const roleMeta = getRoleMeta(user.role, t);
		const avatarSrc =
			user.avatar && user.avatar.length > 0
				? replacePath(user.avatar, user.id)
				: undefined;
		const coverSrc =
			user.cover && user.cover.length > 0
				? replacePath(user.cover, user.id)
				: undefined;
		const profileSchema = {
			'@context': 'https://schema.org',
			'@type': 'ProfilePage',
			name: `${user.nickname} | ${t('seo_user_title_suffix')}`,
			description: buildUserMetaDescription(user, totalSections),
			url: createAbsoluteUrl(`/user/${user.id}`),
			inLanguage: locale,
			mainEntity: {
				'@type': 'Person',
				name: user.nickname,
				description: buildUserMetaDescription(user, totalSections),
				image: coverSrc ?? avatarSrc,
				url: createAbsoluteUrl(`/user/${user.id}`),
			},
		};
		const breadcrumbSchema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: t('seo_community_title'),
					item: createAbsoluteUrl('/community'),
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: user.nickname,
					item: createAbsoluteUrl(`/user/${user.id}`),
				},
			],
		};
		const structuredData: Array<Record<string, unknown>> = [
			profileSchema,
			breadcrumbSchema,
		];

		return (
			<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-3 pb-10 pt-0 lg:px-0'>
				<JsonLd data={structuredData} />
				<div className='relative w-full overflow-hidden border-b border-border/50 bg-background/35'>
					<div className='relative h-52 w-full overflow-hidden xl:h-62'>
						<div className='mx-auto h-full w-full max-w-[1480px]'>
							{coverSrc ? (
								<img
									src={coverSrc}
									alt={`${user.nickname} cover`}
									className='h-full w-full object-cover'
								/>
							) : null}
						</div>
						<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_24%),radial-gradient(circle_at_84%_18%,rgba(56,189,248,0.18),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.04),rgba(15,23,42,0.72))]' />
					</div>
					<div className='mx-auto w-full max-w-[1160px] px-4 pb-5 sm:px-6 lg:px-8'>
						<div className='-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-start sm:justify-between lg:-mt-16'>
							<div className='flex min-w-0 items-start gap-4'>
								<Avatar className='size-24 border-4 border-background shadow-lg sm:size-28 lg:size-32'>
									<AvatarImage
										className='object-cover'
										src={avatarSrc}
										alt='user avatar'
									/>
									<AvatarFallback className='text-3xl font-semibold'>
										{user.nickname?.slice(0, 1) ?? '?'}
									</AvatarFallback>
								</Avatar>
								<div className='min-w-0 space-y-3 pt-16 lg:pt-20'>
									<div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
										<Badge
											variant='outline'
											className={cn(
												'rounded-full px-3 py-1 text-xs font-medium',
												roleMeta.className,
											)}>
											{roleMeta.label}
										</Badge>
										<div className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-3 py-1.5 text-xs sm:text-sm'>
											<Users className='size-3.5' />
											<span>
												{t('user_fans')} {user.fans ?? 0}
											</span>
										</div>
										<div className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-3 py-1.5 text-xs sm:text-sm'>
											<BookMarked className='size-3.5' />
											<span>
												{t('user_detail_section_total')} {totalSections}
											</span>
										</div>
									</div>
									<div className='space-y-2'>
										<h1 className='break-words text-3xl font-semibold tracking-tight sm:text-4xl'>
											{user.nickname}
										</h1>
										<p className='max-w-[760px] text-sm leading-7 text-muted-foreground sm:text-base'>
											{user.slogan ? user.slogan : t('user_slogan_empty')}
										</p>
									</div>
								</div>
							</div>
							<div className='flex shrink-0 items-center gap-3 z-10'>
								<SeoUserFollowButton
									userId={user.id}
									initialIsFollowed={user.is_followed}
									className='shrink-0'
								/>
							</div>
						</div>
					</div>
				</div>

				<div className='mx-auto w-full max-w-[1160px] space-y-5'>
					<div className='grid gap-3 sm:grid-cols-3'>
						<div className='rounded-[24px] border border-border/60 bg-background/35 px-4 py-4'>
							<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
								{t('user_detail_role')}
							</div>
							<div className='mt-3 flex items-center gap-2 text-base font-semibold'>
								<Shield className='size-4 text-muted-foreground' />
								<span>{roleMeta.label}</span>
							</div>
						</div>
						<div className='rounded-[24px] border border-border/60 bg-background/35 px-4 py-4'>
							<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
								{t('user_fans')}
							</div>
							<div className='mt-3 text-2xl font-semibold'>
								{user.fans ?? 0}
							</div>
						</div>
						<div className='rounded-[24px] border border-border/60 bg-background/35 px-4 py-4'>
							<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
								{t('user_follows')}
							</div>
							<div className='mt-3 text-2xl font-semibold'>
								{user.follows ?? 0}
							</div>
						</div>
					</div>

					<div className='rounded-[24px] border border-border/60 bg-background/30 px-5 py-5'>
						<div className='max-w-4xl space-y-4'>
							<div className='space-y-2'>
								<h2 className='text-xl font-semibold tracking-tight'>
									{t('seo_user_intro_title')}
								</h2>
								<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
									{user.slogan
										? t('seo_user_intro_with_slogan', { name: user.nickname })
										: t('seo_user_intro_without_slogan', {
												name: user.nickname,
											})}
								</p>
							</div>
							<div className='space-y-3'>
								<h3 className='text-base font-semibold tracking-tight'>
									{t('seo_user_explore_title')}
								</h3>
								<ul className='list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base'>
									<li>{t('seo_user_explore_sections')}</li>
									<li>{t('seo_user_explore_community')}</li>
								</ul>
							</div>
						</div>
					</div>
				</div>

				<SeoUserSectionsBrowser
					userId={user.id}
					sections={sections}
					keyword={keyword}
					hasMore={sectionsResponse.has_more}
					nextStart={sectionsResponse.next_start}
				/>
			</div>
		);
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			notFound();
		}
		throw error;
	}
};

export default SeoUserDetailPage;
