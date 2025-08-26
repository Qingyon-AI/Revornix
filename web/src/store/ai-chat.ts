import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'

export type ResponseItem = {
    event: string;
    data: any;
    name: string;
    tags: string[];
    run_id: string;
    metadata: any;
    parent_ids: string[];
}

export type Message = {
    content: string;
    role: string;
    chat_id: string;
};

export type SessionItem = {
    id: string
    title: string
    messages: Message[]
}

export type AIChatState = {
    currentSessionId: string | null
    sessions: SessionItem[]
    _hasHydrated: boolean
}

export type AIChacAction = {
    setCurrentSessionId: (id: string | null) => void
    addSession: (chat: SessionItem) => void
    updateSessionMessages: (id: string, new_messages: Message[]) => void
    deleteSession: (id: string) => void
    setHasHydrated: (status: boolean) => void
}

const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null // SSR 阶段返回 null
        return (await get(name)) || null
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return // SSR 阶段跳过保存
        await set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return
        await del(name)
    },
}

export const useAiChatStore = create<AIChatState & AIChacAction>()(
    persist(
        (set, get) => {
            return ({
                _hasHydrated: false,
                sessions: [],
                currentSessionId: null,
                setCurrentSessionId: (id) => set({ currentSessionId: id }),
                updateSessionMessages: (id, new_messages) => {
                    return set((state) => ({
                        sessions: state.sessions.map((session) => {
                            if (session.id == id) {
                                return {
                                    ...session,
                                    messages: new_messages,
                                };
                            }
                            return session;
                        }),
                    }));
                },
                addSession: (session: SessionItem) => set((state) => ({ sessions: [...state.sessions, session] })),
                deleteSession: (id: string) => set((state) => ({ sessions: state.sessions.filter((item) => item.id !== id) })),
                setHasHydrated: (status) => {
                    return set({
                        _hasHydrated: status
                    });
                },
            })
        },
        {
            name: 'revornix-ai-chat', // unique name
            storage: createJSONStorage(() => storage),
            onRehydrateStorage: (state) => {
                // optional
                return (state, error) => {
                    state && state.setHasHydrated(true)
                    if (error) {
                    } else {
                    }

                }
            },
        },
    ),
)
