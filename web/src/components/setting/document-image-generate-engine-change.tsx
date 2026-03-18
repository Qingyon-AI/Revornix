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
import {
	isSubscriptionLocked,
	shouldShowPlanLevelIndicator,
} from '@/lib/subscription';
import { searchUableEngines } from '@/service/engine';
import { utils } from '@kinda/utils';
import { updateUserDefaultEngine } from '@/service/user';
import { toast } from 'sonner';
import { EngineCategory } from '@/enums/engine';
import { Badge } from '../ui/badge';
import SubscriptionPlanBadgeContent from './subscription-plan-badge-content';

const DocumentImageGenerateEngineChange = () => {
	const t = useTranslations();
	const { mainUserInfo, paySystemUserInfo, refreshMainUserInfo } =
		useUserContext();
	const { data } = useQuery({
		queryKey: ['searchMyEngine', EngineCategory.IMAGE_GENERATE],
		queryFn: async () => {
			const res = await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.IMAGE_GENERATE,
			});
			return res;
		},
	});
	const handleUpdateDefaultImageGenerateEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_image_generate_engine_id: id,
			}),
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshMainUserInfo();
		toast.success(t('setting_default_engine_update_successful'));
	};

	return (
		<div className='flex justify-end'>
			<Select
				value={
					mainUserInfo?.default_image_generate_engine_id
						? String(mainUserInfo?.default_image_generate_engine_id)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultImageGenerateEngine(Number(e));
				}}>
				<SelectTrigger
					id='default_image_generate_engine_choose'
					className='min-w-[180px]'>
					<SelectValue placeholder={t('setting_default_engine_choose')} />
				</SelectTrigger>
				<SelectContent className='min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]'>
					<SelectGroup>
						{data?.data?.map((engine) => {
							const locked = isSubscriptionLocked(
								engine.required_plan_level,
								paySystemUserInfo,
								mainUserInfo,
							);
							return (
								<SelectItem
									key={engine.id}
									value={String(engine.id)}
									disabled={locked}>
									<span className='inline-flex max-w-full items-center gap-2 pr-4'>
										<span className='max-w-[32rem] truncate'>
											{engine.name}
										</span>
										{shouldShowPlanLevelIndicator(
											engine.required_plan_level,
											mainUserInfo,
										) && (
											<Badge className='shrink-0 rounded-full border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-700 shadow-none dark:text-sky-200'>
												<SubscriptionPlanBadgeContent
													requiredPlanLevel={engine.required_plan_level}
												/>
											</Badge>
										)}
									</span>
								</SelectItem>
							);
						})}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
};

export default DocumentImageGenerateEngineChange;
