'use client';

import Link from 'next/link';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';

export type GraphNodeSource = {
	doc_id: number;
	doc_title?: string;
	chunk_id?: string;
};

export type GraphNodeWithSource = {
	id: string;
	label: string;
	sources?: GraphNodeSource[];
};

type NodeSourceDialogProps = {
	node: GraphNodeWithSource | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const NodeSourceDialog = ({
	node,
	open,
	onOpenChange,
}: NodeSourceDialogProps) => {
	const t = useTranslations();
	const sources = (node?.sources ?? []).filter(
		(source) => source.doc_id != null,
	);
	const uniqueSources = Array.from(
		new Map(sources.map((source) => [`${source.doc_id}`, source])).values(),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{t('graph_node_source_title')}</DialogTitle>
				</DialogHeader>
				{node && (
					<div className='space-y-2 text-sm text-muted-foreground'>
						<div>
							<span className='text-foreground font-medium'>
								{t('graph_node_source_entity')}:
							</span>{' '}
							{node.label}
						</div>
						<div>
							<div className='mb-1'>
								<span className='text-foreground font-medium'>
									{t('graph_node_source_sources')}:
								</span>{' '}
								{uniqueSources.length === 0 && t('graph_node_source_empty')}
							</div>
							{uniqueSources.length > 0 && (
								<div className='max-h-64 overflow-auto space-y-1'>
									{uniqueSources.map((source) => {
										const href = `/document/detail/${source.doc_id}`;
										return (
											<Link
												key={`${source.doc_id}`}
												href={href}
												className='block rounded-md border border-border p-2 hover:bg-muted transition-colors'
												onClick={() => onOpenChange(false)}>
												<div className='text-foreground font-medium text-xs'>
													{source.doc_title ||
														`${t('graph_node_source_doc_id')}: ${source.doc_id}`}
												</div>
											</Link>
										);
									})}
								</div>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default NodeSourceDialog;
