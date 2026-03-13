import {
	SectionInfo as SectionInfoType,
	SectionSeoDetailRequest,
} from '@/generated';
import { serverRequest } from '@/lib/request-server';
import sectionApi from '@/api/section';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { utils } from '@kinda/utils';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	BookOpenText,
	CalendarClock,
	CalendarDays,
	Expand,
	Sparkles,
	Users,
	type LucideIcon,
} from 'lucide-react';
import SectionGraphSEO from '@/components/section/section-graph-seo';
import SectionCommentsList from '@/components/section/section-comments-list';
import SectionCommentForm from '@/components/section/section-comment-form';
import SectionDocumentsList from '@/components/section/section-documents-list';
import { SectionPodcastStatus } from '@/enums/section';
import AudioPlayer from '@/components/ui/audio-player';
import AudioStatusCard from '@/components/ui/audio-status-card';
import CustomMarkdown from '@/components/ui/custom-markdown';
import { replacePath } from '@/lib/utils';

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

const SeoMetricCard = ({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: LucideIcon;
	label: string;
	value: string | number;
	hint?: string;
}) => {
	return (
		<div className='rounded-2xl border border-border/60 bg-background/45 px-4 py-3 shadow-sm'>
			<div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
				<div className='flex size-7 items-center justify-center rounded-xl bg-muted/70 text-foreground'>
					<Icon className='size-3.5' />
				</div>
				<span>{label}</span>
			</div>
			<div className='mt-3 text-lg font-semibold tracking-tight sm:text-xl'>
				{value}
			</div>
			{hint ? (
				<p className='mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground'>
					{hint}
				</p>
			) : null}
		</div>
	);
};

export async function generateMetadata(props: {
	params: Params;
	searchParams: SearchParams;
}): Promise<Metadata | undefined> {
	// read route params
	const { uuid } = await props.params;

	// fetch data
	const [section_res, section_err] = await utils.to(
		getSectionDetail({ uuid: uuid }),
	);

	if (section_err) {
		throw new Error('Something is wrong while getting the section detail');
	}
	if (section_res) {
		return {
			title: section_res.title,
			description: section_res.description,
		};
	}
	return;
}

