import {
	SectionInfo as SectionInfoType,
	SectionSeoDetailRequest,
} from '@/generated';
import JsonLd from '@/components/seo/json-ld';
import { SeoSectionSidebarBridge } from '@/components/seo/seo-section-meta-sidebar';
import SeoMobileSidebarMenu from '@/components/seo/seo-mobile-sidebar-menu';
import SectionGraphSEO from '@/components/section/section-graph-seo';
import SectionDocumentsList from '@/components/section/section-documents-list';
import { serverRequest } from '@/lib/request-server';
import sectionApi from '@/api/section';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { utils } from '@kinda/utils';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import {
	BookOpenText,
	CalendarClock,
	CalendarDays,
	Sparkles,
	Users,
} from 'lucide-react';
import SectionCommentsList from '@/components/section/section-comments-list';
import SectionCommentForm from '@/components/section/section-comment-form';
import { SectionProcessStatus } from '@/enums/section';
import TipTapMarkdownViewer from '@/components/markdown/tiptap-markdown-viewer';
import Link from 'next/link';
import {
	fetchPublicSectionComments,
	fetchPublicSectionDocuments,
	fetchPublicSectionGraph,
	fetchRemoteTextContent,
	isSeoNotFoundError,
} from '@/lib/seo';
import { notFound } from 'next/navigation';
import SeoSectionSubscribeButton from '@/components/seo/seo-section-subscribe-button';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { getRenderableGraphData } from '@/lib/graph-render';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
	toIsoDate,
} from '@/lib/seo-metadata';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { replacePath } from '@/lib/utils';
import ImageWithFallback from '@/components/ui/image-with-fallback';
import MobileAutoAudioTrack from '@/components/ui/mobile-auto-audio-track';

type Params = Promise<{ uuid: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getSectionDetail = async (
	data: SectionSeoDetailRequest,
): Promise<SectionInfoType> => {
	return await serverRequest(sectionApi.getSEOSectionDetail, {
		data,
	});
};

const formatSectionDate = (
	value: Date | string | null | undefined,
	locale: string,
) => {
	if (!value) {
		return '--';
	}

	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
	}).format(new Date(value));
};

const buildSectionMetaDescription = (section: SectionInfoType) => {
	const rawDescription = section.description?.trim();
	if (rawDescription) {
		return rawDescription;
	}

	const labels = section.labels
		?.map((label) => label.name?.trim())
		.filter(Boolean)
		.slice(0, 3);

	return [
		section.title?.trim(),
		labels && labels.length > 0 ? `Topics: ${labels.join(', ')}` : null,
		section.creator?.nickname ? `Creator: ${section.creator.nickname}` : null,
	]
		.filter(Boolean)
		.join(' • ');
};

export async function generateMetadata(props: {
	params: Params;
	searchParams: SearchParams;
}): Promise<Metadata | undefined> {
	const t = await getTranslations();
	// read route params
	const { uuid } = await props.params;

	// fetch data
	const [section_res, section_err] = await utils.to(
		getSectionDetail({ uuid: uuid }),
	);

	if (section_err) {
		if (isSeoNotFoundError(section_err)) {
			return;
		}
		throw new Error('Something is wrong while getting the section detail');
	}
	if (section_res) {
		const metaDescription = buildSectionMetaDescription(section_res);
		return buildMetadata({
			title: formatMetaTitle(section_res.title),
			description: metaDescription,
			path: `/section/${uuid}`,
			type: 'article',
			images: [getSectionCoverSrc(section_res) ?? undefined],
			socialCard: {
				eyebrow: section_res.creator?.nickname || t('seo_community_title'),
				theme: 'section',
			},
			publishedTime: toIsoDate(section_res.create_time),
			modifiedTime: toIsoDate(
				section_res.update_time ?? section_res.create_time,
			),
			authors: section_res.creator?.nickname
				? [section_res.creator.nickname]
				: undefined,
			tags: section_res.labels?.map((label) => label.name),
			keywords: [
				section_res.title,
				...(section_res.labels?.map((label) => label.name) ?? []),
			],
		});
	}
	return;
}

