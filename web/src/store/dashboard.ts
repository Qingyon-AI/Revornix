import { create, createStore } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'

export type Element = {
    id: string
    index: number
    title: string
    description: string
    visiable: boolean
}

export type DashboardAction = {
    setHasHydrated: (hasHydrated: boolean) => void
    hideElement: (id: string) => void
    showElement: (id: string) => void
    hasElement: (id: string) => boolean
}

export type DashboardState = {
    _hasHydrated: boolean
    elements: Element[]
}

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

export type DashboardStore = ReturnType<typeof createBearStore>

const createBearStore = (initProps?: Partial<DashboardAction & DashboardState>) => {
    const DEFAULT_PROPS: DashboardState = {
        elements: [],
        _hasHydrated: false,
    }
    return createStore<DashboardAction & DashboardState>()(persist(
        (set, get) => {
            return ({
                ...DEFAULT_PROPS,
                ...initProps,
                hideElement(id) {
                    let element = get().elements.find((e) => e.id === id)
                    if (element) {
                        element.visiable = false
                    }
                    set({ elements: get().elements })
                },
                showElement(id) {
                    let element = get().elements.find((e) => e.id === id)
                    if (element) {
                        element.visiable = true
                    }
                    set({ elements: get().elements })
                },
                hasElement(id) {
                    return get().elements.find((e) => e.id === id) !== undefined
                },
                _hasHydrated: false,
                setHasHydrated(hasHydrated) {
                    set({ _hasHydrated: hasHydrated })
                },
            })
        },
        {
            name: 'dashboard', // unique name
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
        },
    ),)
}
