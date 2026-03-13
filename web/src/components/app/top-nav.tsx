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
		<Breadcrumb className='min-w-0'>
			<BreadcrumbList className='gap-1 text-[13px]'>
				{crumbs.map((crumb, index) => {
					const isLast = index === crumbs.length - 1;
					const shouldRenderAsPage = crumb.unclickable || isLast;

					return (
						<div
							key={crumb.path}
							className='flex min-w-0 flex-row items-center gap-1'>
							<BreadcrumbItem className='min-w-0 md:block'>
								{shouldRenderAsPage ? (
									<BreadcrumbPage className='truncate'>
										{crumb.title}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild className='truncate'>
										<Link href={crumb.path}>{crumb.title}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{!isLast ? (
								<BreadcrumbSeparator className='md:block [&>svg]:size-3' />
							) : null}
						</div>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export default TopNav;
