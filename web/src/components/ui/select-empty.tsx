const SelectEmpty = ({
	message,
}: {
	message: string;
}) => {
	return <div className='px-3 py-2 text-sm text-muted-foreground'>{message}</div>;
};

export default SelectEmpty;
