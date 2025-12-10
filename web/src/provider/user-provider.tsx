'use client';

import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react';
import Cookies from 'js-cookie';
import { QueryObserverResult, useQuery } from '@tanstack/react-query';
import { getMyInfo, getUserInfoForPaySystem } from '@/service/user';
import { PrivateUserInfo } from '@/generated';
import { UserResponseDTO } from '@/generated-pay';

export type UserState = {
	mainUserInfo?: PrivateUserInfo;
	paySystemUserInfo?: UserResponseDTO;
	tempUpdateUserInfo: (user: PrivateUserInfo) => void;
};

export type UserActions = {
	refreshMainUserInfo: () => Promise<QueryObserverResult<any, Error>>;
	refreshPaySystemInfo: () => Promise<QueryObserverResult<any, Error>>;
	logOut: () => void;
};

export type UserContextProps = UserState & UserActions;

const UserContext = createContext<UserContextProps | undefined>(undefined);

export interface UserContextProviderProps {
	children: ReactNode;
}

export const UserContextProvider = ({ children }: UserContextProviderProps) => {
	const [mainUserInfo, setMainUserInfo] = useState<PrivateUserInfo | undefined>(
		undefined
	);
	const [paySystemUserInfo, setPaySystemUserInfo] = useState<
		UserResponseDTO | undefined
	>(undefined);

	const { data: mainInfo, refetch: refreshMainUserInfo } = useQuery({
		enabled: false,
		queryKey: ['myInfo'],
		queryFn: getMyInfo,
	});

	const { data: paySystemInfo, refetch: refreshPaySystemInfo } = useQuery({
		enabled: false,
		queryKey: ['paySystemUserInfo'],
		queryFn: getUserInfoForPaySystem,
	});

	useEffect(() => {
		if (mainInfo) {
			setMainUserInfo(mainInfo);
		}
		if (paySystemInfo) {
			setPaySystemUserInfo(paySystemInfo);
		}
	}, [mainInfo, paySystemInfo]);

	const logOut = () => {
		Cookies.remove('access_token');
		Cookies.remove('refresh_token');
		window.location.reload();
	};

	// 5. 临时更新用户信息
	const tempUpdateUserInfo = (newUserInfo: PrivateUserInfo) => {
		setMainUserInfo(newUserInfo); // 触发重新渲染
	};

	useEffect(() => {
		Cookies.get('access_token') && refreshMainUserInfo();
		Cookies.get('access_token') && refreshPaySystemInfo();
	}, []);

	return (
		<UserContext.Provider
			value={{
				mainUserInfo,
				paySystemUserInfo,
				refreshMainUserInfo,
				refreshPaySystemInfo,
				logOut,
				tempUpdateUserInfo,
			}}>
			{children}
		</UserContext.Provider>
	);
};

export const useUserContext = () => {
	const userContext = useContext(UserContext);

	if (!userContext) {
		throw new Error(`useUserContext must be used within UserProvider`);
	}
	return userContext;
};
