import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import StaticImage from './static-image';

export interface BlogCardProps {
	title: string;
	description?: string;
	cover?: string;
	href: string;
	className?: string;
	lastUpdate: string;
}

const BlogCard = ({
	title,
	description,
	cover,
	href,
	lastUpdate,
	className,
}: BlogCardProps) => {
	return (
		<Link
			href={href}
			className={cn(
				'bg-muted p-5 border-border rounded-lg flex flex-row gap-5 !no-underline group hover:bg-muted/80',
				className
			)}>
			{cover && (
				<StaticImage
					className='rounded'
					src={cover}
					alt={title}
					width={150}
					height={150}
				/>
			)}
			<div className='flex-1'>
				<h2 className='font-bold text-xl'>{title}</h2>
				{description && (
					<p className='text-sm text-muted-foreground line-clamp-2'>
						{description}
					</p>
				)}
				<p className='text-xs text-muted-foreground'>
					{'last updated at: ' + format(lastUpdate, 'MM-dd HH:mm')}
				</p>
			</div>
		</Link>
	);
};

export default BlogCard;
