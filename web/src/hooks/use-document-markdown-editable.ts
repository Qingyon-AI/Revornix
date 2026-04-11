'use client';

import { useQuery } from '@tanstack/react-query';

import { UserDocumentAuthority } from '@/enums/document';
import { useUserContext } from '@/provider/user-provider';
import { getMineDocumentAuthority } from '@/service/document';

const useDocumentMarkdownEditable = ({
	documentId,
	ownerId,
}: {
	documentId: number;
	ownerId?: number;
}) => {
	const { mainUserInfo } = useUserContext();
	const isCreator = ownerId != null && ownerId === mainUserInfo?.id;

	const { data } = useQuery({
		queryKey: ['getMineDocumentAuthority', documentId, mainUserInfo?.id],
		queryFn: () => getMineDocumentAuthority({ document_id: documentId }),
		enabled:
			Boolean(mainUserInfo?.id) && Boolean(documentId) && !isCreator,
		retry: false,
	});

	const canEditMarkdown =
		isCreator ||
		data?.authority === UserDocumentAuthority.FULL_ACCESS ||
		data?.authority === UserDocumentAuthority.READ_AND_WRITE;

	return {
		canEditMarkdown,
	};
};

export default useDocumentMarkdownEditable;
