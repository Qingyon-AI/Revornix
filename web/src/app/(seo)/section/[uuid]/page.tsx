import {
	SectionDocumentInfo,
	SectionInfo as SectionInfoType,
	SectionSeoDetailRequest,
} from '@/generated';
import { serverRequest } from '@/lib/request-server';
import sectionApi from '@/api/section';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { utils } from '@kinda/utils';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Expand } from 'lucide-react';
import SectionGraphSEO from '@/components/section/section-graph-seo';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import SectionInfo from '@/components/section/section-info';
import SectionDocumentCard from '@/components/section/section-document-card';
import SectionCommentsList from '@/components/section/section-comments-list';
import SectionCommentForm from '@/components/section/section-comment-form';
import { Separator } from '@/components/ui/separator';
import { searchSectionDocuments } from '@/service/section';
import SectionDocumentsList from '@/components/section/section-documents-list';
import { SectionPodcastStatus } from '@/enums/section';
import AudioPlayer from '@/components/ui/audio-player';

type Params = Promise<{ uuid: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getSectionDetail = async (
	data: SectionSeoDetailRequest
): Promise<SectionInfoType> => {
	return await serverRequest(sectionApi.getSEOSectionDetail, {
		data,
	});
};

export async function generateMetadata(props: {
	params: Params;
	searchParams: SearchParams;
}): Promise<Metadata | undefined> {
	// read route params
	const { uuid } = await props.params;

	// fetch data
	const [section_res, section_err] = await utils.to(
		getSectionDetail({ uuid: uuid })
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
	const params = await props.params;
	const uuid = params.uuid;

	let markdown = null;
	let section = null;

	const getFileContent = async (
		file_path: string
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
		getSectionDetail({ uuid: uuid })
	);

	if (section_err) {
		throw new Error('Something is wrong while getting the section detail');
	}

	if (section_res && section_res.md_file_name) {
		section = section_res;
		const [markdown_res, markdown_err] = await utils.to(
			getFileContent(section_res.md_file_name)
		);
		if (markdown_err) {
			throw new Error('Something is wrong while getting the markdown file');
		}
		markdown = markdown_res as string;
	}

	return (
		<div className='px-5 p-5 w-full grid grid-cols-12 gap-5 relative h-[calc(100vh-theme(spacing.16))]'>
			<div className='col-span-3 py-0 h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 pb-5 flex-1 relative shadow-none overflow-auto'>
					<div>{section && <SectionInfo id={Number(section.id)} />}</div>
				</Card>
				<Card className='py-0 flex-1 relative shadow-none'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='!max-w-[80vw] h-[80vh] flex flex-col'>
							<DialogHeader>
								<DialogTitle>{t('section_graph')}</DialogTitle>
								<DialogDescription>
									{t('section_graph_description')}
								</DialogDescription>
							</DialogHeader>
							<div className='flex-1'>
								{section && <SectionGraphSEO section_id={section.id} />}
							</div>
						</DialogContent>
					</Dialog>
					{section && <SectionGraphSEO section_id={section.id} />}
				</Card>
			</div>
			<div className='col-span-6 h-full relative min-h-0 overflow-auto'>
				<div className='prose dark:prose-invert mx-auto mb-5'>
					<Alert className='bg-blue-500/10 dark:bg-blue-600/20 text-blue-500 dark:text-blue-400 border-blue-400/50 dark:border-blue-600/60 mb-5'>
						<AlertTitle>{t('section_ai_tips')}</AlertTitle>
					</Alert>
					<Markdown
						components={{}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{markdown}
					</Markdown>
				</div>
				<div className='max-w-prose mx-auto'>
					<Separator className='mb-5' />
					{section?.id && (
						<>
							<h1 className='font-bold text-3xl mb-5'>
								{t('section_comments')}
							</h1>
							<SectionCommentForm section_id={section.id} />
							<SectionCommentsList section_id={section.id} />
						</>
					)}
				</div>
			</div>
			<div className='col-span-3 py-0 h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='relative shadow-none h-full flex flex-col !gap-0'>
					<CardHeader className='mb-5'>
						<CardTitle>{t('section_documents')}</CardTitle>
						<CardDescription>
							{t('section_documents_description')}
						</CardDescription>
					</CardHeader>
					<CardContent className='flex-1 overflow-auto flex flex-col gap-5'>
						{section && <SectionDocumentsList section_id={section.id} />}
					</CardContent>
				</Card>
				<Card className='p-5 relative shadow-none'>
					{!section?.podcast_task && (
						<Alert className='bg-destructive/10 dark:bg-destructive/20 flex flex-row items-center'>
							<AlertDescription className='flex flex-row items-center'>
								<span className='inline-flex'>
									{t('section_podcast_unset')}
								</span>
							</AlertDescription>
						</Alert>
					)}
					{section?.podcast_task && (
						<>
							{section?.podcast_task?.status ===
								SectionPodcastStatus.GENERATING && (
								<div className='text-center text-muted-foreground text-xs p-3'>
									{t('section_podcast_processing')}
								</div>
							)}
							{section?.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
								section?.podcast_task?.podcast_file_name && (
									<AudioPlayer
										src={section?.podcast_task?.podcast_file_name}
										cover={
											section.cover ??
											'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
										}
										title={section.title ?? 'Unkown Title'}
										artist={'AI Generated'}
									/>
								)}
							{section?.podcast_task?.status ===
								SectionPodcastStatus.FAILED && (
								<div className='text-center text-muted-foreground text-xs p-3'>
									{t('section_podcast_failed')}
								</div>
							)}
						</>
					)}
				</Card>
			</div>
		</div>
	);
};

export default SEOSectionDetail;
