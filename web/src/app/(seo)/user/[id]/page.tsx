import JsonLd from '@/components/seo/shared/json-ld';
import SeoUserFollowButton from '@/components/seo/user/seo-user-follow-button';
import SeoUserContentBrowser from '@/components/seo/user/seo-user-content-browser';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/enums/user';
import { isSeoNotFoundError } from '@/lib/seo';
import { searchPublicDocumentServer } from '@/service/document';
import { searchUserSectionServer } from '@/service/section';
import { getUserInfoServer } from '@/service/user';
import { cn, replacePath } from '@/lib/utils';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BookMarked, FileText, Users } from 'lucide-react';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
	toMetaDescription,
} from '@/lib/seo-metadata';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type UserSeoTab = 'sections' | 'documents';

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

const getTabValue = (value: string | string[] | undefined): UserSeoTab => {
	return getSingleValue(value) === 'sections' ? 'sections' : 'documents';
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
	user: Awaited<ReturnType<typeof getUserInfoServer>>,
	totalSections?: number,
) => {
	const slogan = user.slogan?.trim();
	if (slogan) {
		return toMetaDescription(slogan);
	}

	const fallback = [
		`${user.nickname} public creator profile`,
		typeof totalSections === 'number'
			? `${totalSections} public sections`
			: null,
		'Revornix community profile with published sections, public documents, and creator context.',
	]
		.filter(Boolean)
		.join(' • ');

	return toMetaDescription(fallback);
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
	const tab = getTabValue(searchParams.tab);
	const noIndex = Boolean(keyword) || start !== undefined;

	try {
		const user = await getUserInfoServer({ user_id: Number(id) });
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
			title: formatMetaTitle(
				user.nickname,
				tab === 'documents'
					? t('user_detail_documents_title')
					: t('seo_user_title_suffix'),
			),
			description: metaDescription,
			path:
				tab === 'sections'
					? `/user/${user.id}?tab=sections`
					: `/user/${user.id}`,
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
	const tab = getTabValue(searchParams.tab);

	try {
		const [user, sectionsResponse, documentsResponse] = await Promise.all([
			getUserInfoServer({ user_id: userId }),
			tab === 'sections'
				? searchUserSectionServer({
						user_id: userId,
						keyword: keyword || undefined,
						start,
						limit: 10,
						desc: true,
					})
				: null,
			tab === 'documents'
				? searchPublicDocumentServer({
						creator_id: userId,
						keyword: keyword || undefined,
						start,
						limit: 12,
						desc: true,
					})
				: null,
		]);
		const sections = sectionsResponse?.elements ?? [];
		const documents = documentsResponse?.elements ?? [];
		const totalSections = sectionsResponse?.total ?? 0;
		const totalDocuments = documentsResponse?.total ?? 0;
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
			<div className='mx-auto flex w-full max-w-[1480px] flex-col px-4 pb-10 sm:px-6 lg:px-8'>
				<JsonLd data={structuredData} />
				<section className='-mx-4 overflow-hidden border-b border-border/60 bg-background sm:-mx-6 lg:-mx-8'>
					<div className='relative h-56 w-full overflow-hidden lg:h-64'>
						<div className='h-full w-full'>
							{coverSrc ? (
								<>
									<img
										src={coverSrc}
										alt={`${user.nickname} cover`}
										className='h-full w-full object-cover'
									/>
									<div className='absolute inset-0 bg-gradient-to-t from-black/72 via-black/24 to-black/8 dark:from-black/64 dark:via-black/18 dark:to-black/4' />
									<div className='absolute inset-y-0 left-0 w-[72%] bg-gradient-to-r from-black/56 via-black/28 to-transparent dark:from-black/48 dark:via-black/20' />
									<div className='absolute inset-y-0 right-0 w-[38%] bg-gradient-to-l from-black/34 via-black/14 to-transparent dark:from-black/28 dark:via-black/10' />
								</>
							) : null}
						</div>
						<div className='absolute inset-x-0 bottom-0'>
							<div className='mx-auto flex w-full max-w-[1160px] flex-col gap-4 px-4 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8'>
								<div className='flex min-w-0 items-end gap-4'>
									<Avatar className='size-20 border-4 border-background/90 shadow-xl sm:size-24'>
										<AvatarImage
											className='object-cover'
											src={avatarSrc}
											alt='user avatar'
										/>
										<AvatarFallback className='text-2xl font-semibold'>
											{user.nickname?.slice(0, 1) ?? '?'}
										</AvatarFallback>
									</Avatar>
									<div className='min-w-0 space-y-2 pb-1'>
										<div className='flex flex-wrap items-center gap-2'>
											<h1 className='break-words text-2xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-3xl'>
												{user.nickname}
											</h1>
											<Badge
												variant='outline'
												className={cn(
													'rounded-full bg-background/82 px-3 py-1 text-xs font-medium backdrop-blur',
													roleMeta.className,
												)}>
												{roleMeta.label}
											</Badge>
										</div>
										<p className='max-w-[760px] text-sm leading-6 text-white/86 drop-shadow-sm'>
											{user.slogan ? user.slogan : t('user_slogan_empty')}
										</p>
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
					<div className='border-t border-border/60 bg-background/96'>
						<div className='mx-auto flex w-full max-w-[1160px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8'>
							<div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
								<div className='inline-flex items-center gap-1.5'>
									<Users className='size-4' />
									<span>
										{t('user_fans')} {user.fans ?? 0}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<Users className='size-4' />
									<span>
										{t('user_follows')} {user.follows ?? 0}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<BookMarked className='size-4' />
									<span>
										{t('user_detail_section_total')} {totalSections}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5'>
									<FileText className='size-4' />
									<span>
										{t('user_detail_document_total')} {totalDocuments}
									</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				<SeoUserContentBrowser
					userId={user.id}
					tab={tab}
					sections={sections}
					documents={documents}
					keyword={keyword}
					total={tab === 'documents' ? totalDocuments : totalSections}
					hasMore={
						tab === 'documents'
							? documentsResponse?.has_more
							: sectionsResponse?.has_more
					}
					nextStart={
						tab === 'documents'
							? documentsResponse?.next_start
							: sectionsResponse?.next_start
					}
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
