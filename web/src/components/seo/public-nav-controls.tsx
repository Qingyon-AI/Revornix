'use client';

import CompactNavControls from '@/components/app/compact-nav-controls';
import { RightSidebarTrigger } from '@/components/app/app-right-sidebar';

const PublicNavControls = () => {
	return (
		<div className='flex items-center gap-1.5'>
			<CompactNavControls />
			<div className='hidden items-center justify-center xl:flex'>
				<RightSidebarTrigger className='rounded-xl border-border/60 bg-background/72 shadow-none' />
			</div>
		</div>
	);
};

export default PublicNavControls;