const SEOSectionDetail = async (props: {
	params: Params;
	searchParams: SearchParams;
}) => {
	const t = await getTranslations();
	const locale = await getLocale();
	const params = await props.params;
	const uuid = params.uuid;

	let markdown: string | null = null;
	let section: SectionInfoType | null = null;

	const getFileContent = async (
		file_path: string,
	): Promise<string | Blob | ArrayBuffer> => {
		const url = `${file_path}`;
		const res = await fetch(url);
		if (!res.ok) {
			const errorText = await res.text().catch(() => 'Unknown error');
			throw new Error(`Request failed with status ${res.status}: ${errorText}`);
		}
		const contentType = res.headers.get('Content-Type') || '';
		if (contentType.includes('application/json')) {
			return await res.json();
		}
		if (contentType.includes('text/')) {
			return await res.text();
		}
		if (
			contentType.includes('application/octet-stream') ||
			contentType.includes('image/') ||
			contentType.includes('audio/') ||
			contentType.includes('video/')
		) {
			return await res.blob(); // 可用作下载、预览等
		}
		// 默认用 ArrayBuffer 处理
		return await res.arrayBuffer();
	};

	const [section_res, section_err] = await utils.to(
		getSectionDetail({ uuid: uuid }),
	);

	if (section_err) {
		throw new Error('Something is wrong while getting the section detail');
	}

	if (section_res) {
		section = section_res;
	}

	if (section_res && section_res.md_file_name) {
		const [markdown_res, markdown_err] = await utils.to(
			getFileContent(section_res.md_file_name),
		);
		if (markdown_err) {
			throw new Error('Something is wrong while getting the markdown file');
		}
		markdown = markdown_res as string;
	}

	const sectionTitle = section?.title || t('section_title_empty');
	const sectionDescription =
		section?.description || t('section_description_empty');
	const updatedAt = formatSectionDate(section?.update_time, locale);
	const createdAt = formatSectionDate(section?.create_time, locale);
	const sectionCover =
		section?.cover && section.creator
			? replacePath(section.cover, section.creator.id)
			: null;
	const surfaceCardClassName =
		'gap-0 rounded-[26px] border border-border/60 bg-card/88 py-0 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur';

	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-6 overflow-x-hidden px-4 pb-10 pt-4 sm:px-6 sm:pb-12 lg:px-8 lg:pt-6'>
			<Card className={`relative overflow-hidden ${surfaceCardClassName}`}>
				<div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]' />
				<CardContent className='relative px-5 py-6 sm:px-7 sm:py-7'>
					<div className='space-y-5 sm:space-y-6'>
						{sectionCover ? (
							<div className='relative overflow-hidden rounded-[28px] border border-border/60 bg-background/50 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.7)]'>
								<img
									src={sectionCover}
									alt={sectionTitle}
									className='h-[180px] w-full object-cover object-top sm:h-[220px] xl:h-[260px]'
								/>
								<div className='absolute inset-0 bg-gradient-to-r from-black/28 via-black/6 to-black/22' />
							</div>
						) : null}

						<div className='flex flex-wrap items-center gap-2'>
							<div className='inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs text-muted-foreground'>
								<Sparkles className='size-3.5 text-emerald-500' />
								<span>{t('section_ai_tips')}</span>
							</div>
							{section?.labels?.map((label) => (
								<Badge
									key={label.id}
									variant='secondary'
									className='rounded-full bg-secondary/70 px-3 py-1 text-xs'>
									{label.name}
								</Badge>
							))}
						</div>

						<div className='space-y-3'>
							<h1 className='max-w-5xl break-words text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.08]'>
								{sectionTitle}
							</h1>
							<p className='max-w-4xl break-words text-sm leading-7 text-muted-foreground sm:text-base'>
								{sectionDescription}
							</p>
						</div>

						<div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
							<SeoMetricCard
								icon={BookOpenText}
								label={t('section_documents')}
								value={section?.documents_count ?? 0}
							/>
							<SeoMetricCard
								icon={Users}
								label={t('section_subscribers')}
								value={section?.subscribers_count ?? 0}
							/>
							<SeoMetricCard
								icon={CalendarClock}
								label={t('section_updated_at')}
								value={updatedAt}
							/>
							<SeoMetricCard
								icon={CalendarDays}
								label={t('section_info_created_at')}
								value={createdAt}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start'>
				<div className='min-w-0 space-y-6'>
					<Card className={surfaceCardClassName}>
						<CardContent className='px-5 py-6 sm:px-7 sm:py-7'>
							<div className='prose prose-zinc max-w-none overflow-x-hidden dark:prose-invert prose-headings:scroll-mt-24 prose-p:leading-8 [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_h4]:break-words [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
								<CustomMarkdown
									content={markdown ? markdown : t('section_no_md')}
								/>
							</div>
						</CardContent>
					</Card>

					{section?.id ? (
						<Card className={surfaceCardClassName}>
							<CardHeader className='gap-2 px-5 pt-5 pb-0 sm:px-7 sm:pt-6'>
								<CardTitle className='text-2xl tracking-tight'>
									{t('section_comments')}
								</CardTitle>
								<CardDescription className='text-sm leading-6'>
									{t('section_comments_description')}
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-5 px-5 pb-6 pt-5 sm:px-7 sm:pb-7'>
								<SectionCommentForm section_id={section.id} />
								<SectionCommentsList section_id={section.id} />
							</CardContent>
						</Card>
					) : null}
				</div>

				<div className='min-w-0 space-y-6 xl:sticky xl:top-24'>
					<Card className={`overflow-hidden ${surfaceCardClassName}`}>
						<CardHeader className='flex flex-row items-start justify-between gap-4 px-4 pt-4 pb-0 sm:px-5 sm:pt-5'>
							<div className='space-y-1'>
								<CardTitle>{t('section_graph')}</CardTitle>
								<CardDescription className='leading-6'>
									{t('section_graph_description')}
								</CardDescription>
							</div>
							<Dialog>
								<DialogTrigger asChild>
									<Button
										size='icon'
										variant='outline'
										className='size-10 shrink-0 rounded-2xl bg-background/70'>
										<Expand className='size-4 text-muted-foreground' />
									</Button>
								</DialogTrigger>
								<DialogContent className='flex h-[70vh] min-h-[420px] flex-col sm:h-[min(88vh,720px)] sm:min-h-[560px] sm:max-w-[min(1200px,92vw)]'>
									<DialogHeader>
										<DialogTitle>{t('section_graph')}</DialogTitle>
										<DialogDescription>
											{t('section_graph_description')}
										</DialogDescription>
									</DialogHeader>
									<div className='min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/60 sm:min-h-[420px]'>
										{section ? (
											<SectionGraphSEO section_id={section.id} />
										) : null}
									</div>
								</DialogContent>
							</Dialog>
						</CardHeader>
						<CardContent className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-4'>
							<div className='h-[260px] overflow-hidden rounded-[20px] border border-border/60 bg-background/40 sm:h-[320px] xl:h-[340px]'>
								{section ? <SectionGraphSEO section_id={section.id} /> : null}
							</div>
						</CardContent>
					</Card>

					<Card className={surfaceCardClassName}>
						<CardHeader className='gap-2 px-4 pt-4 pb-0 sm:px-5 sm:pt-5'>
							<CardTitle>{t('section_documents')}</CardTitle>
							<CardDescription className='leading-6'>
								{t('section_documents_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-4'>
							<div className='flex flex-col gap-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-auto xl:p-1 pt-0'>
								{section ? (
									<SectionDocumentsList section_id={section.id} />
								) : null}
							</div>
						</CardContent>
					</Card>

					{!section?.podcast_task ? (
						<AudioStatusCard
							badge={t('document_podcast_status_todo')}
							title={t('section_podcast_unset')}
							description={t('section_podcast_placeholder_description')}
							className={surfaceCardClassName}
						/>
					) : null}

					{section?.podcast_task?.status === SectionPodcastStatus.GENERATING ? (
						<AudioStatusCard
							badge={t('document_podcast_status_doing')}
							title={t('section_podcast_processing')}
							description={t('section_podcast_processing_description')}
							tone='default'
							actionLoading
							className={surfaceCardClassName}
						/>
					) : null}

					{section?.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
					section?.podcast_task?.podcast_file_name ? (
						<Card className={surfaceCardClassName}>
							<CardHeader className='gap-2 px-5 pt-5 pb-0 sm:px-6 sm:pt-6'>
								<CardTitle className='text-lg'>
									{t('document_category_audio')}
								</CardTitle>
								<CardDescription className='leading-6'>
									{sectionTitle}
								</CardDescription>
							</CardHeader>
							<CardContent className='px-5 pb-5 pt-5 sm:px-6 sm:pb-6'>
								<AudioPlayer
									src={section?.podcast_task?.podcast_file_name}
									cover={
										sectionCover ??
										'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
									}
									title={section.title ?? 'Unkown Title'}
									artist={'AI Generated'}
								/>
							</CardContent>
						</Card>
					) : null}

					{section?.podcast_task?.status === SectionPodcastStatus.FAILED ? (
						<AudioStatusCard
							badge={t('document_podcast_status_failed')}
							title={t('section_podcast_failed')}
							description={t('section_podcast_failed_description')}
							tone='danger'
							className={surfaceCardClassName}
						/>
					) : null}
				</div>
			</div>
		</div>
	);
};

export default SEOSectionDetail;
