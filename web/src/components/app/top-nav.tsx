'use client';

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import routers, { findRouteByPath, RouteItem } from '@/config/router';
import { useLocale } from 'next-intl';
import Link from 'next/link';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const TopNav = () => {
	const locale = useLocale();
	const pathname = usePathname();
	const [crumbs, setCrumbs] = useState<RouteItem[]>([]);

	useEffect(() => {
		const paths = pathname
			.split('/')
			.filter((path) => path !== '')
			.map((path, index, array) => {
				let title = '';
				if (locale === 'zh') {
					title =
						findRouteByPath(routers, `/${array.slice(0, index + 1).join('/')}`)
							?.title ?? '未命名路径';
				} else if (locale === 'en') {
					title =
						findRouteByPath(routers, `/${array.slice(0, index + 1).join('/')}`)
							?.title_en ?? 'Unnamed Path';
				}
				return {
					title,
					path: `/${array.slice(0, index + 1).join('/')}`,
					unclickable: findRouteByPath(
						routers,
						`/${array.slice(0, index + 1).join('/')}`
					)?.unclickable,
				};
			});
		setCrumbs(paths);
	}, [pathname, locale]);

	return (
		<Breadcrumb className='min-w-0'>
			<BreadcrumbList className='gap-1 text-[13px]'>
				{crumbs.map((crumb, index) => {
					return (
						<div
							key={index}
							className='flex min-w-0 flex-row items-center gap-1'>
							<BreadcrumbItem className='min-w-0 md:block'>
								{crumb.unclickable}
								{crumb.unclickable ? (
									<div className='truncate'>{crumb.title}</div>
								) : (
									<Link href={crumb.path} className='truncate'>
										{crumb.title}
									</Link>
								)}
							</BreadcrumbItem>
							{index !== crumbs.length - 1 && (
								<BreadcrumbSeparator className='md:block [&>svg]:size-3' />
							)}
						</div>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
};

export default TopNav;
