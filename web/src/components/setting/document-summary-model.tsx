'use client';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { Model } from '@/generated';
import { useUserContext } from '@/provider/user-provider';
import {
	isModelSubscriptionLocked,
	shouldShowPlanLevelIndicator,
} from '@/lib/subscription';
import { searchAiModel } from '@/service/ai';
import { updateUserDefaultModel } from '@/service/user';
import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import SubscriptionPlanBadgeContent from './subscription-plan-badge-content';
import ResourceSelectEmptyState from './resource-select-empty-state';
import { Bot } from 'lucide-react';

export type ProviderMapProps =  {
	id: number;
	uuid: string;
	name: string;
	description: string | null;
	models: Model[];
}

const DocumentSummaryModel = () => {
	const t = useTranslations();
	const { mainUserInfo, paySystemUserInfo, refreshMainUserInfo } =
		useUserContext();
	const { data, isFetched } = useQuery({
		queryKey: ['getModels'],
		queryFn: async () => {
			return await searchAiModel({
				keyword: '',
			});
		},
	});

	const models = useMemo(() => {
		if (!data?.data) return [];
		const providerMap: Record<number, ProviderMapProps> = {};
		data.data.forEach((model) => {
			const provider = model.provider;
			const providerId = provider.id;
			// 如果该 provider 还未在 map 中，先初始化它
			if (!providerMap[providerId]) {
				providerMap[providerId] = {
					id: provider.id,
					uuid: provider.uuid,
					name: provider.name,
					description: provider.description,
					models: [], // 用来存储该 provider 下面的模型
				};
			}
			// 将当前模型加入到对应 provider 的 models 列表中
			providerMap[providerId].models.push(model);
		});
		return Object.values(providerMap);
	}, [data]);
	const handleUpdateDefaultDocumentReaderModel = async (model_id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultModel({
				default_document_reader_model_id: model_id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshMainUserInfo();
		toast.success(t('setting_default_document_read_model_update_successful'));
	};

	return (
		<div className='flex justify-end'>
			<Select
				value={
					mainUserInfo?.default_document_reader_model_id
						? String(mainUserInfo?.default_document_reader_model_id)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultDocumentReaderModel(Number(e));
				}}>
				<SelectTrigger className='min-w-[180px]'>
					<SelectValue placeholder={t('setting_model_select')} />
				</SelectTrigger>
				<SelectContent className='min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]'>
					{isFetched && models.length === 0 ? (
						<ResourceSelectEmptyState
							icon={Bot}
							title={t('setting_default_model_empty_title')}
							description={t('setting_default_model_empty_description')}
							actionLabel={t('setting_default_model_empty_action')}
							href='/setting/model'
						/>
					) : (
						<SelectGroup>
							{models &&
								models.map((provider, index) => (
									<div key={index}>
										<SelectLabel
											key={provider.id}
											className='text-muted-foreground text-xs'>
											{provider.name}
										</SelectLabel>
										{provider.models.map((model) => {
											const locked = isModelSubscriptionLocked(
												model.required_plan_level,
												model.provider.creator.id,
												paySystemUserInfo,
												mainUserInfo,
											);
											return (
												<SelectItem
													key={model.id}
													value={String(model.id)}
													disabled={locked}>
													<span className='inline-flex max-w-full items-center gap-2 pr-4'>
														<span className='max-w-[32rem] truncate'>
															{model.name}
														</span>
														{shouldShowPlanLevelIndicator(
															model.required_plan_level,
															mainUserInfo,
														) && (
															<Badge className='shrink-0 rounded-full border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-700 shadow-none dark:text-sky-200'>
																<SubscriptionPlanBadgeContent
																	requiredPlanLevel={model.required_plan_level}
																/>
															</Badge>
														)}
													</span>
												</SelectItem>
											);
										})}
									</div>
								))}
						</SelectGroup>
					)}
				</SelectContent>
			</Select>
		</div>
	);
};

export default DocumentSummaryModel;
