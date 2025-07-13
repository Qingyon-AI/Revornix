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

const DefaultDocumentParseEngineChange = () => {
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
				default_file_document_parse_engine_id: id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(t('setting_default_document_parse_engine_update_successful'));
	};

	const handleUpdateDefaultWebsiteDocumentParseEngine = async (id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultEngine({
				default_website_document_parse_engine_id: id,
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
			<div className='flex flex-row gap-2 items-center mb-2'>
				<p className='text-xs text-muted-foreground'>
					{t('setting_engine_website')}
				</p>
				<Select
					value={
						userInfo?.default_website_document_parse_engine_id
							? String(userInfo?.default_website_document_parse_engine_id)
							: undefined
					}
					onValueChange={(e) => {
						handleUpdateDefaultWebsiteDocumentParseEngine(Number(e));
					}}>
					<SelectTrigger
						id='default_website_document_parse_engine_choose'
						className='dark:bg-transparent dark:hover:bg-transparent border-none focus:border-none focus-visible:border-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none text-xs py-0 !h-fit'>
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
											{engine.name}
										</SelectItem>
									))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<div className='flex flex-row gap-2 items-center mb-2'>
				<p className='text-xs text-muted-foreground'>
					{t('setting_engine_file')}
				</p>
				<Select
					value={
						userInfo?.default_file_document_parse_engine_id
							? String(userInfo?.default_file_document_parse_engine_id)
							: undefined
					}
					onValueChange={(e) => {
						handleUpdateDefaultFileDocumentParseEngine(Number(e));
					}}>
					<SelectTrigger
						id='default_file_document_parse_engine_choose'
						className='dark:bg-transparent dark:hover:bg-transparent border-none focus:border-none focus-visible:border-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none text-xs py-0 !h-fit'>
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
											{engine.name}
										</SelectItem>
									))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<div className='flex flex-row gap-2 items-center'>
				<p className='text-xs text-muted-foreground'>
					{t('setting_engine_quick_note')}
				</p>
				<p className='text-xs text-muted-foreground pl-3'>
					{t('setting_engine_no_need')}
				</p>
			</div>
		</div>
	);
};

export default DefaultDocumentParseEngineChange;
