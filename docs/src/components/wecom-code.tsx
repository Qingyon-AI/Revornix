import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';
import wechatGroupCode from '@/static/wechat_group.jpg';
import authorWechatCode from '@/static/author_wechat.jpg';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const WeComCode = ({
	buttonStyle = 'link',
	label,
	className,
}: {
	buttonStyle?: 'link' | 'button';
	label?: string;
	className?: string;
}) => {
	const t = useTranslations();
	const buttonLabel = label ?? t('wecom');
	return (
		<Dialog>
			{buttonStyle === 'link' && (
				<DialogTrigger asChild>
					<Button
						variant='link'
						className={cn(
							'p-0 m-0 font-normal underline text-md hover:no-underline cursor-pointer decoration-from-font text-sm',
							className
						)}>
						{buttonLabel}
					</Button>
				</DialogTrigger>
			)}
			{buttonStyle === 'button' && (
				<DialogTrigger asChild>
					<Button variant={'secondary'} className={cn(className)}>
						{buttonLabel}
					</Button>
				</DialogTrigger>
			)}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('wecom')}</DialogTitle>
					<DialogDescription>{t('wecom_tips')}</DialogDescription>
				</DialogHeader>
				<div className='flex justify-center items-center sm:flex-nowrap flex-wrap'>
					<Image
						src={wechatGroupCode}
						className='rounded'
						width={250}
						height={250}
						alt='wecom_code'
					/>
					<Image
						src={authorWechatCode}
						className='rounded'
						width={250}
						height={250}
						alt='wecom_code'
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default WeComCode;
