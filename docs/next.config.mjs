import nextra from 'nextra'
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const withNextra = nextra({
    defaultShowCopyCode: true,
    // ... other Nextra config options
    mdxOptions: {
        rehypePrettyCodeOptions: {
            theme: {
                dark: 'nord',
                light: 'min-light'
            }
        }
    }
})

// You can include other Next.js configuration options here, in addition to Nextra settings:
const nextraConfig = withNextra({
    // ... Other Next.js config options
    i18n: {
        locales: ['en', 'zh'],
        defaultLocale: 'en',
    },
})

const nextIntlConfig = withNextIntl({ ...nextraConfig });

export default nextIntlConfig