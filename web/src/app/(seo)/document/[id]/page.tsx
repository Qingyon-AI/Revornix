import TipTapMarkdownViewer from '@/components/markdown/tiptap-markdown-viewer';
import JsonLd from '@/components/seo/json-ld';
import {
	SeoDocumentMetaSidebar,
	SeoDocumentSidebarBridge,
} from '@/components/seo/seo-document-meta-sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DocumentCategory, DocumentPodcastStatus } from '@/enums/document';
import {
	fetchPublicDocumentDetail,
	fetchRemoteTextContent,
	isSeoNotFoundError,
} from '@/lib/seo';
import { replacePath } from '@/lib/utils';
import { CalendarClock } from 'lucide-react';
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
		return await fetchRemoteTextContent(document.convert_task?.md_file_name);
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
		const coverSrc =
			document.cover && document.creator
				? replacePath(document.cover, document.creator.id)
				: undefined;

		return buildMetadata({
			title: formatMetaTitle(
				document.title || t('document_no_title'),
				t('seo_document_title_suffix'),
			),
			description: document.description || t('document_no_description'),
			path: `/document/${document.id}`,
			type: 'article',
			images: [coverSrc],
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
		const markdown = await getDocumentMarkdown(document);
		const categoryLabel = getCategoryLabel(document.category, t);
		const coverSrc =
			document.cover && document.creator
				? replacePath(document.cover, document.creator.id)
				: null;
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

		return (
			<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
				<JsonLd data={documentSchema} />
				<SeoDocumentSidebarBridge
					document={document}
					categoryLabel={categoryLabel}
					locale={locale}
					creatorAvatar={creatorAvatar}
					coverSrc={coverSrc}
					primaryAudioSrc={primaryAudioSrc}
					publicSections={publicSections}
				/>
				<div className='mx-auto w-full max-w-[920px] space-y-5'>
					<div className='flex flex-wrap items-center gap-3 text-sm text-muted-foreground'>
						<Link
							href={`/user/${document.creator.id}`}
							className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-2.5 py-1.5 transition-colors hover:bg-background/70'>
							<Avatar className='size-6'>
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
							className='rounded-full px-3 py-1.5 text-xs font-normal text-muted-foreground'>
							{categoryLabel}
						</Badge>
						<div className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-3 py-1.5 text-xs sm:text-sm'>
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
						<h1 className='break-words text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
							{document.title || t('document_no_title')}
						</h1>
						<p className='max-w-[820px] text-sm leading-7 text-muted-foreground sm:text-base'>
							{document.description || t('document_no_description')}
						</p>
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

						<div className='mx-auto w-full max-w-[820px] overflow-x-hidden'>
							<TipTapMarkdownViewer
								content={
									markdown || document.description || t('document_no_md')
								}
								ownerId={document.creator.id}
							/>
							<div className='mt-6 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-sm text-muted-foreground'>
								{t('document_ai_tips')}
							</div>
						</div>

						<div className='xl:hidden'>
							<SeoDocumentMetaSidebar
								document={document}
								categoryLabel={categoryLabel}
								locale={locale}
								creatorAvatar={creatorAvatar}
								coverSrc={coverSrc}
								primaryAudioSrc={primaryAudioSrc}
								publicSections={publicSections}
								className='space-y-5'
							/>
						</div>
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

export default SeoDocumentDetailPage;
