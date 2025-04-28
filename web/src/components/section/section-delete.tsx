import { Button } from '../ui/button';
import { useState } from 'react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { Loader2 } from 'lucide-react';
import { deleteSection } from '@/service/section';
import { useRouter } from 'nextjs-toploader/app';
import { useTranslations } from 'next-intl';

const SectionDelete = ({ section_id }: { section_id: string }) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const handleDeleteSection = async () => {
		setDeleting(true);
		const [res, err] = await utils.to(
			deleteSection({
				section_id: Number(section_id),
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
		<>
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogTrigger asChild>
					<Button variant={'destructive'} className='text-xs'>
						{t('section_delete')}
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('section_delete_alert_title')}</DialogTitle>
						<DialogDescription>
							{t('section_delete_alert_detail')}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant={'secondary'}>
								{t('section_delete_cancel')}
							</Button>
						</DialogClose>
						<Button
							variant={'destructive'}
							onClick={handleDeleteSection}
							disabled={deleting}>
							{t('section_delete_confirm')}
							{deleting && <Loader2 className='animate-spin' />}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SectionDelete;
