import TipTapMarkdownViewer from '@/components/markdown/tiptap-markdown-viewer';
import JsonLd from '@/components/seo/json-ld';
import {
	SeoDocumentAiSummaryPanel,
	SeoDocumentSidebarBridge,
} from '@/components/seo/seo-document-meta-sidebar';
import SeoMobileSidebarMenu from '@/components/seo/seo-mobile-sidebar-menu';
import DocumentGraphSEO from '@/components/document/document-graph-seo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NoticeBox from '@/components/ui/notice-box';
import AudioPlayer from '@/components/ui/audio-player';
import { DocumentCategory, DocumentPodcastStatus } from '@/enums/document';
import { getDocumentCoverSrc } from '@/lib/document-cover';
import { getRenderableGraphData } from '@/lib/graph-render';
import {
	fetchPublicDocumentGraph,
	fetchPublicDocumentDetail,
	fetchPublicDocumentMarkdownContent,
	fetchPublicDocumentComments,
	getPublicSectionHref,
	isSeoNotFoundError,
} from '@/lib/seo';
import DocumentCommentsList from '@/components/document/document-comments-list';
import SeoDocumentCommentGate from '@/components/seo/seo-document-comment-gate';
import { replacePath } from '@/lib/utils';
import { ArrowRight, CalendarClock, FileDown, Globe2 } from 'lucide-react';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
	getSiteOrigin,
	toIsoDate,
} from '@/lib/seo-metadata';
import ImageWithFallback from '@/components/ui/image-with-fallback';
import { Separator } from '@/components/ui/separator';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import { DocumentGraphStatus } from '@/enums/document';
import MobileAutoAudioTrack from '@/components/ui/mobile-auto-audio-track';

type Params = Promise<{ id: string }>;

const getCategoryLabel = (
	category: number,
	t: Awaited<ReturnType<typeof getTranslations>>,
) => {
	if (category === DocumentCategory.WEBSITE) {
		return t('document_category_link');
	}
	if (category === DocumentCategory.FILE) {
		return t('document_category_file');
	}
	if (category === DocumentCategory.QUICK_NOTE) {
		return t('document_category_quick_note');
	}
	if (category === DocumentCategory.AUDIO) {
		return t('document_category_audio');
	}
	return t('document_category_others');
};

const getDocumentMarkdown = async (
	document: Awaited<ReturnType<typeof fetchPublicDocumentDetail>>,
) => {
	if (
		document.category === DocumentCategory.WEBSITE ||
		document.category === DocumentCategory.FILE
	) {
		if (!document.convert_task?.md_file_name) {
			return null;
		}
		return await fetchPublicDocumentMarkdownContent({
			document_id: document.id,
		});
	}
	if (document.category === DocumentCategory.QUICK_NOTE) {
		return document.quick_note_info?.content ?? null;
	}
	if (document.category === DocumentCategory.AUDIO) {
		return document.transcribe_task?.transcribed_text ?? null;
	}
	return null;
};

export async function generateMetadata(props: {
	params: Params;
}): Promise<Metadata> {
	const { id } = await props.params;
	const t = await getTranslations();

	try {
		const document = await fetchPublicDocumentDetail({
			document_id: Number(id),
		});
		const coverSrc = getDocumentCoverSrc(document) ?? undefined;

		return buildMetadata({
			title: formatMetaTitle(
				document.title || t('document_no_title'),
				t('seo_document_title_suffix'),
			),
			description: document.description || t('document_no_description'),
			path: `/document/${document.id}`,
			type: 'article',
			images: [coverSrc],
			socialCard: {
				eyebrow: getCategoryLabel(document.category, t),
				theme: 'document',
			},
			publishedTime: toIsoDate(document.create_time),
			modifiedTime: toIsoDate(document.update_time ?? document.create_time),
			authors: [document.creator.nickname],
			tags: document.labels?.map((label) => label.name),
			keywords: [
				document.title,
				document.from_plat,
				...(document.labels?.map((label) => label.name) ?? []),
			],
		});
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			return buildMetadata({
				title: formatMetaTitle(t('seo_document_title_suffix')),
				description: t('document_no_description'),
				path: `/document/${id}`,
				noIndex: true,
				socialCard: {
					eyebrow: t('seo_document_title_suffix'),
					theme: 'document',
				},
				keywords: ['public document'],
			});
		}
		throw error;
	}
}

