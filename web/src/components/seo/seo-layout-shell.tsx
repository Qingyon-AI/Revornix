'use client';

import type { ReactNode } from 'react';

import { AppRightSidebar } from '@/components/app/app-right-sidebar';
import { RightSidebarProvider } from '@/provider/right-sidebar-provider';

const SeoLayoutShell = ({
	header,
	children,
}: {
	header: ReactNode;
	children: ReactNode;
}) => {
	return (
		<RightSidebarProvider>
			<div className='min-h-screen w-full'>
				<div className='flex w-full'>
					<div className='flex min-w-0 flex-1 flex-col'>
						{header}
						<div className='flex min-h-0 min-w-0 w-full flex-1 flex-col'>{children}</div>
					</div>
					<AppRightSidebar />
				</div>
			</div>
		</RightSidebarProvider>
	);
};

export default SeoLayoutShell;
