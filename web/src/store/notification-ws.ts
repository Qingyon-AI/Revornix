import { create } from 'zustand';

export type IOSBindStatus = 'scanned' | 'confirm' | 'canceled';

export type IOSBindEvent = {
	code_uuid: string;
	status: IOSBindStatus;
	device_token?: string | null;
	received_at: number;
};

type NotificationWSState = {
	iosBindEvents: Record<string, IOSBindEvent>;
	upsertIOSBindEvent: (
		event: Omit<IOSBindEvent, 'received_at'> & { received_at?: number },
	) => void;
	removeIOSBindEvent: (codeUuid: string) => void;
	clearIOSBindEvents: () => void;
};

export const useNotificationWSStore = create<NotificationWSState>((set) => ({
	iosBindEvents: {},
	upsertIOSBindEvent: (event) =>
		set((state) => {
			const receivedAt = event.received_at ?? Date.now();
			return {
				iosBindEvents: {
					...state.iosBindEvents,
					[event.code_uuid]: {
						...event,
						received_at: receivedAt,
					},
				},
			};
		}),
	removeIOSBindEvent: (codeUuid) =>
		set((state) => {
			const next = { ...state.iosBindEvents };
			delete next[codeUuid];
			return { iosBindEvents: next };
		}),
	clearIOSBindEvents: () => set({ iosBindEvents: {} }),
}));
