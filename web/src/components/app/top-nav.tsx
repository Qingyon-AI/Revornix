'use client';

import Link from 'next/link';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTopNavCrumbs } from '@/hooks/use-top-nav-crumbs';

const TopNav = () => {
	const crumbs = useTopNavCrumbs();

	return (
		<Breadcrumb className='min-w-0 flex-1 overflow-hidden'>
			<BreadcrumbList className='min-w-0 w-full flex-nowrap gap-1 overflow-hidden text-[13px]'>
				{crumbs.map((crumb, index) => {
					const isLast = index === crumbs.length - 1;
					const shouldRenderAsPage = crumb.unclickable || isLast;

					return (
						<div
							key={crumb.path}
							className={`flex items-center gap-1 ${isLast ? 'min-w-0 flex-1 overflow-hidden' : 'shrink-0'}`}>
							<BreadcrumbItem className={`md:block ${isLast ? 'min-w-0 flex-1 overflow-hidden' : 'shrink-0'}`}>
								{shouldRenderAsPage ? (
									<BreadcrumbPage className='block truncate whitespace-nowrap'>
										{crumb.title}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild className='block max-w-full truncate whitespace-nowrap'>
										<Link href={crumb.path}>{crumb.title}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{!isLast ? (
								<BreadcrumbSeparator className='shrink-0 md:block [&>svg]:size-3' />
							) : null}
						</div>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export default TopNav;
