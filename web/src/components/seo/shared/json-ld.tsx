import Script from 'next/script';

type JsonLdProps = {
	data: Record<string, unknown> | Array<Record<string, unknown>>;
};

const JsonLd = ({ data }: JsonLdProps) => {
	return (
		<Script
			type='application/ld+json'
			strategy='beforeInteractive'
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</g, '\\u003c'),
			}}
		/>
	);
};

export default JsonLd;
