import { Loader2Icon } from 'lucide-react';

const Loading = () => {
	return (
		<div className='flex min-h-[calc(100dvh-3.5rem)] w-full items-center justify-center'>
			<Loader2Icon className='size-6 animate-spin text-muted-foreground' />
		</div>
	);
};

export default Loading;
