'use client';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { AIInteractionLanguage } from '@/enums/user';
import { useUserContext } from '@/provider/user-provider';
import { updateUserDefaultModel } from '@/service/user';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const DefaultAiInteractionLanguageChoose = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();

	const items = [
		{ id: AIInteractionLanguage.AUTO, name: t('setting_ai_interaction_language_auto') },
		{ id: AIInteractionLanguage.CHINESE, name: t('setting_ai_interaction_language_chinese') },
		{ id: AIInteractionLanguage.ENGLISH, name: t('setting_ai_interaction_language_english') },
	];

	const handleUpdateDefaultAiInteractionLanguage = async (language: number) => {
		const [_, err] = await utils.to(
			updateUserDefaultModel({
				default_ai_interaction_language: language,
			}),
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshMainUserInfo();
		toast.success(t('setting_ai_interaction_language_update_successful'));
	};

	return (
		<Select
			value={
				mainUserInfo?.default_ai_interaction_language !== undefined &&
				mainUserInfo?.default_ai_interaction_language !== null
					? String(mainUserInfo.default_ai_interaction_language)
					: undefined
			}
			onValueChange={(value) => {
				handleUpdateDefaultAiInteractionLanguage(Number(value));
			}}
		>
			<SelectTrigger className='min-w-[180px]'>
				<SelectValue placeholder={t('setting_ai_interaction_language_select')} />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{items.map((item) => (
						<SelectItem key={item.id} value={String(item.id)}>
							{item.name}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default DefaultAiInteractionLanguageChoose;
