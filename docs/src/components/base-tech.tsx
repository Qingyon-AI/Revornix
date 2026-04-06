import { useTranslations } from 'next-intl';
import Link from 'next/link';

const BaseTech = () => {
	const t = useTranslations();
	const techs = [
		{
			name: 'NextJS',
			href: 'https://nextjs.org/',
		},
		{
			name: 'Tailwindcss',
			href: 'https://tailwindcss.com/',
		},
		{
			name: 'SwiftUI',
			href: 'https://nextjs.org/',
		},
		{
			name: 'FastAPI',
			href: 'https://fastapi.tiangolo.com',
		},
		{
			name: 'Celery',
			href: 'https://docs.celeryq.dev/en/stable/',
		},
		{
			name: 'PostgreSQL',
			href: 'https://www.postgresql.org',
		},
		{
			name: 'Milvus',
			href: 'https://milvus.io',
		},
		{
			name: 'Redis',
			href: 'https://redis.io',
		},
		{
			name: 'Docker',
			href: 'https://www.docker.com',
		},
		{
			name: 'Nginx',
			href: 'https://nginx.org',
		},
		{
			name: 'MinerU',
			href: 'https://mineru.net',
		},
		{
			name: 'DailyHot',
			href: 'https://github.com/imsyy/DailyHotApi',
		},
	];
	return (
		<div>
			<h2 className='font-bold text-3xl text-center mb-10'>
				{t('tech_stack')}
			</h2>
			<div className='overflow-hidden w-full relative'>
				<div className='absolute top-0 left-0 h-full w-5 md:w-20 z-10 bg-linear-to-r from-[var(--x-color-nextra-bg)] to-none/0'></div>
				<div className='absolute top-0 right-0 h-full w-5 md:w-20 z-10 bg-linear-to-l from-[var(--x-color-nextra-bg)] to-none/0'></div>
				<div className='flex animate-scroll flex-row gap-5'>
					{techs.map((tech, index) => {
						return (
							<Link
								href={tech.href}
								key={index}
								className='rounded p-5 bg-black/5 dark:bg-white/5 min-w-40'>
								<h3 className='font-bold text-lg capitalize'>
									{tech.name}
								</h3>
							</Link>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export default BaseTech;
