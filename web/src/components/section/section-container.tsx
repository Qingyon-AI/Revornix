'use client';

import { getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import SectionInfo from './section-info';
import SectionMarkdown from './section-markdown';

const SectionContainer = ({ id }: { id: string }) => {
	const { data: section, isFetching } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: Number(id) });
		},
	});
	return (
		<div className='px-5 pb-5 h-full w-full flex flex-row relative overflow-auto'>
			{section && (
				<div className='grid grid-cols-12 gap-5 w-full'>
					<div className='flex-1 h-full col-span-8 overflow-auto'>
						<SectionMarkdown id={id} />
					</div>
					<SectionInfo id={id} />
				</div>
			)}
		</div>
	);
};

export default SectionContainer;
