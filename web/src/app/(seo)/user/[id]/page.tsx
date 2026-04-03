import PublicSectionCard from '@/components/seo/public-section-card';
import JsonLd from '@/components/seo/json-ld';
import SeoUserFollowButton from '@/components/seo/seo-user-follow-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserRole } from '@/enums/user';
import {
	fetchPublicUserDetail,
	fetchPublicUserSections,
	isSeoNotFoundError,
} from '@/lib/seo';
import { cn, replacePath } from '@/lib/utils';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	ArrowRight,
	AtSign,
	BookMarked,
	ChevronRight,
	Search,
	Shield,
	Sparkles,
	Users,
} from 'lucide-react';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';

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
				className:
					'border-border/60 bg-background/75 text-muted-foreground',
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
		typeof totalSections === 'number' ? `${totalSections} public sections` : null,
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
		const avatarSrc =
			user.avatar && user.avatar.length > 0
				? replacePath(user.avatar, user.id)
				: undefined;
		const metaDescription = buildUserMetaDescription(user);

		return buildMetadata({
			title: `${user.nickname} | ${t('seo_user_title_suffix')}`,
			description: metaDescription,
			path: `/user/${user.id}`,
			noIndex,
			images: [avatarSrc],
			keywords: [user.nickname, 'creator', 'public profile'],
		});
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			return buildMetadata({
				title: t('seo_user_title_suffix'),
				description: t('user_detail_public_profile_description'),
				path: `/user/${id}`,
				noIndex: true,
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
				image: avatarSrc,
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
		const nextHref = new URLSearchParams();
		if (keyword) {
			nextHref.set('q', keyword);
		}
		if (
			sectionsResponse.next_start !== undefined &&
			sectionsResponse.next_start !== null
		) {
			nextHref.set('start', String(sectionsResponse.next_start));
		}

		return (
			<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
				<JsonLd data={structuredData} />
				<div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
					<Link href='/community' className='transition-colors hover:text-foreground'>
						{t('seo_community_title')}
					</Link>
					<ChevronRight className='size-4' />
					<span className='line-clamp-1 text-foreground'>{user.nickname}</span>
				</div>
				<div className='relative overflow-hidden rounded-[30px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.2),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.84))]'>
					<div className='pointer-events-none absolute inset-0'>
						<div className='absolute left-0 top-0 h-28 w-28 rounded-full bg-emerald-500/12 blur-3xl' />
						<div className='absolute right-4 top-4 h-32 w-32 rounded-full bg-sky-500/12 blur-3xl' />
					</div>
					<div className='relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between'>
						<div className='flex min-w-0 flex-col gap-5 md:flex-row md:items-center'>
							<Avatar
								className='size-24 border-4 border-background/80 shadow-lg md:size-28'
								title={user.nickname || 'Unknown User'}>
								<AvatarImage
									className='object-cover'
									src={avatarSrc}
									alt='user avatar'
								/>
								<AvatarFallback className='text-2xl font-semibold'>
									{user.nickname?.slice(0, 1) ?? '?'}
								</AvatarFallback>
							</Avatar>
							<div className='min-w-0 space-y-4'>
								<div className='space-y-2'>
									<div className='flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground'>
										<Sparkles className='size-3' />
										<span>{t('website_title')}</span>
									</div>
									<div className='flex flex-wrap items-center gap-2'>
										<h1 className='truncate text-3xl font-semibold tracking-tight'>
											{user.nickname}
										</h1>
										<Badge
											className={cn(
												'rounded-full border px-3 py-1 text-xs font-medium',
												roleMeta.className,
											)}>
											{roleMeta.label}
										</Badge>
									</div>
									<p className='max-w-3xl text-base leading-7 text-muted-foreground'>
										{user.slogan ? user.slogan : t('user_slogan_empty')}
									</p>
								</div>
								<div className='flex flex-wrap gap-2.5'>
									<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
										<Users className='size-4' />
										<span>
											{t('user_fans')} {user.fans ?? 0}
										</span>
									</div>
									<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
										<Shield className='size-4' />
										<span>{roleMeta.label}</span>
									</div>
									<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-sm text-muted-foreground'>
										<BookMarked className='size-4' />
										<span>
											{t('user_detail_section_total')} {totalSections}
										</span>
									</div>
								</div>
							</div>
						</div>
						<div className='flex shrink-0 items-center gap-3'>
							<SeoUserFollowButton
								userId={user.id}
								initialIsFollowed={user.is_followed}
								className='shrink-0'
							/>
							<Link href='/community'>
								<Button
									variant='outline'
									className='rounded-2xl bg-background/80 px-5 shadow-sm'>
									{t('seo_user_back_to_community')}
								</Button>
							</Link>
						</div>
					</div>
				</div>

				<div className='grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.9fr)]'>
					<Card className='rounded-[28px] border border-border/60 bg-card/85 py-0 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.34)] backdrop-blur'>
						<CardHeader className='px-6 pt-6'>
							<CardTitle className='text-xl tracking-tight'>
								{t('user_detail_public_profile')}
							</CardTitle>
							<CardDescription className='leading-6'>
								{t('user_detail_public_profile_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='px-6 pb-6'>
							<div className='grid gap-3 sm:grid-cols-3'>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{t('user_detail_role')}
									</div>
									<div className='mt-3 flex items-center gap-2 text-base font-semibold'>
										<Shield className='size-4 text-muted-foreground' />
										<span>{roleMeta.label}</span>
									</div>
								</div>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{t('user_fans')}
									</div>
									<div className='mt-3 text-2xl font-semibold'>
										{user.fans ?? 0}
									</div>
								</div>
								<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
									<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
										{t('user_follows')}
									</div>
									<div className='mt-3 text-2xl font-semibold'>
										{user.follows ?? 0}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='rounded-[28px] border border-border/60 bg-card/85 py-0 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.3)] backdrop-blur'>
						<CardHeader className='px-6 pt-6'>
							<CardTitle className='text-xl tracking-tight'>
								{t('user_detail_overview')}
							</CardTitle>
							<CardDescription className='leading-6'>
								{t('user_detail_overview_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3 px-6 pb-6'>
							<div className='rounded-2xl border border-border/60 bg-background/70 p-4'>
								<div className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
									{t('user_detail_section_total')}
								</div>
								<div className='mt-2 text-3xl font-semibold'>
									{totalSections}
								</div>
							</div>
							{sectionsResponse.has_more && sectionsResponse.next_start ? (
								<Link href={`/user/${user.id}?${nextHref.toString()}`}>
									<Button className='w-full rounded-2xl'>
										{t('seo_community_next')}
										<ArrowRight />
									</Button>
								</Link>
							) : null}
						</CardContent>
					</Card>
				</div>

				<Card className='rounded-[28px] border border-border/60 bg-card/85 py-0 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.32)] backdrop-blur'>
					<CardContent className='px-6 py-6'>
						<div className='max-w-5xl space-y-4'>
							<div className='space-y-2'>
								<h2 className='text-2xl font-semibold tracking-tight'>
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
								<h3 className='text-lg font-semibold tracking-tight'>
									{t('seo_user_explore_title')}
								</h3>
								<ul className='list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base'>
									<li>{t('seo_user_explore_sections')}</li>
									<li>{t('seo_user_explore_community')}</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className='rounded-[30px] border border-border/60 bg-card/86 shadow-[0_24px_64px_-44px_rgba(15,23,42,0.32)] backdrop-blur'>
					<div className='border-b border-border/60 px-5 py-5'>
						<div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
							<div className='space-y-2'>
								<h2 className='text-2xl font-semibold tracking-tight'>
									{t('user_detail_sections_title')}
								</h2>
								<p className='text-sm leading-6 text-muted-foreground'>
									{t('user_detail_sections_description')}
								</p>
							</div>
							<form action={`/user/${user.id}`} className='w-full max-w-md'>
								<div className='relative'>
									<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
									<Input
										name='q'
										defaultValue={keyword}
										placeholder={t('user_detail_sections_search_placeholder')}
										className='h-11 rounded-2xl border-border/60 bg-background/70 pl-9'
									/>
								</div>
							</form>
						</div>
					</div>
					<div className='px-5 py-5'>
						{sections.length === 0 ? (
							<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
								<div className='max-w-md'>
									<h3 className='text-lg font-semibold tracking-tight'>
										{keyword
											? t('user_detail_sections_search_empty')
											: t('user_sections_empty')}
									</h3>
									<p className='mt-2 text-sm leading-7 text-muted-foreground'>
										{keyword
											? `"${keyword}"`
											: t('user_detail_sections_description')}
									</p>
								</div>
							</div>
						) : (
							<div className='grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4'>
								{sections.map((section) => (
									<div className='h-full' key={section.id}>
										<PublicSectionCard section={section} />
									</div>
								))}
							</div>
						)}
					</div>
				</div>
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
