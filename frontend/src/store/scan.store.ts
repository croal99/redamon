import { create } from "zustand"
import { ScanTask, ScanResult } from "../api/scan"

interface ScanState {
  tasks: ScanTask[]
  activeTask: ScanTask | null
  results: Record<string, ScanResult[]>
  setTasks: (tasks: ScanTask[]) => void
  addTask: (task: ScanTask) => void
  updateTask: (id: string, update: Partial<ScanTask>) => void
  setActiveTask: (task: ScanTask | null) => void
  setResults: (taskId: string, results: ScanResult[]) => void
}

export const useScanStore = create<ScanState>((set) => ({
  tasks: [],
  activeTask: null,
  results: {},
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, update) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...update } : t)),
      activeTask: s.activeTask?.id === id ? { ...s.activeTask, ...update } : s.activeTask,
    })),
  setActiveTask: (task) => set({ activeTask: task }),
  setResults: (taskId, results) => set((s) => ({ results: { ...s.results, [taskId]: results } })),
}))
