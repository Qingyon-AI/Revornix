import NextTopLoader from 'nextjs-toploader';

const IntegrationsLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<NextTopLoader />
			{children}
		</>
	);
};

export default IntegrationsLayout;
