import { getSectionDetail, subscribeSection } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useState } from 'react';
import { utils } from '@kinda/utils';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SectionSubscribe = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const id = section_id;
	const [subscribing, setSubscribing] = useState(false);

	const queryClient = getQueryClient();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const handleUpdateSubscribeStatue = async () => {
		if (!section) return;
		setSubscribing(true);
		const [res, err] = await utils.to(
			subscribeSection({
				section_id: id,
				status: section?.is_subscribed ? false : true,
			})
		);
		if (err) {
			toast.error(err.message);
			setSubscribing(false);
			return;
		}
		if (section.is_subscribed) {
			toast.success(t('section_unsubscribe_success'));
		} else {
			toast.success(t('section_subscribe_success'));
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
					{section?.is_subscribed
						? t('section_unsubscribe')
						: t('section_subscribe')}
					{subscribing && <Loader2 className='animate-spin' />}
				</Button>
			</div>
		</>
	);
};
export default SectionSubscribe;
