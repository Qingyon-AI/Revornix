'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, Compass, FileText } from 'lucide-react';

import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import PublicDocumentCard from '@/components/seo/public-document-card';
import PublicSectionCard from '@/components/seo/public-section-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	getPublicSectionHref,
	type PublicDocumentPagination,
	type PublicSectionPagination,
} from '@/lib/seo';
import { publicRequest } from '@/lib/request-public';

type CommunityTab = 'sections' | 'documents';

const buildCommunityHref = ({
	tab,
	keyword,
	start,
}: {
	tab: CommunityTab;
	keyword?: string;
	start?: number;
}) => {
	const params = new URLSearchParams();
	if (tab !== 'sections') {
		params.set('tab', tab);
	}
	if (keyword) {
		params.set('q', keyword);
	}
	if (start !== undefined) {
		params.set('start', String(start));
	}
	const query = params.toString();
	return query ? `/community?${query}` : '/community';
};

const SeoCommunityBrowser = ({
	tab,
	keyword,
	initialSections,
	initialDocuments,
}: {
	tab: CommunityTab;
	keyword?: string;
	initialSections: PublicSectionPagination | null;
	initialDocuments: PublicDocumentPagination | null;
}) => {
	const t = useTranslations();
	const { ref: bottomRef, inView } = useInView({
		rootMargin: '320px 0px',
	});
	const [sections, setSections] = useState(initialSections);
	const [documents, setDocuments] = useState(initialDocuments);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	useEffect(() => {
		setSections(initialSections);
		setDocuments(initialDocuments);
		setIsLoadingMore(false);
	}, [initialSections, initialDocuments, tab, keyword]);

	const total = tab === 'documents' ? documents?.total ?? 0 : sections?.total ?? 0;
	const hasMore =
		tab === 'documents' ? documents?.has_more ?? false : sections?.has_more ?? false;
	const nextStart =
		tab === 'documents' ? documents?.next_start : sections?.next_start;

	useEffect(() => {
		const loadMore = async () => {
			if (!inView || isLoadingMore || !hasMore || nextStart == null) {
				return;
			}

			setIsLoadingMore(true);
			try {
				if (tab === 'sections') {
					const response = await publicRequest<PublicSectionPagination>(
						sectionApi.searchPublicSection,
						{
							data: {
								keyword,
								start: nextStart,
								limit: sections?.limit ?? 12,
								desc: true,
							},
						},
					);

					setSections((current) => {
						const currentElements = current?.elements ?? [];
						const merged = new Map(currentElements.map((item) => [item.id, item]));
						response.elements.forEach((item) => {
							merged.set(item.id, item);
						});
						return {
							...response,
							elements: Array.from(merged.values()),
						};
					});
					return;
				}

				const response = await publicRequest<PublicDocumentPagination>(
					documentApi.searchPublicDocument,
					{
						data: {
							keyword,
							start: nextStart,
							limit: documents?.limit ?? 12,
							desc: true,
						},
					},
				);

				setDocuments((current) => {
					const currentElements = current?.elements ?? [];
					const merged = new Map(currentElements.map((item) => [item.id, item]));
					response.elements.forEach((item) => {
						merged.set(item.id, item);
					});
					return {
						...response,
						elements: Array.from(merged.values()),
					};
				});
			} finally {
				setIsLoadingMore(false);
			}
		};

		void loadMore();
	}, [documents?.limit, hasMore, inView, isLoadingMore, keyword, nextStart, sections?.limit, tab]);

	return (
		<>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					{tab === 'documents' ? (
						<FileText className='size-4' />
					) : (
						<Compass className='size-4' />
					)}
					<span>
						{tab === 'documents'
							? t('seo_community_documents_result', { count: total })
							: t('seo_community_result', { count: total })}
					</span>
				</div>
				{keyword ? (
					<div className='text-sm text-muted-foreground'>“{keyword}”</div>
				) : null}
			</div>

			{tab === 'sections' && sections?.elements && sections.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					{sections.elements.map((section, index) => (
						<div
							key={`${section.id}-${section.publish_uuid ?? 'private'}`}
							ref={index === sections.elements.length - 1 ? bottomRef : undefined}>
							<PublicSectionCard section={section} />
						</div>
					))}
				</div>
			) : null}

			{tab === 'documents' && documents?.elements && documents.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
					{documents.elements.map((document, index) => (
						<div
							key={document.id}
							ref={index === documents.elements.length - 1 ? bottomRef : undefined}>
							<PublicDocumentCard document={document} />
						</div>
					))}
				</div>
			) : null}

			{((tab === 'sections' && (!sections?.elements || sections.elements.length === 0)) ||
				(tab === 'documents' &&
					(!documents?.elements || documents.elements.length === 0))) && (
				<Card className='rounded-[30px] border border-dashed border-border/70 bg-muted/20 shadow-none'>
					<CardContent className='flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
						<div className='flex size-14 items-center justify-center rounded-full border border-border/60 bg-background/75'>
							{tab === 'documents' ? (
								<FileText className='size-6 text-muted-foreground' />
							) : (
								<Compass className='size-6 text-muted-foreground' />
							)}
						</div>
						<div className='space-y-2'>
							<h2 className='text-xl font-semibold'>
								{tab === 'documents'
									? t('seo_community_documents_empty')
									: t('seo_community_empty')}
							</h2>
							<p className='max-w-lg text-sm leading-6 text-muted-foreground'>
								{tab === 'documents'
									? t('seo_community_documents_empty_description')
									: t('seo_community_empty_description')}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{isLoadingMore ? (
				<div className='flex justify-center text-sm text-muted-foreground'>
					Loading...
				</div>
			) : null}

			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				{hasMore && nextStart ? (
					<Link href={buildCommunityHref({ tab, keyword, start: nextStart })}>
						<Button className='rounded-2xl'>
							{t('seo_community_next')}
							<ArrowRight />
						</Button>
					</Link>
				) : null}
			</div>
		</>
	);
};

export default SeoCommunityBrowser;
