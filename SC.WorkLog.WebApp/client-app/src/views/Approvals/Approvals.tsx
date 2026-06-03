import { useState } from 'react'
import { useWorkLog } from 'lib/worklog-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import { Button } from 'components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'components/ui/tabs'
import { StatusBadge, LeaveTypeBadge } from 'components/status-badges'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from 'components/ui/sheet'
import { Badge } from 'components/ui/badge'
import {
  Check,
  X,
  Clock,
  Palmtree,
  User,
  Calendar,
  FileText,
  FileCheck,
} from 'lucide-react'
import { format } from 'date-fns'

export default function ApprovalsPage() {
  const {
    role,
    employees,
    leaveRequests,
    overtimeRequests,
    timeEntries,
    workItems,
    projects,
    customers,
    updateLeaveRequest,
    updateOvertimeRequest,
  } = useWorkLog()

  const [selectedOvertime, setSelectedOvertime] = useState<string | null>(null)

  const pendingLeave = leaveRequests.filter((l) => l.status === 'Pending approval')
  const pendingOvertime = overtimeRequests.filter((o) => o.status === 'Pending approval')

  const getEmployee = (id: string) => employees.find((e) => e.id === id)
  const getWorkItem = (id: string) => workItems.find((w) => w.id === id)
  const getProject = (projectId: string) => projects.find((p) => p.id === projectId)
  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId)

  const handleApproveLeave = (id: string) => {
    updateLeaveRequest(id, { status: 'Approved', adminNote: 'Approved' })
  }

  const handleRejectLeave = (id: string) => {
    updateLeaveRequest(id, { status: 'Rejected', adminNote: 'Rejected' })
  }

  const handleApproveOvertime = (id: string) => {
    const ot = overtimeRequests.find((o) => o.id === id)
    if (ot) {
      updateOvertimeRequest(id, { status: 'Approved', approvedHours: ot.calculatedHours })
    }
  }

  const handleRejectOvertime = (id: string) => {
    updateOvertimeRequest(id, { status: 'Rejected', approvedHours: 0 })
  }

  // Get overtime detail data
  const selectedOvertimeData = selectedOvertime
    ? overtimeRequests.find((o) => o.id === selectedOvertime)
    : null

  const overtimeEntries = selectedOvertimeData
    ? timeEntries.filter(
        (e) =>
          e.employeeId === selectedOvertimeData.employeeId &&
          e.date === selectedOvertimeData.date
      )
    : []

  if (role !== 'Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This page is only available for administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {pendingLeave.length + pendingOvertime.length} pending requests
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-3 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-0">
            <CardDescription className="flex items-center gap-2">
              <Palmtree className="h-4 w-4" />
              Pending Leave Requests
            </CardDescription>
            <CardTitle className="text-3xl">{pendingLeave.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-3 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-0">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Overtime Requests
            </CardDescription>
            <CardTitle className="text-3xl">{pendingOvertime.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leave" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leave" className="gap-2">
            <Palmtree className="h-4 w-4" />
            <span className="hidden sm:inline">Vacation & Permissions</span>
            <span className="sm:hidden">Leave</span>
            {pendingLeave.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingLeave.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-2">
            <Clock className="h-4 w-4" />
            <span>Overtime</span>
            {pendingOvertime.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingOvertime.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Leave Requests Tab */}
        <TabsContent value="leave" className="space-y-4">
          {pendingLeave.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Palmtree className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg">No pending leave requests</h3>
                <p className="text-sm text-muted-foreground">
                  All leave requests have been processed
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-card border rounded-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeave.map((request) => {
                      const employee = getEmployee(request.employeeId)
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </TableCell>
                          <TableCell>
                            <LeaveTypeBadge type={request.type} />
                          </TableCell>
                          <TableCell>{format(new Date(request.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-right font-mono">{request.hours}h</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(request.requestDate), 'MMM d')}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {request.employeeNote || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveLeave(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRejectLeave(request.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {pendingLeave.map((request) => {
                  const employee = getEmployee(request.employeeId)
                  return (
                    <Card key={request.id} className="py-3">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-medium">
                              {employee?.firstName} {employee?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(request.date), 'EEEE, MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <LeaveTypeBadge type={request.type} />
                            <p className="font-mono font-medium mt-1">{request.hours}h</p>
                          </div>
                        </div>
                        {request.employeeNote && (
                          <p className="text-sm text-muted-foreground mb-3 p-2 bg-muted rounded">
                            {request.employeeNote}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => handleRejectLeave(request.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => handleApproveLeave(request.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {/* Past Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Decisions</CardTitle>
              <CardDescription>Previously processed leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveRequests
                  .filter((l) => l.status !== 'Pending approval')
                  .slice(0, 5)
                  .map((request) => {
                    const employee = getEmployee(request.employeeId)
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.type} - {request.hours}h -{' '}
                            {format(new Date(request.date), 'MMM d')}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Tab */}
        <TabsContent value="overtime" className="space-y-4">
          {pendingOvertime.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="font-medium text-lg">No pending overtime requests</h3>
                <p className="text-sm text-muted-foreground">
                  All overtime requests have been processed
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-card border rounded-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Overtime Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOvertime.map((request) => {
                      const employee = getEmployee(request.employeeId)
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </TableCell>
                          <TableCell>{format(new Date(request.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-right font-mono">
                            +{request.calculatedHours}h
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedOvertime(request.id)}
                              >
                                <FileText className="mr-1 h-4 w-4" />
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveOvertime(request.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRejectOvertime(request.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {pendingOvertime.map((request) => {
                  const employee = getEmployee(request.employeeId)
                  return (
                    <Card key={request.id} className="py-3">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <p className="font-medium">
                              {employee?.firstName} {employee?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(request.date), 'EEEE, MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-medium text-blue-600">
                              +{request.calculatedHours}h
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full mb-2"
                          onClick={() => setSelectedOvertime(request.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View Day Details
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => handleRejectOvertime(request.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={() => handleApproveOvertime(request.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}

          {/* Past Overtime */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Decisions</CardTitle>
              <CardDescription>Previously processed overtime requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overtimeRequests
                  .filter((o) => o.status !== 'Pending approval')
                  .slice(0, 5)
                  .map((request) => {
                    const employee = getEmployee(request.employeeId)
                    return (
                      <div
                        key={request.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            +{request.calculatedHours}h - {format(new Date(request.date), 'MMM d')}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Overtime Detail Sheet */}
      <Sheet open={!!selectedOvertime} onOpenChange={(open) => !open && setSelectedOvertime(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Overtime Details</SheetTitle>
            <SheetDescription>
              Review all time entries for this day to verify overtime
            </SheetDescription>
          </SheetHeader>

          {selectedOvertimeData && (
            <div className="mt-6 space-y-6">
              {/* Summary */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {getEmployee(selectedOvertimeData.employeeId)?.firstName}{' '}
                    {getEmployee(selectedOvertimeData.employeeId)?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>{format(new Date(selectedOvertimeData.date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span className="text-blue-600 font-medium">
                    +{selectedOvertimeData.calculatedHours}h overtime
                  </span>
                </div>
              </div>

              {/* Time Entries */}
              <div>
                <h4 className="font-medium mb-3">Time Entries for this Day</h4>
                {overtimeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No time entries found</p>
                ) : (
                  <div className="space-y-3">
                    {overtimeEntries.map((entry) => {
                      const workItem = getWorkItem(entry.workItemId)
                      const project = workItem ? getProject(workItem.projectId) : null
                      const customer = project ? getCustomer(project.customerId) : null

                      return (
                        <div key={entry.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{workItem?.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {customer?.companyName} - {project?.name}
                              </p>
                            </div>
                            <span className="font-mono font-medium">{entry.time}h</span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {entry.description}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Total */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="font-medium">Total Hours</span>
                  <span className="font-mono text-lg">
                    {overtimeEntries.reduce((sum, e) => sum + e.time, 0)}h
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Expected:{' '}
                  {getEmployee(selectedOvertimeData.employeeId)?.expectedDailyHours || 8}h
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleRejectOvertime(selectedOvertimeData.id)
                    setSelectedOvertime(null)
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleApproveOvertime(selectedOvertimeData.id)
                    setSelectedOvertime(null)
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
