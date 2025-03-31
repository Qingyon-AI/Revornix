import { getSectionDetail, subscribeSection } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useState } from 'react';
import { utils } from '@kinda/utils';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';

const SectionSubscribe = ({ section_id }: { section_id: string }) => {
	const id = section_id;
	const [subscribing, setSubscribing] = useState(false);

	const queryClient = getQueryClient();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: Number(id) });
		},
	});

	const handleUpdateSubscribeStatue = async () => {
		if (!section) return;
		setSubscribing(true);
		const [res, err] = await utils.to(
			subscribeSection({
				section_id: Number(id),
				status: section?.is_subscribed ? false : true,
			})
		);
		if (err) {
			toast.error(err.message);
			setSubscribing(false);
			return;
		}
		if (section.is_subscribed) {
			toast.success('取消订阅成功。');
		} else {
			toast.success('订阅成功，该专栏更新时你将会收到提醒。');
		}
		section.is_subscribed = !section.is_subscribed;
		setSubscribing(false);
		queryClient.invalidateQueries({ queryKey: ['getSectionDetail', id] });
	};

	return (
		<>
			<div>
				<Button
					className='shadow-none text-xs'
					disabled={subscribing}
					onClick={handleUpdateSubscribeStatue}>
					{section?.is_subscribed ? '取消订阅' : '订阅专栏'}
					{subscribing && <Loader2 className='animate-spin' />}
				</Button>
			</div>
		</>
	);
};
export default SectionSubscribe;
