import { useMDXComponents } from '@/mdx-components';
import { generateStaticParamsFor, importPage } from 'nextra/pages';

export const generateStaticParams = async () => {
	const allParams = await generateStaticParamsFor('mdxPath', 'lang')();
	return allParams.filter((params) => params.mdxPath?.[0] !== 'blogs');
};
export async function generateMetadata(props: PageProps) {
	const params = await props.params;
	const mdxPath = params.mdxPath ?? [];
	const { metadata } = await importPage(mdxPath, params.lang);
	return metadata;
}

type PageProps = Readonly<{
	params: Promise<{
		mdxPath?: string[];
		lang: string;
	}>;
}>;

const Wrapper = useMDXComponents().wrapper;

export default async function Page(props: PageProps) {
	const params = await props.params;
	const mdxPath = params.mdxPath ?? [];
	const result = await importPage(mdxPath, params.lang);

	const { default: MDXContent, toc, metadata, sourceCode } = result;

	return (
		<div className='x:bg-nextra-bg'>
			<Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
				<MDXContent {...props} params={{ ...params, mdxPath }} />
			</Wrapper>
		</div>
	);
}
