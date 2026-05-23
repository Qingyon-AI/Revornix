import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Compass, Home, type LucideIcon, SearchX } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type NotFoundAction = {
	href: string;
	label: ReactNode;
	icon?: LucideIcon;
	variant?: 'default' | 'outline' | 'secondary' | 'ghost';
};

type NotFoundViewProps = {
	code?: string | null;
	eyebrow?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	icon?: LucideIcon;
	actions?: NotFoundAction[];
	className?: string;
};

const NotFoundView = ({
	code = '404',
	eyebrow,
	title,
	description,
	icon: Icon = SearchX,
	actions,
	className,
}: NotFoundViewProps) => {
	const showCode = code !== null && code !== '';
	return (
		<div
			className={cn(
				'flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center gap-6 px-6 py-16 text-center',
				className,
			)}>
			<div className='flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
				<Icon className='size-6' strokeWidth={1.5} />
			</div>
			<div className='space-y-3'>
				{eyebrow ? (
					<p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
						{eyebrow}
					</p>
				) : null}
				<div className='flex items-center justify-center gap-3'>
					{showCode ? (
						<>
							<span className='text-5xl font-semibold tracking-tight text-foreground sm:text-6xl'>
								{code}
							</span>
							<span className='h-10 w-px bg-border' aria-hidden />
						</>
					) : null}
					<h1 className='text-lg font-semibold tracking-tight text-foreground sm:text-xl'>
						{title}
					</h1>
				</div>
				{description ? (
					<p className='mx-auto max-w-md text-pretty text-sm leading-6 text-muted-foreground'>
						{description}
					</p>
				) : null}
			</div>
			{actions && actions.length > 0 ? (
				<div className='flex flex-wrap items-center justify-center gap-2 pt-1'>
					{actions.map((action, index) => {
						const ActionIcon = action.icon;
						return (
							<Button
								key={`${action.href}-${index}`}
								asChild
								variant={action.variant ?? (index === 0 ? 'default' : 'outline')}
								className='rounded-full'>
								<Link href={action.href}>
									{ActionIcon ? <ActionIcon /> : null}
									{action.label}
								</Link>
							</Button>
						);
					})}
				</div>
			) : null}
		</div>
	);
};

export { NotFoundView, Home as NotFoundHomeIcon, Compass as NotFoundCompassIcon };
export type { NotFoundAction, NotFoundViewProps };
