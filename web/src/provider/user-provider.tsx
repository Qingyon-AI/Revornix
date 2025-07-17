'use client';

import {
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import Cookies from 'js-cookie';
import { QueryObserverResult, useQuery } from '@tanstack/react-query';
import { getMyInfo } from '@/service/user';
import { PrivateUserInfo } from '@/generated';

export type UserState = {
	userInfo?: PrivateUserInfo;
	tempUpdateUserInfo: (user: PrivateUserInfo) => void;
};

export type UserActions = {
	refreshUserInfo: () => Promise<QueryObserverResult<any, Error>>;
	logOut: () => void;
};

export type UserContextProps = UserState & UserActions;

const UserContext = createContext<UserContextProps | undefined>(undefined);

export interface UserContextProviderProps {
	children: ReactNode;
}

export const UserContextProvider = ({ children }: UserContextProviderProps) => {
	const [userInfo, setUserInfo] = useState<PrivateUserInfo | undefined>(
		undefined
	);
	// 2. 获取用户信息
	const { data, refetch: refreshUserInfo } = useQuery({
		enabled: false,
		queryKey: ['myInfo'],
		queryFn: getMyInfo,
	});

	// 3. 在查询成功时更新 userInfo
	useEffect(() => {
		if (data) {
			setUserInfo(data);
		}
	}, [data]);

	const logOut = () => {
		Cookies.remove('access_token');
		Cookies.remove('refresh_token');
		window.location.reload();
	};

	// 5. 临时更新用户信息
	const tempUpdateUserInfo = (newUserInfo: PrivateUserInfo) => {
		setUserInfo(newUserInfo); // 触发重新渲染
	};

	useEffect(() => {
		Cookies.get('access_token') && refreshUserInfo();
	}, []);

	return (
		<UserContext.Provider
			value={{
				userInfo,
				refreshUserInfo,
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
