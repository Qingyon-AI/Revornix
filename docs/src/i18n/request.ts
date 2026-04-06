import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
    // Typically corresponds to the `[locale]` segment
    const requested = await requestLocale;
    const locale = requested || 'en';

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});