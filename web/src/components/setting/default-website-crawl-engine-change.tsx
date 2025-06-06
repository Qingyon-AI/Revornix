import { useQuery } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { getWebsiteCrawlEngines } from '@/service/engine';
import { utils } from '@kinda/utils';
import { updateUserDefaultEngine } from '@/service/user';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { Info } from 'lucide-react';

const DefaultWebsiteCrawlEngineChange = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const { data, isFetching } = useQuery({
		queryKey: ['website-crawl-engine'],
		queryFn: async () => {
			const res = await getWebsiteCrawlEngines({ keyword: '' });
			return res;
		},
	});

	const handleUpdateDefaultWebsiteCrawlEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_website_crawling_engine_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(t('setting_default_website_crawl_engine_update_successful'));
	};

	return (
		<div>
			<Select
				value={
					userInfo?.default_website_crawling_engine_id
						? String(userInfo?.default_website_crawling_engine_id)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultWebsiteCrawlEngine(Number(e));
				}}>
				<SelectTrigger className='w-[180px]'>
					<SelectValue
						placeholder={t('setting_default_website_crawl_engine_choose')}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{data?.data &&
							data.data.map((engine, index) => (
								<SelectItem key={engine.id} value={String(engine.id)}>
									{engine.name}
								</SelectItem>
							))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
};

export default DefaultWebsiteCrawlEngineChange;
