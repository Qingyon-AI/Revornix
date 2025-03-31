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

const SectionDelete = ({ section_id }: { section_id: string }) => {
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
		toast.success('删除成功');
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
						删除专栏
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>警告</DialogTitle>
						<DialogDescription>
							确定要删除该专栏吗？删除专栏后所有订阅用户将自动清除！且此操作无法撤销！
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant={'secondary'}>取消</Button>
						</DialogClose>
						<Button
							variant={'destructive'}
							onClick={handleDeleteSection}
							disabled={deleting}>
							确认删除
							{deleting && <Loader2 className='animate-spin' />}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SectionDelete;
