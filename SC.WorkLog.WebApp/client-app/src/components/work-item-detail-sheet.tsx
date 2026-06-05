import { useWorkLog } from 'lib/worklog-context'
import { Button } from 'components/ui/button'
import { Badge } from 'components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from 'components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import { StatusBadge, PriorityBadge } from 'components/status-badges'
import { Separator } from 'components/ui/separator'
import { Clock, ExternalLink, User, Calendar, Building2, FolderKanban } from 'lucide-react'
import { getWorkItemStatusName } from 'lib/mock-data'

interface WorkItemDetailSheetProps {
  workItemId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddTime: (workItemId: string) => void
}

export function WorkItemDetailSheet({
  workItemId,
  open,
  onOpenChange,
  onAddTime,
}: WorkItemDetailSheetProps) {
  const { role, workItems, projects, customers, employees, timeEntries } = useWorkLog()

  if (!workItemId) return null

  const workItem = workItems.find((w) => w.id === workItemId)
  if (!workItem) return null

  const project = projects.find((p) => p.id === workItem.projectId)
  const customer = project ? customers.find((c) => c.id === project.customerId) : null
  const assignee = workItem.assigneeId ? employees.find((e) => e.email.toLowerCase() === workItem.assigneeId?.toLowerCase()) : null

  const itemTimeEntries = timeEntries.filter((e) => e.workItemId === workItemId)
  const totalTime = itemTimeEntries.reduce((sum, e) => sum + e.time, 0)
  const totalApprovedTime = itemTimeEntries.reduce((sum, e) => sum + e.approvedTime, 0)

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id)
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{workItem.title}</SheetTitle>
              {workItem.externalReference && (
                <Badge variant="outline" className="mt-1">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  {workItem.externalReference}
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center gap-2">
            <StatusBadge status={getWorkItemStatusName(workItem.statusKey)} />
            <PriorityBadge priority={workItem.priority} />
          </div>

          {/* Description */}
          {workItem.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{workItem.description}</p>
            </div>
          )}

          <Separator />

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="text-sm font-medium">{customer?.companyName || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FolderKanban className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-medium">{project?.name || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Assignee</p>
                {assignee ? (
                  <p className="text-sm font-medium">
                    {assignee.firstName} {assignee.lastName}
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">Unassigned</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Reporter</p>
                <p className="text-sm font-medium">{workItem.reporter || '-'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Opened</p>
                <p className="text-sm font-medium">
                  {new Date(workItem.openingDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time Summary */}
          <div>
            <h4 className="text-sm font-medium mb-3">Time Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Logged Hours</p>
                <p className="text-2xl font-bold">{totalTime}h</p>
              </div>
              {role === 'Admin' && (
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Approved Hours</p>
                  <p className="text-2xl font-bold">{totalApprovedTime}h</p>
                </div>
              )}
            </div>
          </div>

          {/* Time Entries Table (Admin only) */}
          {role === 'Admin' && itemTimeEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Time Entries</h4>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemTimeEntries.slice(0, 10).map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(entry.employeeId)}
                        </TableCell>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">{entry.time}h</TableCell>
                        <TableCell className="text-right font-mono">{entry.approvedTime}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {itemTimeEntries.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Showing 10 of {itemTimeEntries.length} entries
                </p>
              )}
            </div>
          )}

          {/* Employee Time Entries Summary */}
          {role === 'Employee' && itemTimeEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Time Entries</h4>
              <div className="space-y-2">
                {itemTimeEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(entry.date).toLocaleDateString()}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <span className="font-mono">{entry.time}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button className="w-full" onClick={() => onAddTime(workItem.id)}>
            <Clock className="mr-2 h-4 w-4" />
            Add Time Entry
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
