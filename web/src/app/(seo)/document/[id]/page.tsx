import AudioPlayer from '@/components/ui/audio-player';
import CustomMarkdown from '@/components/ui/custom-markdown';
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
import { DocumentCategory, DocumentPodcastStatus } from '@/enums/document';
import {
	fetchPublicDocumentDetail,
	fetchRemoteTextContent,
	formatSeoDate,
	getPublicSectionHref,
	isSeoNotFoundError,
} from '@/lib/seo';
import { replacePath } from '@/lib/utils';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
	ArrowRight,
	BookText,
	CalendarClock,
	CalendarDays,
	FileDown,
	Globe2,
	Headphones,
	Users,
} from 'lucide-react';

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
		return {
			title: `${document.title || t('document_no_title')} | ${t('seo_document_title_suffix')}`,
			description: document.description || t('document_no_description'),
		};
	} catch (error) {
		if (isSeoNotFoundError(error)) {
			return {
				title: t('seo_document_title_suffix'),
				description: t('document_no_description'),
			};
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

		const surfaceCardClassName =
			'gap-0 rounded-[26px] border border-border/60 bg-card/88 py-0 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur';

		return (
			<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
				<Card
					className={`relative overflow-hidden rounded-[26px] ${surfaceCardClassName}`}>
					<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]' />
					<CardContent className='grid gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.35fr)_340px] lg:px-10'>
						<div className='space-y-5'>
							<div className='flex flex-wrap items-center gap-2'>
								<Badge
									variant='secondary'
									className='rounded-full bg-background/70 px-3 py-1 text-xs'>
									{categoryLabel}
								</Badge>
							</div>

							<div className='space-y-3'>
								<h1 className='break-words text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
									{document.title || t('document_no_title')}
								</h1>
								<p className='max-w-4xl text-sm leading-7 text-muted-foreground sm:text-base'>
									{document.description || t('document_no_description')}
								</p>
							</div>

							<Link
								href={`/user/${document.creator.id}`}
								className='inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/65 px-3 py-2 transition-colors hover:bg-background/90'>
								<Avatar className='size-8'>
									<AvatarImage
										src={creatorAvatar}
										alt={document.creator.nickname}
										className='object-cover'
									/>
									<AvatarFallback>
										{document.creator.nickname.slice(0, 1)}
									</AvatarFallback>
								</Avatar>
								<div className='text-left'>
									<div className='text-xs text-muted-foreground'>
										{t('seo_document_creator')}
									</div>
									<div className='text-sm text-foreground'>
										{document.creator.nickname}
									</div>
								</div>
							</Link>
						</div>

						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
							<div className='rounded-[24px] border border-border/60 bg-background/65 px-4 py-4 backdrop-blur h-fit'>
								<div className='flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground'>
									<CalendarClock className='size-3.5' />
									<span>{t('seo_document_updated_at')}</span>
								</div>
								<div className='mt-2 text-lg font-semibold'>
									{formatSeoDate(document.update_time, locale)}
								</div>
							</div>
							<div className='rounded-[24px] border border-border/60 bg-background/65 px-4 py-4 backdrop-blur h-fit'>
								<div className='flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground'>
									<CalendarDays className='size-3.5' />
									<span>{t('seo_document_created_at')}</span>
								</div>
								<div className='mt-2 text-lg font-semibold'>
									{formatSeoDate(document.create_time, locale)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start'>
					<div className='space-y-6'>
						{coverSrc ? (
							<Card className='overflow-hidden rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] py-0'>
								<CardContent className='p-0'>
									<img
										src={coverSrc}
										alt={document.title}
										className='h-[220px] w-full object-cover object-top sm:h-[300px]'
									/>
								</CardContent>
							</Card>
						) : null}

						<Card className='rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]'>
							<CardHeader className='gap-2 px-5 pt-5 pb-0 sm:px-6 sm:pt-6'>
								<CardTitle className='text-2xl tracking-tight'>
									{t('seo_document_content')}
								</CardTitle>
								<CardDescription className='leading-6'>
									{t('seo_document_content_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='px-5 pb-6 pt-5 sm:px-6 sm:pb-7'>
								<div className='prose prose-zinc max-w-none dark:prose-invert prose-headings:break-words prose-p:leading-8 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
									<CustomMarkdown
										content={
											markdown || document.description || t('document_no_md')
										}
									/>
								</div>
								<div className='mt-6 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-sm text-muted-foreground'>
									{t('document_ai_tips')}
								</div>
							</CardContent>
						</Card>
					</div>

					<div className='space-y-5 xl:sticky xl:top-24'>
						<Card className='rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]'>
							<CardHeader className='gap-2 px-5 pb-0'>
								<CardTitle>{t('seo_document_source')}</CardTitle>
								<CardDescription className='leading-6'>
									{document.from_plat}
								</CardDescription>
							</CardHeader>
							<CardContent className='flex flex-col gap-5'>
								{document.website_info?.url ? (
									<Link href={document.website_info.url} target='_blank'>
										<Button className='w-full rounded-2xl'>
											<Globe2 />
											{t('seo_document_open_source')}
										</Button>
									</Link>
								) : null}
								{document.file_info?.file_name ? (
									<Link href={document.file_info.file_name} target='_blank'>
										<Button variant='outline' className='w-full rounded-2xl'>
											<FileDown />
											{t('seo_document_download_file')}
										</Button>
									</Link>
								) : null}
								{primaryAudioSrc ? (
									<div className='rounded-[24px] border border-border/60 bg-background/55 p-4'>
										<div className='mb-3 flex items-center gap-2 text-sm font-medium'>
											<Headphones className='size-4' />
											<span>{t('seo_document_audio')}</span>
										</div>
										<AudioPlayer
											src={primaryAudioSrc}
											title={document.title}
											artist={document.creator.nickname}
											cover={coverSrc ?? undefined}
											variant='compact'
										/>
									</div>
								) : null}
							</CardContent>
						</Card>

						<Card className='rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]'>
							<CardHeader className='gap-2 px-5 pb-0'>
								<CardTitle>{t('seo_document_related_sections')}</CardTitle>
								<CardDescription className='leading-6'>
									{t('seo_document_related_sections_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-3 px-5'>
								{publicSections.length > 0 ? (
									publicSections.map((section) => (
										<Link
											key={`${section.id}-${section.publish_uuid ?? 'private'}`}
											href={getPublicSectionHref(section)}
											className='flex items-center justify-between rounded-[22px] border border-border/60 bg-background/55 px-4 py-3 transition-colors hover:bg-background/90'>
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
									<div className='rounded-[22px] border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground'>
										{t('seo_document_related_sections_empty')}
									</div>
								)}
							</CardContent>
						</Card>

						<div className='flex flex-col gap-5'>
							<Link href={`/user/${document.creator.id}`}>
								<Button
									variant='outline'
									className='rounded-2xl w-full flex flex-row justify-between items-center'>
									{t('seo_document_related_creator')}
									<Users />
								</Button>
							</Link>
							<Link href='/community'>
								<Button
									variant='outline'
									className='rounded-2xl w-full flex flex-row justify-between items-center'>
									{t('seo_document_back_to_community')}
									<BookText />
								</Button>
							</Link>
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
