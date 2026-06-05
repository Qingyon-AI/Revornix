'use client';

import { useMemo } from 'react';
import { CheckCircle2, ListTodo, Sparkles, type LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { DocumentTranscribeStatus } from '@/enums/document';
import {
	getDocumentDetail,
	getDocumentMarkdownContent,
} from '@/service/document';
import {
	createMeetingInsights,
	normalizeSpeakerMap,
	parseMeetingTranscript,
} from '@/lib/meeting-transcript';
import SidebarTaskNode from '../ui/sidebar-task-node';

type AudioInfoWithMeetingMeta = {
	speaker_map?: unknown;
};

const InsightList = ({
	icon: Icon,
	title,
	items,
	empty,
}: {
	icon: LucideIcon;
	title: string;
	items: string[];
	empty: string;
}) => {
	return (
		<div className='space-y-1.5'>
			<div className='flex items-center gap-1.5 text-xs font-semibold text-foreground'>
				<Icon className='size-3.5 text-muted-foreground' />
				<span>{title}</span>
			</div>
			{items.length > 0 ? (
				<ul className='space-y-1 text-xs leading-5 text-muted-foreground'>
					{items.map((item, index) => (
						<li key={`${title}-${index}`} className='line-clamp-2'>
							{item}
						</li>
					))}
				</ul>
			) : (
				<p className='text-xs leading-5 text-muted-foreground'>{empty}</p>
			)}
		</div>
	);
};

const DocumentMeetingInsights = ({
	document_id,
}: {
	document_id: number;
}) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id }),
	});
	const canLoadMarkdown = Boolean(
		document?.audio_info &&
			document.transcribe_task?.status === DocumentTranscribeStatus.SUCCESS &&
			document.transcribe_task?.md_file_name,
	);
	const { data: markdown } = useQuery({
		queryKey: ['getDocumentMarkdownContent', document_id, 'meeting-insights'],
		queryFn: () => getDocumentMarkdownContent({ document_id }),
		enabled: canLoadMarkdown,
	});
	const speakerMap = useMemo(
		() =>
			normalizeSpeakerMap(
				(document?.audio_info as AudioInfoWithMeetingMeta | undefined)
					?.speaker_map,
			),
		[document?.audio_info],
	);
	const entries = useMemo(
		() =>
			markdown ? parseMeetingTranscript(markdown, speakerMap) : [],
		[markdown, speakerMap],
	);
	const insights = useMemo(() => createMeetingInsights(entries), [entries]);

	if (entries.length === 0) {
		return null;
	}

	return (
		<SidebarTaskNode
			icon={Sparkles}
			status='会议模式'
			title='会议洞察'
			description={insights.overview[0]}
			tone='default'
			result={
				<div className='space-y-3 rounded-md border border-border/45 bg-background/45 p-3'>
					<InsightList
						icon={Sparkles}
						title='概要'
						items={insights.overview.slice(1, 3)}
						empty='暂无概要'
					/>
					<InsightList
						icon={ListTodo}
						title='待办'
						items={insights.actionItems.map((entry) => entry.text)}
						empty='暂无明确待办'
					/>
					<InsightList
						icon={CheckCircle2}
						title='决定'
						items={insights.decisions.map((entry) => entry.text)}
						empty='暂无明确决定'
					/>
				</div>
			}
		/>
	);
};

export default DocumentMeetingInsights;
