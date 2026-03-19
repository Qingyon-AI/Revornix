import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import userApi from '@/api/user';
import {
	DocumentDetailRequest,
	DocumentDetailResponse,
	InifiniteScrollPagnitionSectionInfo,
	InifiniteScrollPagnitionSectionDocumentInfo,
	SearchPublicSectionsRequest,
	SearchUserSectionsRequest,
	SchemasDocumentBaseSectionInfo,
	SectionDocumentRequest,
	SectionInfo,
	UserInfoRequest,
	UserPublicInfo,
} from '@/generated';
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

export const fetchPublicSectionDocuments = async (
	data: SectionDocumentRequest,
): Promise<InifiniteScrollPagnitionSectionDocumentInfo> => {
	return await serverRequest(sectionApi.searchSectionDocuments, {
		data,
	});
};

export const fetchRemoteTextContent = async (
	url: string | null | undefined,
): Promise<string | null> => {
	if (!url) {
		return null;
	}

	const response = await fetch(url, {
		cache: 'no-store',
	});
	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	const contentType = response.headers.get('Content-Type') || '';
	if (!contentType.includes('text/')) {
		return null;
	}

	return await response.text();
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
