import { Button } from '../ui/button';
import { useState } from 'react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Loader2, TrashIcon } from 'lucide-react';
import { deleteSection } from '@/service/section';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SectionOperateDelete = ({
	section_id,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const handleDeleteSection = async () => {
		setDeleting(true);
		const [res, err] = await utils.to(
			deleteSection({
				section_id: section_id,
			})
		);
		if (err) {
			toast.error(err.message);
			setDeleting(false);
			return;
		}
		toast.success(t('section_delete_success'));
		setDeleting(false);
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey.includes('searchMySection') ||
					query.queryKey.includes('searchPublicSection')
				);
			},
		});
		router.back();
	};
	return (
		<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
			<AlertDialogTrigger asChild>
				<Button
					title={t('section_delete')}
					variant={'ghost'}
					className={cn('text-xs', className)}
					onClick={onTriggerClick}>
					<TrashIcon />
					{iconOnly ? <span className='sr-only'>{t('section_delete')}</span> : t('section_delete')}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className='rounded-[28px] sm:max-w-md'>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('section_delete_alert_title')}</AlertDialogTitle>
					<AlertDialogDescription>
						{t('section_delete_alert_detail')}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel asChild>
						<Button variant={'secondary'}>
							{t('section_delete_cancel')}
						</Button>
					</AlertDialogCancel>
					<Button
						variant={'destructive'}
						onClick={handleDeleteSection}
						disabled={deleting}>
						{t('section_delete_confirm')}
						{deleting && <Loader2 className='animate-spin' />}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default SectionOperateDelete;
