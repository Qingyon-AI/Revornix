// Shared SEO-page types and helpers. Transport wrappers used to live here
// (fetchPublic*); those moved into the matching service/*.ts files with the
// `xxxServer` suffix. Import directly from `@/service/...` for SSR fetches.

import {
	DocumentDetailResponse,
	InifiniteScrollPagnitionSectionInfo,
	InifiniteScrollPagnitionDocumentInfo,
	SchemasDocumentBaseSectionInfo,
	SectionInfo,
} from '@/generated';
import type { Label } from '@/generated/models/Label';

export type PublicSectionInfo = SectionInfo & {
	publish_uuid?: string | null;
};

export type PublicSectionPagination = Omit<
	InifiniteScrollPagnitionSectionInfo,
	'elements'
> & {
	elements: PublicSectionInfo[];
};

export type PublicDocumentSectionInfo = SchemasDocumentBaseSectionInfo & {
	publish_uuid?: string | null;
};

export type PublicDocumentDetail = Omit<DocumentDetailResponse, 'sections'> & {
	sections?: PublicDocumentSectionInfo[];
};

export type PublicDocumentInfo = InifiniteScrollPagnitionDocumentInfo['elements'][number];

export type PublicDocumentPagination = Omit<
	InifiniteScrollPagnitionDocumentInfo,
	'elements'
> & {
	elements: PublicDocumentInfo[];
};

export type PublicDocumentMarkdownContentRequest = {
	document_id?: number;
	url?: string;
	snapshot_id?: number;
};

export type PublicLabel = Label;

export const getPublicSectionHref = (section: {
	id?: number;
	publish_uuid?: string | null;
}) => {
	if (section.publish_uuid) {
		return `/section/${section.publish_uuid}`;
	}
	if (section.id !== undefined) {
		return `/section/detail/${section.id}`;
	}
	return '/community';
};

export const formatSeoDate = (
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

export const isSeoNotFoundError = (error: unknown) => {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const code = (error as { code?: number }).code;
	return code === 403 || code === 404;
};
