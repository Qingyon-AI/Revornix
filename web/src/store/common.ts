import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval' // can use anything: IndexedDB, Ionic Storage, etc.

// Custom storage object
const storage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null // SSR 阶段返回 null
        // console.log(name, 'has been retrieved')
        return (await get(name)) || null
    },
    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined') return // SSR 阶段跳过保存
        // console.log(name, 'with value', JSON.parse(value).state, 'has been saved')
        await set(name, value)
    },
    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined') return
        // console.log(name, 'has been deleted')
        await del(name)
    },
}

export type CommonAction = {
    setHasHydrated: (status: boolean) => void
}

export type CommonState = {
    _hasHydrated: boolean
}


export const useCommonStore = create<CommonState & CommonAction>()(persist((set, get) => {
    return ({
        _hasHydrated: false,
        setHasHydrated(status) {
            set({ _hasHydrated: status })
        },
    })
}, {
    name: 'common-store', // unique name
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
    // partialize: debounce((state) => state, 500), // 500ms防抖
    // merge: (persistedState, currentState) =>
    //     mergeDeepLeft(persistedState, currentState)
},))