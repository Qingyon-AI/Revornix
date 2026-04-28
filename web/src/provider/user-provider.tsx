'use client';

import {
	type ReactNode,
	createContext,
	useContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import Cookies from 'js-cookie';
import { clearAuthCookies } from '@/lib/auth-cookies';
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

	const isSamePaySystemUserInfo = (
		left?: UserResponseDTO,
		right?: UserResponseDTO,
	) => {
		if (left === right) {
			return true;
		}
		if (!left || !right) {
			return false;
		}

		const leftPlan = left.userPlan;
		const rightPlan = right.userPlan;
		const leftBalance = left.computeBalance;
		const rightBalance = right.computeBalance;

		return (
			left.id === right.id &&
			left.uuid === right.uuid &&
			left.nickname === right.nickname &&
			leftPlan?.id === rightPlan?.id &&
			leftPlan?.startTime === rightPlan?.startTime &&
			leftPlan?.expireTime === rightPlan?.expireTime &&
			leftPlan?.plan?.product?.uuid === rightPlan?.plan?.product?.uuid &&
			leftBalance?.available_points === rightBalance?.available_points &&
			leftBalance?.gifted_points === rightBalance?.gifted_points &&
			leftBalance?.purchased_points === rightBalance?.purchased_points &&
			leftBalance?.consumed_points === rightBalance?.consumed_points
		);
	};

	useEffect(() => {
		if (mainInfo) {
			setMainUserInfo(mainInfo);
		}
		if (paySystemInfo) {
			setPaySystemUserInfo((current) =>
				isSamePaySystemUserInfo(current, paySystemInfo)
					? current
					: paySystemInfo,
			);
		}
	}, [mainInfo, paySystemInfo]);

	const logOut = useCallback(() => {
		clearAuthCookies();
		window.location.reload();
	}, []);

	// 5. 临时更新用户信息
	const tempUpdateUserInfo = useCallback((newUserInfo: PrivateUserInfo) => {
		setMainUserInfo(newUserInfo); // 触发重新渲染
	}, []);

	useEffect(() => {
		if (!Cookies.get('access_token')) return;
		refreshMainUserInfo();
		refreshPaySystemInfo();
	}, [refreshMainUserInfo, refreshPaySystemInfo]);

	const value = useMemo(
		() => ({
			mainUserInfo,
			paySystemUserInfo,
			refreshMainUserInfo,
			refreshPaySystemInfo,
			logOut,
			tempUpdateUserInfo,
		}),
		[
			mainUserInfo,
			paySystemUserInfo,
			refreshMainUserInfo,
			refreshPaySystemInfo,
			logOut,
			tempUpdateUserInfo,
		],
	);

	return (
		<UserContext.Provider
			value={value}>
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
