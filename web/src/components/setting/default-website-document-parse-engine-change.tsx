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
import { getMineEngines } from '@/service/engine';
import { utils } from '@kinda/utils';
import { updateUserDefaultEngine } from '@/service/user';
import { toast } from 'sonner';
import { EngineCategory } from '@/enums/engine';

const DefaultWebsiteDocumentParseEngineChange = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['mine-engine', EngineCategory.Markdown],
		queryFn: async () => {
			const res = await getMineEngines({
				keyword: '',
				filter_category: EngineCategory.Markdown,
			});
			return res;
		},
	});

	const handleUpdateDefaultWebsiteDocumentParseEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_website_document_parse_user_engine_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshMainUserInfo();
		toast.success(t('setting_default_engine_update_successful'));
	};

	return (
		<Select
			value={
				mainUserInfo?.default_website_document_parse_user_engine_id
					? String(mainUserInfo?.default_website_document_parse_user_engine_id)
					: undefined
			}
			onValueChange={(e) => {
				handleUpdateDefaultWebsiteDocumentParseEngine(Number(e));
			}}>
			<SelectTrigger
				id='default_website_document_parse_engine_choose'
				className='min-w-[180px]'>
				<SelectValue placeholder={t('setting_default_engine_choose')} />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{data?.data &&
						data.data
							.filter((engine) => {
								return engine.enable;
							})
							.map((engine, index) => (
								<SelectItem key={engine.id} value={String(engine.id)}>
									{engine.title}
								</SelectItem>
							))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default DefaultWebsiteDocumentParseEngineChange;
