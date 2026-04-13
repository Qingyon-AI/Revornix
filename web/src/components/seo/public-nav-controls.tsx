'use client';

import CompactNavControls from '@/components/app/compact-nav-controls';
import { RightSidebarTrigger } from '@/components/app/app-right-sidebar';

const PublicNavControls = () => {
	return (
		<div className='flex items-center gap-1.5'>
			<CompactNavControls />
			<div className='hidden size-8 items-center justify-center xl:flex'>
				<RightSidebarTrigger className='size-8 rounded-xl' />
			</div>
		</div>
	);
};

export default PublicNavControls;
