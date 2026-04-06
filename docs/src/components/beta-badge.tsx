import { Badge } from './ui/badge';

const BetaBadge = () => {
	return (
		<Badge
			className='h-5 min-w-5 rounded-full px-2 font-mono align-middle'
			variant='outline'>
			Beta
		</Badge>
	);
};

export default BetaBadge;
