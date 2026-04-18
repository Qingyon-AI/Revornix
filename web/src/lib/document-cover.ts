import { replacePath } from '@/lib/utils';

type DocumentCoverSource = {
	cover?: string | null;
	creator_id?: number | null;
	creator?: {
		id?: number | null;
	} | null;
};

export const getDocumentCoverSrc = (document?: DocumentCoverSource | null) => {
	if (!document?.cover) {
		return null;
	}

	const ownerId = document.creator?.id ?? document.creator_id;
	if (ownerId == null) {
		return document.cover;
	}

	return replacePath(document.cover, ownerId);
};
