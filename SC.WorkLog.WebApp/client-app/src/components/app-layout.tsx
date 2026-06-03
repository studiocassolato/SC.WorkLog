import { useState, type ReactNode } from 'react'
import { useHistory } from 'react-router-dom'
import { WorkLogProvider } from 'lib/worklog-context'
import { AppSidebar, TopBar, MobileBottomNav } from 'components/app-shell'
import { AddTimeDialog } from 'components/add-time-dialog'
import { cn } from 'lib/utils'

export function AppLayout({ children }: { children: ReactNode }) {
  const history = useHistory()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [addTimeOpen, setAddTimeOpen] = useState(false)

  const handleAddWorkItem = () => {
    history.push('/work-items?create=true')
  }

  return (
    <WorkLogProvider>
      <div className="flex h-screen bg-card">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar onAddTime={() => setAddTimeOpen(true)} onAddWorkItem={handleAddWorkItem} />
          <main className={cn('flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-6')}>
            {children}
          </main>
          <MobileBottomNav />
        </div>
      </div>
      <AddTimeDialog open={addTimeOpen} onOpenChange={setAddTimeOpen} />
    </WorkLogProvider>
  )
}