const SEOSectionDetail = async (props: {
	params: Params;
	searchParams: SearchParams;
}) => {
	const t = await getTranslations();
	const locale = await getLocale();
	const cookieStore = await cookies();
	const params = await props.params;
	const uuid = params.uuid;
	const hasAccessToken = !!cookieStore.get('access_token');

	let markdown: string | null = null;
	let section: SectionInfoType | null = null;

	const [section_res, section_err] = await utils.to(
		getSectionDetail({ uuid: uuid }),
	);

	if (section_err) {
		if (isSeoNotFoundError(section_err)) {
			notFound();
		}
		throw new Error('Something is wrong while getting the section detail');
	}

	if (section_res) {
		section = section_res;
	}

	if (section_res && section_res.md_file_name) {
		const [markdown_res] = await utils.to(
			fetchRemoteTextContent(section_res.md_file_name),
		);
		markdown = markdown_res ?? null;
	}

	const [initialCommentsRes, initialDocumentsRes, initialGraphRes] =
		section_res?.id
			? await Promise.all([
					utils.to(
						fetchPublicSectionComments({
							section_id: section_res.id,
							keyword: '',
							limit: 10,
						}),
					),
					utils.to(
						fetchPublicSectionDocuments({
							section_id: section_res.id,
							keyword: '',
							desc: true,
							limit: 10,
						}),
					),
					utils.to(
						fetchPublicSectionGraph({
							section_id: section_res.id,
						}),
					),
				])
			: [
					[null, null],
					[null, null],
					[null, null],
				];

	const initialComments = initialCommentsRes[0] ?? undefined;
	const initialDocuments = initialDocumentsRes[0] ?? undefined;
	const initialGraph = initialGraphRes[0] ?? undefined;

	const sectionTitle = section?.title || t('section_title_empty');
	const sectionDescription =
		section?.description || t('section_description_empty');
	const updatedAt = formatSectionDate(
		section?.update_time ?? section?.create_time,
		locale,
	);
	const createdAt = formatSectionDate(section?.create_time, locale);
	const sectionCover = getSectionCoverSrc(section);
	const sectionPodcastSrc = section?.podcast_task?.podcast_file_name ?? null;
	const creatorAvatar =
		section?.creator?.avatar && section?.creator?.id
			? replacePath(section.creator.avatar, section.creator.id)
			: undefined;
	const sectionSchema =
		section && section.creator
			? {
					'@context': 'https://schema.org',
					'@type': 'CollectionPage',
					name: sectionTitle,
					description: sectionDescription,
					url: createAbsoluteUrl(`/section/${uuid}`),
					image: sectionCover ?? undefined,
					datePublished: toIsoDate(section.create_time),
					dateModified: toIsoDate(section.update_time ?? section.create_time),
					inLanguage: locale,
					author: {
						'@type': 'Person',
						name: section.creator.nickname,
						url: createAbsoluteUrl(`/user/${section.creator.id}`),
					},
					keywords: section.labels?.map((label) => label.name),
				}
			: null;
	const freshnessState = getSectionFreshnessState(section);
	const hasRenderableGraph = getRenderableGraphData(initialGraph).hasRenderableGraph;
	const structuredData: Array<Record<string, unknown>> = [];
	if (sectionSchema) {
		structuredData.push(sectionSchema);
	}
	const graphCardState =
		hasRenderableGraph && freshnessState.graphStale
			? {
					badge: t('section_graph_status_stale'),
					tone: 'warning' as const,
				}
			: hasRenderableGraph ||
				  section?.process_task?.status === SectionProcessStatus.SUCCESS
				? {
						badge: t('document_graph_status_success'),
						tone: 'success' as const,
					}
				: section?.process_task?.status === SectionProcessStatus.FAILED
					? {
							badge: t('document_graph_status_failed'),
							tone: 'danger' as const,
						}
					: section?.process_task?.status === SectionProcessStatus.PROCESSING
						? {
								badge: t('document_graph_status_doing'),
								tone: 'default' as const,
							}
						: {
								badge: t('document_graph_status_todo'),
								tone: 'warning' as const,
							};
	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
			{structuredData.length > 0 ? <JsonLd data={structuredData} /> : null}
			{section && sectionPodcastSrc ? (
				<MobileAutoAudioTrack
					src={sectionPodcastSrc}
					title={sectionTitle}
					artist={section.creator?.nickname || 'AI Generated'}
					cover={sectionCover ?? undefined}
				/>
			) : null}
			<div className='mx-auto w-full max-w-[920px] space-y-5'>
				<SeoSectionSidebarBridge
					section={section!}
					sectionTitle={sectionTitle}
					sectionDescription={sectionDescription}
					updatedAt={updatedAt}
					createdAt={createdAt}
					creatorAvatar={creatorAvatar}
					sectionCover={sectionCover}
					initialDocuments={initialDocuments}
					initialGraph={initialGraph}
					hasRenderableGraph={hasRenderableGraph}
					graphBadge={graphCardState.badge}
					graphTone={graphCardState.tone}
					graphStale={freshnessState.graphStale}
				/>
				<SeoMobileSidebarMenu
					browseLabel={t('section_mobile_menu_section_browse')}
					menuTitle={t('section_action_menu_title')}
					menuDescription={t('section_action_menu_description')}
					panels={[
						{
							key: 'info',
							icon: 'info',
							title: t('section_mobile_info_title'),
							description: t('section_mobile_info_description'),
							content: (
								<div className='space-y-4 p-4'>
									{section?.creator ? (
										<Link
											href={`/user/${section.creator.id}`}
											className='group flex items-center gap-3 rounded-[24px] border border-border/40 bg-background/40 px-3 py-3 transition-colors hover:bg-background/65'>
											<Avatar className='size-10'>
												<AvatarImage
													src={creatorAvatar}
													alt={section.creator.nickname}
													className='object-cover'
												/>
												<AvatarFallback className='font-semibold'>
													{section.creator.nickname.slice(0, 1)}
												</AvatarFallback>
											</Avatar>
											<div className='min-w-0 flex-1'>
												<p className='truncate text-sm font-medium transition-colors group-hover:text-foreground'>
													{section.creator.nickname}
												</p>
												<p className='truncate text-xs text-muted-foreground'>
													{t('section_creator')}
												</p>
											</div>
										</Link>
									) : null}

									<div className='grid grid-cols-2 gap-3'>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<BookOpenText className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('section_documents')}
													</p>
													<div className='text-sm font-medium text-foreground'>
														{section?.documents_count ?? 0}
													</div>
												</div>
											</div>
										</div>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<Users className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('section_subscribers')}
													</p>
													<div className='text-sm font-medium text-foreground'>
														{section?.subscribers_count ?? 0}
													</div>
												</div>
											</div>
										</div>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<CalendarClock className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('section_updated_at')}
													</p>
													<div className='text-sm font-medium text-foreground'>
														{updatedAt}
													</div>
												</div>
											</div>
										</div>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<CalendarDays className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('section_info_created_at')}
													</p>
													<div className='text-sm font-medium text-foreground'>
														{createdAt}
													</div>
												</div>
											</div>
										</div>
									</div>

									{section?.labels?.length ? (
										<div className='flex flex-wrap gap-2'>
											{section.labels.map((label) => (
												<Badge
													key={label.id}
													variant='secondary'
													className='rounded-full bg-secondary/70 px-3 py-1 text-xs'>
													{label.name}
												</Badge>
											))}
										</div>
									) : null}
								</div>
							),
						},
						{
							key: 'graph',
							icon: 'graph',
							title: t('section_graph'),
							description: t('section_graph_description'),
							content: (
								<SectionGraphSEO
									section_id={section!.id}
									showSearch
									showStaleHint={false}
									initialSection={section!}
									initialGraph={initialGraph}
									publicMode
								/>
							),
						},
						{
							key: 'audio',
							icon: 'audio',
							title: t('section_mobile_media_title'),
							description: t('section_podcast_placeholder_description'),
							content: (
								<div className='space-y-4 p-4'>
									{section?.podcast_task?.podcast_file_name ? (
										<audio
											controls
											preload='metadata'
											className='w-full'
											src={section.podcast_task.podcast_file_name}
										/>
									) : (
										<div className='rounded-[22px] border border-border/35 bg-background/30 px-4 py-4 text-sm text-muted-foreground'>
											{t('section_podcast_placeholder_description')}
										</div>
									)}
								</div>
							),
						},
						{
							key: 'documents',
							icon: 'documents',
							title: t('section_documents'),
							description: t('section_documents_description'),
							content: (
								<div className='p-4'>
									<SectionDocumentsList
										section_id={section!.id}
										publicMode
										initialData={initialDocuments}
									/>
								</div>
							),
						},
					]}
				/>
				<div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
					{section?.creator ? (
						<Link
							href={`/user/${section.creator.id}`}
							className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-2.5 py-1.5 transition-colors hover:bg-background/70'>
							<Avatar className='size-6'>
								<AvatarImage
									src={creatorAvatar}
									alt={section.creator.nickname}
									className='object-cover'
								/>
								<AvatarFallback className='text-[11px] font-semibold'>
									{section.creator.nickname.slice(0, 1)}
								</AvatarFallback>
							</Avatar>
							<span>{section.creator.nickname}</span>
						</Link>
					) : null}
					<div className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-3 py-1.5 text-xs sm:text-sm'>
						<CalendarClock className='size-3.5' />
						<span>{t('section_updated_at')}</span>
						<span className='text-foreground/85'>{updatedAt}</span>
					</div>
					{section?.id ? (
						<SeoSectionSubscribeButton
							sectionId={section.id}
							creatorId={section.creator?.id}
							initialIsSubscribed={section.is_subscribed}
							className='shrink-0'
						/>
					) : null}
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs text-muted-foreground'>
						<Sparkles className='size-3.5 text-emerald-500' />
						<span>{t('section_ai_tips')}</span>
					</div>
				</div>

				<div className='space-y-3'>
					<h1 className='break-words text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl'>
						{sectionTitle}
					</h1>
					<p className='max-w-[820px] break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] sm:text-base'>
						{sectionDescription}
					</p>
				</div>
			</div>

			<div className='min-w-0 space-y-6'>
				<div className='mx-auto w-full max-w-[920px]'>
					{sectionCover ? (
						<ImageWithFallback
							src={sectionCover}
							alt={sectionTitle}
							preview
							className='h-[220px] w-full rounded-xl object-cover object-center sm:h-[300px]'
							fallbackClassName='h-[220px] w-full sm:h-[300px]'
							fallbackSvgClassName='max-w-[220px] p-6'
						/>
					) : null}
				</div>

				<div className='mx-auto w-full max-w-[820px] overflow-x-hidden'>
					<TipTapMarkdownViewer
						content={markdown ? markdown : t('section_no_md')}
						ownerId={section?.creator?.id}
					/>
				</div>

				{section?.id ? (
					<section className='mx-auto w-full max-w-[920px] space-y-5 border-t border-border/50 pt-6'>
						<div className='space-y-2'>
							<h2 className='text-2xl font-semibold tracking-tight'>
								{t('section_comments')}
							</h2>
							<p className='text-sm leading-6 text-muted-foreground'>
								{t('section_comments_description')}
							</p>
						</div>

						<div className='space-y-5'>
							{hasAccessToken ? (
								<SectionCommentForm section_id={section.id} />
							) : (
								<div className='rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
									<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
										<span>{t('seo_section_login_to_comment')}</span>
										<Link
											href={`/login?redirect_to=${encodeURIComponent(`/section/${uuid}`)}`}>
											<Button size='sm' className='rounded-2xl'>
												{t('seo_nav_login_in')}
											</Button>
										</Link>
									</div>
								</div>
							)}
							<SectionCommentsList
								section_id={section.id}
								initialData={initialComments}
								publicMode
							/>
						</div>
					</section>
				) : null}
			</div>
		</div>
	);
};

export default SEOSectionDetail;
