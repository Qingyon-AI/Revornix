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
import { getDocumentParseEngines } from '@/service/engine';
import { utils } from '@kinda/utils';
import { updateUserDefaultEngine } from '@/service/user';
import { toast } from 'sonner';

const DefaultDocumentParseEngineChange = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['document-parse-engine'],
		queryFn: async () => {
			const res = await getDocumentParseEngines({ keyword: '' });
			return res;
		},
	});

	const handleUpdateDefaultDocumentPraseEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_document_parse_engine_id: id,
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
		<div>
			<Select
				value={
					userInfo?.default_document_parsing_engine_id
						? String(userInfo?.default_document_parsing_engine_id)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultDocumentPraseEngine(Number(e));
				}}>
				<SelectTrigger className='w-[180px]'>
					<SelectValue
						placeholder={t('setting_default_document_parse_engine_choose')}
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

export default DefaultDocumentParseEngineChange;
