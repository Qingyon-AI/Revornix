import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { locales } from '@/i18n/config';
import { useLocale, useTranslations } from 'next-intl';
import { setUserLocale } from '@/i18n/locale';

const LanguageChange = () => {
	const locale = useLocale();
	const t = useTranslations();
	return (
		<Select value={locale} onValueChange={(value) => setUserLocale(value)}>
			<SelectTrigger>
				<SelectValue placeholder={t('setting_language_choose')} />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{locales.map((locale, index) => {
						return (
							<SelectItem key={index} value={locale.code}>
								{locale.name}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default LanguageChange;
