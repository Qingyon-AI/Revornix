'use client';

import HotSearchGrid from '@/components/hot-search/hot-search-grid';

const HotSearch = () => {
	return (
		<div className='h-full overflow-auto px-5 pb-5 pt-5'>
			<HotSearchGrid className='md:grid-cols-3 xl:grid-cols-4' />
		</div>
	);
};

export default HotSearch;
