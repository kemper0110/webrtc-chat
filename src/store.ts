import {create} from "zustand";

type State = {
    position: string
    setPosition: (position: string) => void
}


export const useStore = create<State>((set) => ({
    position: '{"x": 0, "y": 0}',
    setPosition: (position) => set(() => ({position,}))
}))