import { SectionDetailRequest, SectionInfo } from '@/generated';
import { serverRequest } from '@/lib/request-server';
import sectionApi from '@/api/section';
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { Card, CardContent } from '@/components/ui/card';
import { utils } from '@kinda/utils';
import { Metadata } from 'next';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const getSectionDetail = async (
	data: SectionDetailRequest
): Promise<SectionInfo> => {
	return await serverRequest(sectionApi.getSectionDetail, {
		data,
	});
};

export async function generateMetadata(props: {
	params: Params;
	searchParams: SearchParams;
}): Promise<Metadata | undefined> {
	// read route params
	const { id } = await props.params;

	// fetch data
	const [section_res, section_err] = await utils.to(
		getSectionDetail({ section_id: Number(id) })
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
	const params = await props.params;
	const id = params.id;

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
		getSectionDetail({ section_id: Number(id) })
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
		<div className='px-5 py-5'>
			{section && (
				<div className='prose dark:prose-invert mx-auto'>
					<div className='font-bold text-5xl mb-5'>{section.title}</div>
					<div className='flex flex-row gap-3 items-center text-muted-foreground text-xs mb-5'>
						<img
							src={section.creator.avatar}
							alt='avatar'
							className='rounded-full size-6 object-cover'
						/>
						<div className='flex flex-col gap-1'>
							<div>{section.creator.nickname}</div>
							<div>
								Last updated at{' '}
								{format(section.update_time as Date, 'yyyy-MM-dd HH:mm')}
							</div>
						</div>
					</div>
					<Card>
						<CardContent className='text-sm text-primary/80'>
							{section.description}
						</CardContent>
					</Card>
					<Markdown
						components={{}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{markdown}
					</Markdown>
				</div>
			)}
		</div>
	);
};

export default SEOSectionDetail;
