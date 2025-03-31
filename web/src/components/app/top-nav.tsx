'use client';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import routers, { findRouteByPath, RouteItem } from '@/config/router';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const TopNav = () => {
	const pathname = usePathname();
	const [crumbs, setCrumbs] = useState<RouteItem[]>([]);

	useEffect(() => {
		const paths = pathname
			.split('/')
			.filter((path) => path !== '')
			.map((path, index, array) => {
				return {
					title:
						findRouteByPath(routers, `/${array.slice(0, index + 1).join('/')}`)
							?.title ?? '未命名路径',
					path: `/${array.slice(0, index + 1).join('/')}`,
					unclickable: findRouteByPath(
						routers,
						`/${array.slice(0, index + 1).join('/')}`
					)?.unclickable,
				};
			});
		setCrumbs(paths);
	}, [pathname]);

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{crumbs.map((crumb, index) => {
					return (
						<div key={index} className='flex flex-row items-center gap-1.5'>
							<BreadcrumbItem className='md:block'>
								{crumb.unclickable}
								{crumb.unclickable ? (
									<div>{crumb.title}</div>
								) : (
									<Link href={crumb.path}>{crumb.title}</Link>
								)}
							</BreadcrumbItem>
							{index !== crumbs.length - 1 && (
								<BreadcrumbSeparator className='md:block' />
							)}
						</div>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export default TopNav;
