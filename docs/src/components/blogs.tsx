import { getPageMap } from 'nextra/page-map';
import BlogCard, { BlogCardProps } from './blog-card';
import { PageMapItem, MetaJsonFile, MdxFile, FrontMatter } from 'nextra';
import { cookies } from 'next/headers';
import { cn } from '@/lib/utils';

const checkData = (item: PageMapItem): item is MetaJsonFile => {
	return 'data' in item;
};

const Blogs = async ({ className }: { className?: string }) => {
	const cookieStore = await cookies();
	const locale = cookieStore.get('NEXT_LOCALE')?.value || 'en';

	const blogPageMap = await getPageMap(`/${locale}/blogs`);
	const blogs: BlogCardProps[] = blogPageMap
		.filter((page: PageMapItem) => !checkData(page))
		.filter((page: MdxFile<FrontMatter>) => !page.frontMatter.listHidden)
		.map((page: MdxFile<FrontMatter>) => {
			return {
				title: page.frontMatter.title,
				href: page.route,
				description: page.frontMatter.description,
				cover: page.frontMatter.cover,
				lastUpdate: page.frontMatter.timestamp,
			};
		});
	return (
		<div className={cn('max-w-3xl grid grid-cols-1 gap-5 mx-auto', className)}>
			{blogs.map((blog, index) => {
				return <BlogCard key={index} {...blog} />;
			})}
		</div>
	);
};

export default Blogs;
