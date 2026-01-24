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
import { searchUableEngines } from '@/service/engine';
import { utils } from '@kinda/utils';
import { updateUserDefaultEngine } from '@/service/user';
import { toast } from 'sonner';
import { EngineCategory } from '@/enums/engine';

const DefaultTranscribeEngineChange = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['searchMyEngine', EngineCategory.STT],
		queryFn: async () => {
			const res = await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.STT,
			});
			return res;
		},
	});

	const handleUpdateDefaultTranscribeEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_audio_transcribe_engine_id: id,
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
				mainUserInfo?.default_audio_transcribe_engine_id
					? String(mainUserInfo?.default_audio_transcribe_engine_id)
					: undefined
			}
			onValueChange={(e) => {
				handleUpdateDefaultTranscribeEngine(Number(e));
			}}>
			<SelectTrigger
				id='default_transribe_engine_choose'
				className='min-w-[180px]'>
				<SelectValue placeholder={t('setting_default_engine_choose')} />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{data?.data &&
						data.data
							.map((engine, index) => (
								<SelectItem key={engine.id} value={String(engine.id)}>
									{engine.name}
								</SelectItem>
							))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default DefaultTranscribeEngineChange;
