import Link, { LinkProps } from 'next/link';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';

interface CustomFileLinkProps extends LinkProps {
	title?: string;
	className?: string;
	target?: string;
	children?: React.ReactNode;
}

const CustomFileLink = (props: CustomFileLinkProps) => {
	let { href, title, target, className, children } = props;
	const { userInfo } = useUserContext();
	href = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${href}`;
	return (
		<Link title={title} href={href} target={target} className={cn(className)}>
			{children}
		</Link>
	);
};

export default CustomFileLink;
