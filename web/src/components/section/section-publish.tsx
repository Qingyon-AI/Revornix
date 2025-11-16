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
	getSectionPublish,
	publishSection,
	republishSection,
} from '@/service/section';
import { useMutation, useQuery } from '@tanstack/react-query';

const SectionPublish = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	const queryClient = getQueryClient();

	const [copiedText, copy] = useCopyToClipboard();

	const { data: sectionPublish } = useQuery({
		queryKey: ['getSectionPublish', section_id],
		queryFn: async () => {
			return getSectionPublish({ section_id: section_id });
		},
	});

	const mutatePublish = useMutation({
		mutationFn: (newStatus: boolean) =>
			publishSection({ section_id, status: newStatus }),

		onMutate: async (newStatus: boolean) => {
			// 停止 refetch
			await queryClient.cancelQueries({
				queryKey: ['getSectionPublish', section_id],
			});

			// 当前值
			const previous = queryClient.getQueryData([
				'getSectionPublish',
				section_id,
			]);

			// 本地乐观更新（不要占位 uuid）
			// 只更新是否发布（uuid 是否存在）
			const optimistic = {
				uuid: newStatus ? 'KEEP' : null, // KEEP 表示仍旧保留旧值，不展示链接
			};
			queryClient.setQueryData(['getSectionPublish', section_id], optimistic);

			return { previous };
		},

		onError(error, newStatus, context) {
			toast.error(error.message);

			// 回滚
			if (context?.previous) {
				queryClient.setQueryData(
					['getSectionPublish', section_id],
					context.previous
				);
			}
		},

		onSettled() {
			// 最终拉取服务器真实数据（可能 uuid 被刷新）
			queryClient.invalidateQueries({
				queryKey: ['getSectionPublish', section_id],
			});
		},
	});

	const mutateRepublish = useMutation({
		mutationFn: async () => {
			return await republishSection({ section_id: section_id });
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
