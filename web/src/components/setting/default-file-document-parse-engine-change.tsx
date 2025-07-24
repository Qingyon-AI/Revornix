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

const DefaultFileDocumentParseEngineChange = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['mine-engine'],
		queryFn: async () => {
			const res = await getMineEngines({ keyword: '' });
			return res;
		},
	});

	const handleUpdateDefaultFileDocumentParseEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_file_document_parse_user_engine_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(t('setting_default_document_parse_engine_update_successful'));
	};

	return (
		<Select
			value={
				userInfo?.default_file_document_parse_user_engine_id
					? String(userInfo?.default_file_document_parse_user_engine_id)
					: undefined
			}
			onValueChange={(e) => {
				handleUpdateDefaultFileDocumentParseEngine(Number(e));
			}}>
			<SelectTrigger
				id='default_file_document_parse_engine_choose'
				className='w-[180px]'>
				<SelectValue
					placeholder={t('setting_default_document_parse_engine_choose')}
				/>
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

export default DefaultFileDocumentParseEngineChange;