const SeoDocumentDetailPage = async (props: { params: Params }) => {
	const [{ id }, locale, t] = await Promise.all([
		props.params,
		getLocale(),
		getTranslations(),
	]);

	const documentId = Number(id);
	if (Number.isNaN(documentId)) {
		notFound();
	}

	try {
		const document = await fetchPublicDocumentDetail({
			document_id: documentId,
		});
		const initialGraph = await fetchPublicDocumentGraph({
			document_id: documentId,
		}).catch(() => null);
		const initialComments = await fetchPublicDocumentComments({
			document_id: documentId,
			keyword: '',
			limit: 10,
		}).catch(() => undefined);
		const markdown = await getDocumentMarkdown(document);
		const categoryLabel = getCategoryLabel(document.category, t);
		const coverSrc = getDocumentCoverSrc(document);
		const creatorAvatar = replacePath(
			document.creator.avatar,
			document.creator.id,
		);
		const publicSections =
			document.sections?.filter((section) => section.publish_uuid) ?? [];
		const primaryAudioSrc =
			document.audio_info?.audio_file_name ||
			(document.podcast_task?.status === DocumentPodcastStatus.SUCCESS
				? document.podcast_task.podcast_file_name
				: null);
		const documentSchema = {
			'@context': 'https://schema.org',
			'@type': 'Article',
			headline: document.title || t('document_no_title'),
			description: document.description || t('document_no_description'),
			image: coverSrc,
			datePublished: toIsoDate(document.create_time),
			dateModified: toIsoDate(document.update_time ?? document.create_time),
			mainEntityOfPage: createAbsoluteUrl(`/document/${document.id}`),
			author: {
				'@type': 'Person',
				name: document.creator.nickname,
				url: createAbsoluteUrl(`/user/${document.creator.id}`),
			},
			publisher: {
				'@type': 'Organization',
				name: t('website_title'),
				url: getSiteOrigin(),
			},
			keywords: document.labels?.map((label) => label.name),
		};
		const freshnessState = getDocumentFreshnessState(document);
		const hasRenderableGraph =
			getRenderableGraphData(initialGraph).hasRenderableGraph ||
			document.graph_task?.status === DocumentGraphStatus.SUCCESS;
		const graphCardState =
			hasRenderableGraph && freshnessState.graphStale
				? {
						badge: t('document_status_stale'),
						tone: 'warning' as const,
					}
				: hasRenderableGraph ||
					  document.graph_task?.status === DocumentGraphStatus.SUCCESS
					? {
							badge: t('document_graph_status_success'),
							tone: 'success' as const,
						}
					: document.graph_task?.status === DocumentGraphStatus.FAILED
						? {
								badge: t('document_graph_status_failed'),
								tone: 'danger' as const,
							}
						: document.graph_task?.status === DocumentGraphStatus.BUILDING
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
				<JsonLd data={documentSchema} />
				{primaryAudioSrc ? (
					<MobileAutoAudioTrack
						src={primaryAudioSrc}
						scriptUrl={document.podcast_task?.podcast_script_file_name ?? undefined}
						title={document.title || t('document_no_title')}
						artist={document.creator.nickname || 'AI Generated'}
						cover={coverSrc ?? undefined}
					/>
				) : null}
				<SeoDocumentSidebarBridge
					document={document}
					categoryLabel={categoryLabel}
					locale={locale}
					creatorAvatar={creatorAvatar}
					coverSrc={coverSrc}
					primaryAudioSrc={primaryAudioSrc}
					publicSections={publicSections}
					initialGraph={initialGraph ?? undefined}
					hasRenderableGraph={hasRenderableGraph}
					graphBadge={graphCardState.badge}
					graphTone={graphCardState.tone}
					graphStale={freshnessState.graphStale}
				/>
				<SeoMobileSidebarMenu
					browseLabel={t('document_mobile_menu_section_browse')}
					menuTitle={t('document_action_menu_title')}
					menuDescription={t('document_action_menu_description')}
					panels={[
						{
							key: 'info',
							icon: 'info',
							title: t('document_mobile_info_title'),
							description: t('document_mobile_info_description'),
							content: (
								<div className='space-y-4 p-4'>
									<Link
										href={`/user/${document.creator.id}`}
										className='group flex items-center gap-3 rounded-[24px] border border-border/40 bg-background/40 px-3 py-3 transition-colors hover:bg-background/65'>
										<Avatar className='size-10'>
											<AvatarImage
												src={creatorAvatar}
												alt={document.creator.nickname}
												className='object-cover'
											/>
											<AvatarFallback className='font-semibold'>
												{document.creator.nickname.slice(0, 1)}
											</AvatarFallback>
										</Avatar>
										<div className='min-w-0 flex-1'>
											<p className='truncate text-sm font-medium transition-colors group-hover:text-foreground'>
												{document.creator.nickname}
											</p>
											<p className='truncate text-xs text-muted-foreground'>
												{t('seo_document_creator')}
											</p>
										</div>
									</Link>

									<div className='flex flex-wrap gap-1.5'>
										<Badge
											variant='outline'
											className='rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-none'>
											{t('document_category')}: {categoryLabel}
										</Badge>
										<Badge
											variant='outline'
											className='rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-none'>
											{t('document_from_plat')}: {document.from_plat || '-'}
										</Badge>
									</div>

									<div className='grid grid-cols-2 gap-3'>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<CalendarClock className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('seo_document_updated_at')}
													</p>
													<div className='break-words text-sm font-medium text-foreground'>
														{new Intl.DateTimeFormat(locale, {
															dateStyle: 'medium',
														}).format(
															new Date(
																document.update_time ?? document.create_time,
															),
														)}
													</div>
												</div>
											</div>
										</div>
										<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
											<div className='flex items-start gap-3'>
												<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
													<FileDown className='size-3.5' />
												</div>
												<div className='min-w-0 space-y-0.5'>
													<p className='text-[11px] leading-5 text-muted-foreground'>
														{t('document_category')}
													</p>
													<div className='break-words text-sm font-medium text-foreground'>
														{categoryLabel}
													</div>
												</div>
											</div>
										</div>
									</div>

									{document.labels?.length ? (
										<div className='flex flex-wrap gap-2'>
											{document.labels.map((label) => (
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
						...(primaryAudioSrc
							? [
									{
										key: 'audio',
										icon: 'audio' as const,
										title: t('seo_document_audio'),
										description: document.title || t('document_no_title'),
										content: (
											<div className='p-4'>
												<AudioPlayer
													src={primaryAudioSrc}
													scriptUrl={document.podcast_task?.podcast_script_file_name ?? undefined}
													title={document.title}
													artist={document.creator.nickname}
													cover={coverSrc ?? undefined}
													variant='compact'
													className='rounded-[20px] border border-border/35 bg-background/20'
												/>
											</div>
										),
									},
								]
							: []),
						{
							key: 'graph',
							icon: 'graph',
							title: t('document_graph'),
							description: t('document_graph_description'),
							content: (
								<DocumentGraphSEO
									document_id={document.id}
									showSearch
									initialDocument={document}
									initialGraph={initialGraph}
									publicMode
								/>
							),
						},
						{
							key: 'source',
							icon: 'source',
							title: t('seo_document_source'),
							description:
								document.from_plat || t('seo_document_meta_description'),
							content: (
								<div className='space-y-4 p-4'>
									{document.from_plat ? (
										<p className='text-sm font-medium text-muted-foreground'>
											{document.from_plat}
										</p>
									) : null}
									{document.website_info?.url ? (
										<Link href={document.website_info.url} target='_blank'>
											<Button className='w-full rounded-full'>
												<Globe2 />
												{t('seo_document_open_source')}
											</Button>
										</Link>
									) : null}
									{document.file_info?.file_name ? (
										<Link href={document.file_info.file_name} target='_blank'>
											<Button variant='outline' className='w-full rounded-full'>
												<FileDown />
												{t('seo_document_download_file')}
											</Button>
										</Link>
									) : null}
									{!document.website_info?.url &&
									!document.file_info?.file_name ? (
										<NoticeBox>
											{document.category === DocumentCategory.QUICK_NOTE
												? t('seo_document_source_quick_note')
												: t('seo_document_source_default')}
										</NoticeBox>
									) : null}
								</div>
							),
						},
						{
							key: 'sections',
							icon: 'sections',
							title: t('seo_document_related_sections'),
							description: t('seo_document_related_sections_description'),
							content: (
								<div className='space-y-3 p-4'>
									{publicSections.length > 0 ? (
										publicSections.map((section) => (
											<Link
												key={`${section.id}-${section.publish_uuid ?? 'private'}`}
												href={getPublicSectionHref(section)}
												className='flex items-center justify-between rounded-[22px] border border-border/35 bg-background/38 px-4 py-3 transition-colors hover:bg-background/62'>
												<div className='min-w-0'>
													<div className='line-clamp-1 font-medium'>
														{section.title}
													</div>
													<div className='line-clamp-2 text-sm text-muted-foreground'>
														{section.description ||
															t('section_description_empty')}
													</div>
												</div>
												<ArrowRight className='ml-3 size-4 shrink-0 text-muted-foreground' />
											</Link>
										))
									) : (
										<NoticeBox>
											{t('seo_document_related_sections_empty')}
										</NoticeBox>
									)}
								</div>
							),
						},
					]}
				/>
				<div className='mx-auto w-full max-w-[920px] space-y-5'>
					<div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
						<Link
							href={`/user/${document.creator.id}`}
							className='inline-flex h-12 items-center gap-2 rounded-full border border-border/50 bg-background/45 px-3 transition-colors hover:bg-background/70'>
							<Avatar className='size-7'>
								<AvatarImage
									src={creatorAvatar}
									alt={document.creator.nickname}
									className='object-cover'
								/>
								<AvatarFallback className='text-[11px] font-semibold'>
									{document.creator.nickname.slice(0, 1)}
								</AvatarFallback>
							</Avatar>
							<span>{document.creator.nickname}</span>
						</Link>
						<Badge
							variant='outline'
							className='inline-flex h-12 items-center rounded-full border border-border/50 bg-background/45 px-4 text-sm font-normal text-muted-foreground shadow-none'>
							{categoryLabel}
						</Badge>
						<div className='inline-flex h-12 items-center gap-2 rounded-full border border-border/50 bg-background/45 px-4 text-sm'>
							<CalendarClock className='size-3.5' />
							<span>{t('seo_document_updated_at')}</span>
							<span className='text-foreground/85'>
								{new Intl.DateTimeFormat(locale, {
									dateStyle: 'medium',
								}).format(
									new Date(document.update_time ?? document.create_time),
								)}
							</span>
						</div>
					</div>

					<div className='space-y-3'>
						<h1 className='break-words text-3xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl'>
							{document.title || t('document_no_title')}
						</h1>
						<p className='break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere] sm:text-base'>
							{document.description || t('document_no_description')}
						</p>
						<SeoDocumentAiSummaryPanel document={document} />
					</div>
				</div>

				<div className='mx-auto w-full max-w-[920px] space-y-6'>
					<div className='space-y-6'>
						{coverSrc ? (
							<ImageWithFallback
								src={coverSrc}
								alt={document.title}
								preview
								className='h-[220px] w-full object-cover object-center sm:h-[300px] rounded-xl'
								fallbackClassName='h-[220px] w-full sm:h-[300px]'
								fallbackSvgClassName='max-w-[220px] p-6'
							/>
						) : null}

						<Separator />

						<div className='mx-auto w-full max-w-[820px] overflow-x-hidden'>
							<TipTapMarkdownViewer
								content={
									markdown || document.description || t('document_no_md')
								}
								ownerId={document.creator.id}
							/>
							{document.category === DocumentCategory.FILE ||
								document.category === DocumentCategory.AUDIO ||
								(document.category === DocumentCategory.WEBSITE && (
									<div className='mt-6 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-sm text-muted-foreground'>
										{t('document_ai_tips')}
									</div>
								))}
						</div>
					</div>
				</div>

				<section className='mx-auto w-full max-w-[920px] space-y-5 border-t border-border/50 pt-6'>
					<div className='space-y-2'>
						<h2 className='text-2xl font-semibold tracking-tight'>
							{t('document_comments')}
						</h2>
						<p className='text-sm leading-6 text-muted-foreground'>
							{t('document_comments_description')}
						</p>
					</div>

					<div className='space-y-5'>
						<SeoDocumentCommentGate
							documentId={document.id}
							loginHref={`/login?redirect_to=${encodeURIComponent(`/document/${document.id}`)}`}
						/>
						<DocumentCommentsList
							document_id={document.id}
							initialData={initialComments}
							publicMode
						/>
					</div>
				</section>
			</div>
		);
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			notFound();
		}
		throw error;
	}
};

export default SeoDocumentDetailPage;
