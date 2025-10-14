'use client';

import ModelProviderAddCard from '@/components/setting/model-provider-add-card';
import ModelProviderCard from '@/components/setting/model-provider-card';
import { Skeleton } from '@/components/ui/skeleton';
import { searchAiModelProvider } from '@/service/ai';
import { useQuery } from '@tanstack/react-query';

const ModelSettingPage = () => {
	const {
		data: modelProviders,
		isFetching,
		isRefetching,
		error,
	} = useQuery({
		queryKey: ['getModelProviders'],
		queryFn: () =>
			searchAiModelProvider({
				keyword: '',
			}),
	});

	return (
		<>
			<div className='px-5 pb-5 w-full h-full'>
				{isFetching && !isRefetching && <Skeleton className='w-full h-full' />}
				{modelProviders && modelProviders.data && (
					<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
						{modelProviders.data.map((modelProvider, index) => (
							<ModelProviderCard key={index} modelProvider={modelProvider} />
						))}
						<ModelProviderAddCard />
					</div>
				)}
			</div>
		</>
	);
};

export default ModelSettingPage;
