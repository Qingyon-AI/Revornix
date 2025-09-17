'use client';

import SectionInfo from './section-info';
import SectionMarkdown from './section-markdown';

const SectionContainer = ({ id }: { id: number }) => {
	return (
		<div className='px-5 pb-5 h-full w-full flex flex-row relative overflow-auto'>
			<div className='grid grid-cols-12 gap-5 w-full'>
				<div className='flex-1 h-full col-span-8 overflow-auto'>
					<SectionMarkdown id={id} />
				</div>
				<SectionInfo id={id} />
			</div>
		</div>
	);
};

export default SectionContainer;
