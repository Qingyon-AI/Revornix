import Link from "next/link";

const Footer = () => {
	return (
		<div className='w-full text-xs text-muted-foreground p-5'>
			<p className='text-center'>
				Copyright © <Link href={'https://www.qingyon.com'} target="_blank">清韵科技（绍兴）有限公司</Link> Since {2024}.
			</p>
			<p className='text-center'>All Rights Reserved.</p>
		</div>
	);
};

export default Footer;
