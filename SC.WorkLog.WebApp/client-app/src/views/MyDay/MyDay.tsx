import { useState } from 'react'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import { StatusBadge, LeaveTypeBadge } from 'components/status-badges'
import { AddTimeDialog } from 'components/add-time-dialog'
import { LeaveRequestDialog } from 'components/leave-request-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import {
  Calendar,
  Clock,
  Plus,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Palmtree,
} from 'lucide-react'
import { cn } from 'lib/utils'
import { useHistory } from 'react-router-dom'

export default function MyDayPage() {
  const {
    currentUser,
    timeEntries,
    workItems,
    projects,
    customers,
    leaveRequests,
    overtimeRequests,
  } = useWorkLog()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [addTimeOpen, setAddTimeOpen] = useState(false)
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false)
  const history = useHistory()

  const dateStr = selectedDate.toISOString().split('T')[0]
  const isToday = dateStr === new Date().toISOString().split('T')[0]

  // Get today's entries for current user
  const todayEntries = timeEntries.filter(
    (e) => e.employeeId === currentUser.id && e.date === dateStr
  )

  const totalHours = todayEntries.reduce((sum, e) => sum + e.time, 0)
  const expectedHours = currentUser.expectedDailyHours

  // Get leave for this date
  const todayLeave = leaveRequests.find(
    (l) => l.employeeId === currentUser.id && l.date === dateStr
  )

  // Get overtime request for this date
  const todayOvertime = overtimeRequests.find(
    (o) => o.employeeId === currentUser.id && o.date === dateStr
  )

  // Get priority work items for current user
  const myPriorityItems = workItems.filter(
    (w) => w.assigneeId === currentUser.id && w.isPriority && w.status !== 'Closed' && w.status !== 'Completed'
  )

  // Calculate status
  let dayStatus: 'complete' | 'missing' | 'overtime' = 'complete'
  let statusMessage = ''

  if (totalHours < expectedHours) {
    const missing = expectedHours - totalHours - (todayLeave?.status === 'Approved' ? todayLeave.hours : 0)
    if (missing > 0) {
      dayStatus = 'missing'
      statusMessage = `Missing ${missing}h`
    }
  } else if (totalHours > expectedHours) {
    dayStatus = 'overtime'
    statusMessage = `+${(totalHours - expectedHours).toFixed(1)}h overtime`
  }

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const getWorkItem = (workItemId: string) => workItems.find((w) => w.id === workItemId)
  const getProject = (projectId: string) => projects.find((p) => p.id === projectId)
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Day</h1>
            <p className="text-sm text-muted-foreground">
              {totalHours.toFixed(1)}h logged today, {todayEntries.length} entries
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLeaveRequestOpen(true)}>
            <Palmtree className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Request Leave</span>
            <span className="sm:hidden">Leave</span>
          </Button>
          <Button onClick={() => setAddTimeOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Time
          </Button>
        </div>
      </div>

      {/* My Priorities */}
      {myPriorityItems.length > 0 && (
        <Card className="py-0 overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-base">My Priorities</CardTitle>
            <CardDescription>Work items assigned to you with high or urgent priority</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="w-24">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myPriorityItems.map((item) => {
                  const project = getProject(item.projectId)
                  const customer = project ? getCustomer(project.customerId) : null
                  return (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer group"
                      onClick={() => history.push(`/work-items/${item.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                      <TableCell className="font-medium group-hover:text-primary transition-colors">{item.title}</TableCell>
                      <TableCell className="text-muted-foreground">{customer?.companyName || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{project?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'Urgent' ? 'destructive' : 'default'} className="text-xs">
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Date Navigator */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-48 justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {isToday && (
            <Badge variant="secondary" className="text-xs">
              Today
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Hours Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Logged Hours</CardDescription>
            <CardTitle className="text-3xl">
              {totalHours}
              <span className="text-lg text-muted-foreground">/ {expectedHours}h</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  dayStatus === 'complete' && 'bg-green-500',
                  dayStatus === 'missing' && 'bg-amber-500',
                  dayStatus === 'overtime' && 'bg-blue-500'
                )}
                style={{ width: `${Math.min((totalHours / expectedHours) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Day Status</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {dayStatus === 'complete' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-green-600">Complete</span>
                </>
              )}
              {dayStatus === 'missing' && (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-amber-600">{statusMessage}</span>
                </>
              )}
              {dayStatus === 'overtime' && (
                <>
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span className="text-blue-600">{statusMessage}</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayOvertime && (
              <StatusBadge status={todayOvertime.status} />
            )}
          </CardContent>
        </Card>

        {/* Entries Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Entries</CardDescription>
            <CardTitle className="text-3xl">{todayEntries.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across {new Set(todayEntries.map((e) => e.workItemId)).size} work items
            </p>
          </CardContent>
        </Card>

        {/* Leave Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leave / Permission</CardDescription>
            <CardTitle>
              {todayLeave ? (
                <div className="flex items-center gap-2">
                  <span>{todayLeave.hours}h</span>
                  <LeaveTypeBadge type={todayLeave.type} />
                </div>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayLeave && <StatusBadge status={todayLeave.status} />}
          </CardContent>
        </Card>
      </div>

      {/* Time Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>Your logged work for this day</CardDescription>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No entries yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your work for this day
              </p>
              <Button onClick={() => setAddTimeOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Time Entry
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Item</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayEntries.map((entry) => {
                      const workItem = getWorkItem(entry.workItemId)
                      const project = workItem ? getProject(workItem.projectId) : null
                      const customer = project ? getCustomer(project.customerId) : null

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {workItem?.title || 'Unknown'}
                          </TableCell>
                          <TableCell>{customer?.companyName || '-'}</TableCell>
                          <TableCell>{project?.name || '-'}</TableCell>
                          <TableCell className="text-right font-mono">{entry.time}h</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {entry.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {todayEntries.map((entry) => {
                  const workItem = getWorkItem(entry.workItemId)
                  const project = workItem ? getProject(workItem.projectId) : null
                  const customer = project ? getCustomer(project.customerId) : null

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{workItem?.title || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {customer?.companyName} - {project?.name}
                        </p>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{entry.time}h</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Time (Mobile Sticky) */}
      <div className="fixed bottom-20 right-4 lg:hidden">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setAddTimeOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AddTimeDialog open={addTimeOpen} onOpenChange={setAddTimeOpen} defaultDate={dateStr} />
      <LeaveRequestDialog open={leaveRequestOpen} onOpenChange={setLeaveRequestOpen} />
    </div>
  )
}
