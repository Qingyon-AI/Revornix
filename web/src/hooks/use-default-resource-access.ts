'use client';

import { useQuery } from '@tanstack/react-query';

import { isModelSubscriptionLocked, isSubscriptionLocked } from '@/lib/subscription';
import { useUserContext } from '@/provider/user-provider';
import { getAiModel } from '@/service/ai';
import { getEngineDetail } from '@/service/engine';

export type DefaultResourceAccessState = {
	configured: boolean;
	loading: boolean;
	error: boolean;
	accessible: boolean;
	subscriptionLocked: boolean;
	requiredPlanLevel?: number | null;
};

const buildDefaultResourceAccessState = ({
	configured,
	loading,
	error,
	requiredPlanLevel,
	locked,
}: {
	configured: boolean;
	loading: boolean;
	error: boolean;
	requiredPlanLevel?: number | null;
	locked: boolean;
}): DefaultResourceAccessState => {
	return {
		configured,
		loading,
		error,
		accessible: configured && !loading && !error && !locked,
		subscriptionLocked: configured && !loading && !error && locked,
		requiredPlanLevel,
	};
};

export const useDefaultResourceAccess = () => {
	const { mainUserInfo, paySystemUserInfo } = useUserContext();

	const documentReaderModelQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'document_reader_model',
			mainUserInfo?.default_document_reader_model_id,
		],
		queryFn: () =>
			getAiModel({
				model_id: mainUserInfo!.default_document_reader_model_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_document_reader_model_id),
	});

	const revornixModelQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'revornix_model',
			mainUserInfo?.default_revornix_model_id,
		],
		queryFn: () =>
			getAiModel({
				model_id: mainUserInfo!.default_revornix_model_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_revornix_model_id),
	});

	const websiteParseEngineQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'website_parse_engine',
			mainUserInfo?.default_website_document_parse_user_engine_id,
		],
		queryFn: () =>
			getEngineDetail({
				engine_id: mainUserInfo!.default_website_document_parse_user_engine_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_website_document_parse_user_engine_id),
	});

	const fileParseEngineQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'file_parse_engine',
			mainUserInfo?.default_file_document_parse_user_engine_id,
		],
		queryFn: () =>
			getEngineDetail({
				engine_id: mainUserInfo!.default_file_document_parse_user_engine_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_file_document_parse_user_engine_id),
	});

	const podcastEngineQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'podcast_engine',
			mainUserInfo?.default_podcast_user_engine_id,
		],
		queryFn: () =>
			getEngineDetail({
				engine_id: mainUserInfo!.default_podcast_user_engine_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_podcast_user_engine_id),
	});

	const transcribeEngineQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'transcribe_engine',
			mainUserInfo?.default_audio_transcribe_engine_id,
		],
		queryFn: () =>
			getEngineDetail({
				engine_id: mainUserInfo!.default_audio_transcribe_engine_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_audio_transcribe_engine_id),
	});

	const imageGenerateEngineQuery = useQuery({
		queryKey: [
			'defaultResourceAccess',
			'image_generate_engine',
			mainUserInfo?.default_image_generate_engine_id,
		],
		queryFn: () =>
			getEngineDetail({
				engine_id: mainUserInfo!.default_image_generate_engine_id!,
			}),
		enabled: Boolean(mainUserInfo?.default_image_generate_engine_id),
	});

	const documentReaderModel = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_document_reader_model_id),
		loading: documentReaderModelQuery.isLoading,
		error: documentReaderModelQuery.isError,
		requiredPlanLevel: documentReaderModelQuery.data?.required_plan_level,
		locked: isModelSubscriptionLocked(
			documentReaderModelQuery.data?.required_plan_level,
			documentReaderModelQuery.data?.provider.creator.id,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const revornixModel = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_revornix_model_id),
		loading: revornixModelQuery.isLoading,
		error: revornixModelQuery.isError,
		requiredPlanLevel: revornixModelQuery.data?.required_plan_level,
		locked: isModelSubscriptionLocked(
			revornixModelQuery.data?.required_plan_level,
			revornixModelQuery.data?.provider.creator.id,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const websiteParseEngine = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_website_document_parse_user_engine_id),
		loading: websiteParseEngineQuery.isLoading,
		error: websiteParseEngineQuery.isError,
		requiredPlanLevel: websiteParseEngineQuery.data?.required_plan_level,
		locked: isSubscriptionLocked(
			websiteParseEngineQuery.data?.required_plan_level,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const fileParseEngine = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_file_document_parse_user_engine_id),
		loading: fileParseEngineQuery.isLoading,
		error: fileParseEngineQuery.isError,
		requiredPlanLevel: fileParseEngineQuery.data?.required_plan_level,
		locked: isSubscriptionLocked(
			fileParseEngineQuery.data?.required_plan_level,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const podcastEngine = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_podcast_user_engine_id),
		loading: podcastEngineQuery.isLoading,
		error: podcastEngineQuery.isError,
		requiredPlanLevel: podcastEngineQuery.data?.required_plan_level,
		locked: isSubscriptionLocked(
			podcastEngineQuery.data?.required_plan_level,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const transcribeEngine = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_audio_transcribe_engine_id),
		loading: transcribeEngineQuery.isLoading,
		error: transcribeEngineQuery.isError,
		requiredPlanLevel: transcribeEngineQuery.data?.required_plan_level,
		locked: isSubscriptionLocked(
			transcribeEngineQuery.data?.required_plan_level,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	const imageGenerateEngine = buildDefaultResourceAccessState({
		configured: Boolean(mainUserInfo?.default_image_generate_engine_id),
		loading: imageGenerateEngineQuery.isLoading,
		error: imageGenerateEngineQuery.isError,
		requiredPlanLevel: imageGenerateEngineQuery.data?.required_plan_level,
		locked: isSubscriptionLocked(
			imageGenerateEngineQuery.data?.required_plan_level,
			paySystemUserInfo,
			mainUserInfo,
		),
	});

	return {
		documentReaderModel,
		revornixModel,
		websiteParseEngine,
		fileParseEngine,
		podcastEngine,
		transcribeEngine,
		imageGenerateEngine,
	};
};
