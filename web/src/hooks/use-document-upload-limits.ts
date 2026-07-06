'use client';

import { useQuery } from '@tanstack/react-query';

import { useUserContext } from '@/provider/user-provider';
import { getDocumentUploadLimits } from '@/service/file-system';

export type DocumentUploadLimitsState = {
	// Current user's per-file document upload cap in bytes, resolved server-side.
	// `undefined` while loading — callers should skip the client-side pre-check
	// until it is known (the API enforces the real limit regardless).
	limitBytes?: number;
	// Whether a larger limit is reachable by upgrading (user is below the top tier).
	canUpgrade: boolean;
	loading: boolean;
};

// Reads the current user's document upload limit from the API so the client-side
// pre-check always matches the backend config (no per-tier values duplicated on
// the frontend).
export const useDocumentUploadLimits = (): DocumentUploadLimitsState => {
	const { mainUserInfo } = useUserContext();

	const { data, isLoading } = useQuery({
		queryKey: ['documentUploadLimits', mainUserInfo?.id],
		queryFn: getDocumentUploadLimits,
		enabled: Boolean(mainUserInfo?.id),
		staleTime: 5 * 60 * 1000,
	});

	return {
		limitBytes: data?.document_max_upload_bytes,
		canUpgrade: data?.can_upgrade ?? false,
		loading: isLoading,
	};
};
