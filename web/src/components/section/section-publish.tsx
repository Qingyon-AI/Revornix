import { useTranslations } from 'next-intl';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { useCopyToClipboard } from 'react-use';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getSectionDetail,
	getSectionPublish,
	publishSection,
	republishSection,
} from '@/service/section';
import { useMutation, useQuery } from '@tanstack/react-query';

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

	const { data: sectionPublish } = useQuery({
		queryKey: ['getSectionPublish', section_id],
		queryFn: async () => {
			return getSectionPublish({ section_id: section_id });
		},
	});

	const mutatePublish = useMutation({
		mutationFn: async (e: boolean) => {
			return await publishSection({ section_id: section_id, status: e });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionPublish', section_id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(error.message);
		},
	});

	const mutateRepublish = useMutation({
		mutationFn: async () => {
			return await republishSection({ section_id: section_id });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionPublish', section_id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(error.message);
		},
	});

	const handleUpdateTheShareStatus = (e: boolean) => {
		mutatePublish.mutate(e);
	};

	const handleRePublish = () => {
		mutateRepublish.mutate();
	};

	return (
		<>
			<div className='w-full flex items-center gap-2 justify-between'>
				<Label>{t('section_publish_on')}</Label>
				<Switch
					checked={sectionPublish?.uuid ? true : false}
					onCheckedChange={handleUpdateTheShareStatus}
				/>
			</div>
			{sectionPublish?.uuid && (
				<div className='w-full flex items-center gap-2 overflow-hidden'>
					<Input
						disabled
						className='truncate'
						value={`${process.env.NEXT_PUBLIC_HOST}/section/${sectionPublish.uuid}`}
					/>
					<Button
						size={'icon'}
						onClick={() => {
							sectionPublish &&
								sectionPublish.uuid &&
								copy(
									`${process.env.NEXT_PUBLIC_HOST}/section/${sectionPublish?.uuid}`
								);
							toast.success(t('copied'));
						}}>
						<CopyIcon />
					</Button>
					<Button
						size={'icon'}
						variant={'outline'}
						onClick={() => {
							handleRePublish();
						}}>
						<RefreshCcwIcon />
					</Button>
				</div>
			)}
		</>
	);
};

export default SectionPublish;
