'use client';

import { createContext, useContext, useState } from 'react';

interface LoginContextProps {
	loginWay: string;
	setLoginWay: (loginWay: string) => void;
}

const LoginContext = createContext<LoginContextProps | null>(null);

const LoginProvider = ({ children }: { children: React.ReactNode }) => {
	const [loginWay, setLoginWay] = useState<string>('email');

	return (
		<LoginContext.Provider
			value={{
				loginWay,
				setLoginWay,
			}}>
			{children}
		</LoginContext.Provider>
	);
};

export const useLoginProvider = () => {
	const userContext = useContext(LoginContext);
	if (!userContext) {
		throw new Error('useLoginProvider must be used within a LoginProvider');
	}
	return userContext;
};

export default LoginProvider;
