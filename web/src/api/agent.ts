import { API_PREFIX } from "@/config/api"

export default {
	createSession: API_PREFIX + '/agent/session/create',
	searchSession: API_PREFIX + '/agent/session/search',
	sessionDetail: API_PREFIX + '/agent/session/detail',
	updateSession: API_PREFIX + '/agent/session/update',
	deleteSession: API_PREFIX + '/agent/session/delete',
	sessionMessages: API_PREFIX + '/agent/session/messages',
	postMessage: API_PREFIX + '/agent/session/message',
	sessionQueue: API_PREFIX + '/agent/session/queue',
	steerQueued: API_PREFIX + '/agent/session/queue/steer',
	cancelQueued: API_PREFIX + '/agent/session/queue/cancel',
	stopTurn: API_PREFIX + '/agent/session/stop',
	compactSession: API_PREFIX + '/agent/session/compact',
	listConfirmations: API_PREFIX + '/agent/confirmations/list',
	approveConfirmation: (id: number) => API_PREFIX + `/agent/confirmations/${id}/approve`,
	rejectConfirmation: (id: number) => API_PREFIX + `/agent/confirmations/${id}/reject`,
	streamTurn: (sessionId: number) => API_PREFIX + `/agent/session/${sessionId}/stream`,
}
