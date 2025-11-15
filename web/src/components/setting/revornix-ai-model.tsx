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
import { searchAiModel } from '@/service/ai';
import { updateUserDefaultModel } from '@/service/user';
import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { toast } from 'sonner';

interface ProviderMapProps {
	id: number;
	name: string;
	description: string | null;
	api_key: string;
	api_url: string;
	models: Model[];
}

const RevornixAIModel = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const { data } = useQuery({
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
					name: provider.name,
					description: provider.description,
					api_key: provider.api_key,
					api_url: provider.api_url,
					models: [], // 用来存储该 provider 下面的模型
				};
			}
			// 将当前模型加入到对应 provider 的 models 列表中
			providerMap[providerId].models.push({
				id: model.id,
				name: model.name,
				description: model.description,
				api_key: model.api_key,
				api_url: model.api_url,
				provider: providerMap[providerId],
			});
		});
		return Object.values(providerMap);
	}, [data]);

	const handleUpdateDefaultRevornixAIModel = async (model_id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultModel({
				default_revornix_model_id: model_id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(t('setting_revornix_model_update_successful'));
	};

	return (
		<>
			<Select
				value={
					userInfo?.default_revornix_model_id
						? String(userInfo?.default_revornix_model_id)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultRevornixAIModel(Number(e));
				}}>
				<SelectTrigger className='min-w-[180px]'>
					<SelectValue placeholder={t('setting_model_select')} />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{models &&
							models.map((provider, index) => (
								<div key={index}>
									<SelectLabel
										key={provider.id}
										className='text-muted-foreground text-xs'>
										{provider.name}
									</SelectLabel>
									{provider.models.map((model) => (
										<SelectItem key={model.id} value={String(model.id)}>
											{model.name}
										</SelectItem>
									))}
								</div>
							))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</>
	);
};

export default RevornixAIModel;
