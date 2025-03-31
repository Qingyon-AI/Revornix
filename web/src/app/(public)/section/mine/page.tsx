import MineSectionContainer from '@/components/section/mine-section-container';
import { getQueryClient } from '@/lib/get-query-client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const MineSectionPage = async (props: { searchParams: SearchParams }) => {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<MineSectionContainer
				label_id={Number(searchParams.label_id) as number | undefined}
			/>
		</HydrationBoundary>
	);
};

export default MineSectionPage;
