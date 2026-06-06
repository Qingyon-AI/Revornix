'use client';

import { Database, Hourglass, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { DocumentEmbeddingStatus } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import {
	cancelDocumentEmbedding,
	embeddingDocument,
	getDocumentDetail,
} from '@/service/document';

import { Button } from '../ui/button';
import SidebarTaskNode from '../ui/sidebar-task-node';

const DocumentEmbedding = ({
	document_id,
	canWriteDocument = false,
}: {
	document_id: number;
	canWriteDocument?: boolean;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id }),
	});

	const freshnessState = getDocumentFreshnessState(document);

	const mutateEmbeddingDocument = useMutation({
		mutationFn: () => embeddingDocument({ document_id }),
		onSuccess() {
			toast.success(t('ai_embedding_submit'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(error) {
			toast.error(error.message || t('something_wrong'));
		},
	});

	const mutateCancelEmbedding = useMutation({
		mutationFn: () => cancelDocumentEmbedding({ document_id }),
		onSuccess() {
			toast.success(t('cancel'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(error) {
			toast.error(error.message || t('something_wrong'));
		},
	});

	if (!document) {
		return null;
	}

	const renderAction = ({
		label,
		onClick,
		loading = false,
	}: {
		label: string;
		onClick: () => void;
		loading?: boolean;
	}) => {
		if (!canWriteDocument) {
			return undefined;
		}

		return (
			<Button
				variant='outline'
				className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
				onClick={onClick}
				disabled={loading}>
				{loading ? <Loader2 className='size-4 animate-spin' /> : null}
				{label}
			</Button>
		);
	};

	const startEmbeddingAction = renderAction({
		label: document.embedding_task ? t('ai_reembedding') : t('ai_embedding'),
		onClick: () => mutateEmbeddingDocument.mutate(),
		loading: mutateEmbeddingDocument.isPending,
	});

	const cancelEmbeddingAction = renderAction({
		label: t('cancel'),
		onClick: () => mutateCancelEmbedding.mutate(),
		loading: mutateCancelEmbedding.isPending,
	});

	if (!document.embedding_task) {
		return (
			<SidebarTaskNode
				icon={Database}
				status={t('document_embedding_status_todo')}
				title={t('document_embedding_status')}
				description={t('document_embedding_empty_description')}
				tone='warning'
				action={startEmbeddingAction}
			/>
		);
	}

	if (document.embedding_task.status === DocumentEmbeddingStatus.WAIT_TO) {
		return (
			<SidebarTaskNode
				icon={Hourglass}
				status={t('document_embedding_status_todo')}
				title={t('document_embedding_status')}
				description={t('document_embedding_wait_to_description')}
				tone='warning'
				action={cancelEmbeddingAction}
			/>
		);
	}

	if (document.embedding_task.status === DocumentEmbeddingStatus.Embedding) {
		return (
			<SidebarTaskNode
				icon={Loader2}
				iconClassName='animate-spin'
				status={t('document_embedding_status_doing')}
				title={t('document_embedding_status')}
				description={t('document_embedding_processing_description')}
				tone='default'
				action={cancelEmbeddingAction}
			/>
		);
	}

	if (document.embedding_task.status === DocumentEmbeddingStatus.SUCCESS) {
		return (
			<SidebarTaskNode
				icon={Database}
				status={
					freshnessState.embeddingStale
						? t('document_status_stale')
						: t('document_embedding_status_success')
				}
				title={t('document_embedding_status')}
				description={t('document_embedding_ready_description')}
				tone={freshnessState.embeddingStale ? 'warning' : 'success'}
				hint={
					freshnessState.embeddingStale
						? t('document_embedding_stale_warning')
						: undefined
				}
				action={startEmbeddingAction}
			/>
		);
	}

	if (
		document.embedding_task.status === DocumentEmbeddingStatus.FAILED ||
		document.embedding_task.status === DocumentEmbeddingStatus.CANCELLED
	) {
		return (
			<SidebarTaskNode
				icon={Database}
				status={
					document.embedding_task.status === DocumentEmbeddingStatus.CANCELLED
						? t('cancel')
						: t('document_embedding_status_failed')
				}
				title={t('document_embedding_status')}
				description={
					document.embedding_task.status === DocumentEmbeddingStatus.CANCELLED
						? t('document_embedding_empty_description')
						: t('document_embedding_failed_description')
				}
				tone={
					document.embedding_task.status === DocumentEmbeddingStatus.CANCELLED
						? 'warning'
						: 'danger'
				}
				action={startEmbeddingAction}
			/>
		);
	}

	return null;
};

export default DocumentEmbedding;
