import { useTranslations } from 'next-intl';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { CopyIcon } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { getQueryClient } from '@/lib/get-query-client';
import { SectionInfo } from '@/generated';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSectionDetail, updateSection } from '@/service/section';

const SectionPublish = ({ section_id }: { section_id: number }) => {
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
			<div className='w-full flex items-center gap-2 justify-between'>
				<Label>{t('section_publish_on')}</Label>
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
		</>
	);
};

export default SectionPublish;
