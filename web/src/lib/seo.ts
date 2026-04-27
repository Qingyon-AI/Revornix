import documentApi from '@/api/document';
import graphApi from '@/api/graph';
import sectionApi from '@/api/section';
import userApi from '@/api/user';
import {
	DocumentGraphRequest,
	DocumentDetailRequest,
	DocumentDetailResponse,
	GraphResponse,
	InifiniteScrollPagnitionSectionInfo,
	InifiniteScrollPagnitionSectionDocumentInfo,
	InifiniteScrollPagnitionDocumentInfo,
	SearchPublicSectionsRequest,
	SearchUserSectionsRequest,
	SchemasDocumentBaseSectionInfo,
	SectionDocumentRequest,
	SectionGraphRequest,
	SectionInfo,
	UserInfoRequest,
	UserPublicInfo,
} from '@/generated';
import type {
	InifiniteScrollPagnitionSectionCommentInfo,
	SectionCommentSearchRequest,
} from '@/service/section';
import type {
	InifiniteScrollPagnitionDocumentCommentInfo,
	DocumentCommentSearchRequest,
} from '@/service/document';
import { serverRequest } from '@/lib/request-server';

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

export type PublicDocumentPagination = InifiniteScrollPagnitionDocumentInfo;
export type PublicDocumentMarkdownContentRequest = {
	document_id?: number;
	url?: string;
	snapshot_id?: number;
};

export const getPublicSectionHref = (section: {
	publish_uuid?: string | null;
}) => {
	if (!section.publish_uuid) {
		return '/community';
	}
	return `/section/${section.publish_uuid}`;
};

export const fetchPublicSections = async (
	data: SearchPublicSectionsRequest,
): Promise<PublicSectionPagination> => {
	return await serverRequest(sectionApi.searchPublicSection, {
		data,
	});
};

export const fetchPublicUserDetail = async (
	data: UserInfoRequest,
): Promise<UserPublicInfo> => {
	return await serverRequest(userApi.userInfo, {
		data,
	});
};

export const fetchPublicUserSections = async (
	data: SearchUserSectionsRequest,
): Promise<PublicSectionPagination> => {
	return await serverRequest(sectionApi.searchUserSection, {
		data,
	});
};

export const fetchPublicDocumentDetail = async (
	data: DocumentDetailRequest,
): Promise<PublicDocumentDetail> => {
	return await serverRequest(documentApi.documentDetail, {
		data,
	});
};

export const fetchPublicDocuments = async (data: {
	start?: number;
	limit: number;
	keyword?: string;
	creator_id?: number;
	label_ids?: number[];
	desc?: boolean;
}): Promise<PublicDocumentPagination> => {
	return await serverRequest(documentApi.searchPublicDocument, {
		data,
	});
};

export const fetchPublicSectionDocuments = async (
	data: SectionDocumentRequest,
): Promise<InifiniteScrollPagnitionSectionDocumentInfo> => {
	return await serverRequest(sectionApi.searchSectionDocuments, {
		data,
	});
};

export const fetchPublicSectionComments = async (
	data: SectionCommentSearchRequest,
): Promise<InifiniteScrollPagnitionSectionCommentInfo> => {
	return await serverRequest(sectionApi.searchComment, {
		data,
	});
};

export const fetchPublicDocumentComments = async (
	data: DocumentCommentSearchRequest,
): Promise<InifiniteScrollPagnitionDocumentCommentInfo> => {
	return await serverRequest(documentApi.searchComment, {
		data,
	});
};

export const fetchPublicSectionGraph = async (
	data: SectionGraphRequest,
): Promise<GraphResponse> => {
	return await serverRequest(graphApi.searchSectionGraph, {
		data,
	});
};

export const fetchPublicDocumentGraph = async (
	data: DocumentGraphRequest,
): Promise<GraphResponse> => {
	return await serverRequest(graphApi.searchDocumentGraph, {
		data,
	});
};

export const fetchPublicDocumentMarkdownContent = async (
	data: PublicDocumentMarkdownContentRequest,
): Promise<string> => {
	return await serverRequest(documentApi.getDocumentMarkdownContent, {
		data,
	});
};

export const fetchPublicSectionMarkdownContent = async (data: {
	uuid: string;
}): Promise<string> => {
	return await serverRequest(sectionApi.getSEOSectionMarkdownContent, {
		data,
	});
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
