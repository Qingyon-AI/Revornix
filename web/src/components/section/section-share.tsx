import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSectionDetail, updateSection } from '@/service/section';
import { useUserContext } from '@/provider/user-provider';
import { Badge } from '../ui/badge';
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
import { useTranslations } from 'next-intl';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { CopyIcon, ShareIcon } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { SectionInfo } from '@/generated';

const SectionShare = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const [copiedText, copy] = useCopyToClipboard();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: async () => {
			return getSectionDetail({ section_id: section_id });
		},
	});

	const mutateUpdate = useMutation({
		mutationFn: async (newStatus: boolean) => {
			return await updateSection({
				section_id, // ⚡️用 props，而不是 section?.id
				public: newStatus,
			});
		},
		onMutate: async (newStatus: boolean) => {
			await queryClient.cancelQueries({
				queryKey: ['getSectionDetail', section_id],
			});

			const previousData = queryClient.getQueryData<SectionInfo>([
				'getSectionDetail',
				section_id,
			]);

			queryClient.setQueryData(
				['getSectionDetail', section_id],
				(old?: SectionInfo) => (old ? { ...old, public: newStatus } : old)
			);

			return { previousData };
		},
		onError: (error, newStatus, context) => {
			toast.error((error as Error).message);
			if (context?.previousData) {
				queryClient.setQueryData(
					['getSectionDetail', section_id],
					context.previousData
				);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
		},
	});

	const handleUpdateTheShareStatus = (e: boolean) => {
		mutateUpdate.mutate(e);
	};

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button className='flex-1 w-full text-xs' variant={'ghost'}>
						<ShareIcon />
						{t('section_share')}
						{section?.public && (
							<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
								<span className='relative flex size-2'>
									<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
									<span className='relative inline-flex size-2 rounded-full bg-amber-500'></span>
								</span>
								{t('section_share_status_on')}
							</Badge>
						)}
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('section_share')}</DialogTitle>
						<DialogDescription>
							{t('section_share_description')}
						</DialogDescription>
					</DialogHeader>
					<div className='flex flex-col gap-5'>
						<div className='w-full flex items-center gap-2 justify-between'>
							<Label>{t('section_share_on')}</Label>
							<Switch
								checked={section?.public}
								onCheckedChange={handleUpdateTheShareStatus}
							/>
						</div>
						{section?.public && (
							<div className='w-full flex items-center gap-2'>
								<Input
									disabled
									value={`https://app.revornix.com/section/${section?.id}`}
								/>
								<Button
									size={'icon'}
									onClick={() => {
										section &&
											section.public &&
											copy(`https://app.revornix.com/section/${section?.id}`);
										toast.success(t('copied'));
									}}>
									<CopyIcon />
								</Button>
							</div>
						)}
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>{t('cancel')}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SectionShare;
