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

export type ProviderMapProps =  {
	id: number;
	uuid: string;
	name: string;
	description: string | null;
	api_key: string | null;
	api_url: string | null;
	models: Model[];
}

const DocumentSummaryModel = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
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
					uuid: provider.uuid,
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
				uuid: model.uuid,
				name: model.name,
				description: model.description,
				provider: providerMap[providerId],
			});
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
		<>
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

export default DocumentSummaryModel;
