import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { useAuth } from 'helpers/services/AuthContext'
import {
  approveLeaveRequest,
  approveOvertimeRequest,
  getActiveEmployees,
  getLeaveRequests,
  getOvertimeRequest,
  getOvertimeRequests,
  rejectLeaveRequest,
  rejectOvertimeRequest,
  type EmployeeDto,
  type LeaveRequestDto,
  type LeaveRequestType,
  type OvertimeRequestDto,
  type RequestStatus,
} from 'helpers/services/worklog-api'
import { Alert, AlertDescription, AlertTitle } from 'components/ui/alert'
import { Badge } from 'components/ui/badge'
import { Button } from 'components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog'
import { Input } from 'components/ui/input'
import { Label } from 'components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table'
import { Textarea } from 'components/ui/textarea'
import {
  Check,
  Clock,
  FileCheck,
  Loader2,
  Palmtree,
  ShieldAlert,
  X,
} from 'lucide-react'
import { cn } from 'lib/utils'
import { toast } from 'sonner'

const getErrorMessage = (error: unknown) => {
  const response = typeof error === 'object' && error && 'response' in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const errors = response?.data && typeof response.data === 'object'
    ? ((response.data as { errors?: unknown; Errors?: unknown }).errors ?? (response.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (response?.status === 401) return 'Authentication required. Please sign in again.'
  if (response?.status === 403) return 'You do not have permission to manage approvals.'
  if (Array.isArray(errors) && errors.every((item) => typeof item === 'string')) return errors.join(' ')
  if (error instanceof Error && error.message) return error.message
  return 'Unable to complete the request. Please try again.'
}

const requestStatusLabel = (status: RequestStatus) => {
  if (status === 'PendingApproval') return 'Pending approval'
  return status
}

const requestStatusClass = (status: RequestStatus) => {
  if (status === 'Approved') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  if (status === 'Rejected') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
}

const formatHours = (hours: number) => `${hours.toLocaleString('en-US', { maximumFractionDigits: 2 })}h`
const isHalfHourIncrement = (value: number) => Number.isFinite(value) && value > 0 && Number.isInteger(value * 2)

type StatusFilter = RequestStatus | 'All'
type LeaveTypeFilter = LeaveRequestType | 'All'
type ApprovalAction = 'approve' | 'reject'

export default function ApprovalsPage() {
  const { isAdmin } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([])
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequestDto[]>([])
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PendingApproval')
  const [employeeFilter, setEmployeeFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState<LeaveTypeFilter>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestDto | null>(null)
  const [selectedLeaveAction, setSelectedLeaveAction] = useState<ApprovalAction>('approve')
  const [leaveAdminNote, setLeaveAdminNote] = useState('')
  const [leaveActionError, setLeaveActionError] = useState<string | null>(null)
  const [isSavingLeaveAction, setIsSavingLeaveAction] = useState(false)
  const [selectedOvertime, setSelectedOvertime] = useState<OvertimeRequestDto | null>(null)
  const [selectedOvertimeAction, setSelectedOvertimeAction] = useState<ApprovalAction>('approve')
  const [overtimeAdminNote, setOvertimeAdminNote] = useState('')
  const [approvedOvertimeHours, setApprovedOvertimeHours] = useState(0)
  const [overtimeActionError, setOvertimeActionError] = useState<string | null>(null)
  const [isSavingOvertimeAction, setIsSavingOvertimeAction] = useState(false)

  const loadApprovals = useCallback(async () => {
    if (!isAdmin) {
      setLeaveRequests([])
      setOvertimeRequests([])
      setEmployees([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const commonFilter = {
        employeeId: employeeFilter === 'All' ? undefined : employeeFilter,
        status: statusFilter === 'All' ? undefined : statusFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }
      const [leaveResponse, overtimeResponse, employeeResponse] = await Promise.all([
        getLeaveRequests({
          ...commonFilter,
          type: typeFilter === 'All' ? undefined : typeFilter,
        }),
        getOvertimeRequests(commonFilter),
        getActiveEmployees(),
      ])
      const overtimeDetails = await Promise.all(overtimeResponse.map((request) => getOvertimeRequest(request.id)))
      setLeaveRequests(leaveResponse)
      setOvertimeRequests(overtimeDetails)
      setEmployees(employeeResponse)
    } catch (error) {
      setLeaveRequests([])
      setOvertimeRequests([])
      setEmployees([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, employeeFilter, isAdmin, statusFilter, typeFilter])

  useEffect(() => {
    void loadApprovals()
  }, [loadApprovals])

  const pendingLeaveCount = useMemo(
    () => leaveRequests.filter((request) => request.status === 'PendingApproval').length,
    [leaveRequests],
  )
  const pendingOvertimeCount = useMemo(
    () => overtimeRequests.filter((request) => request.status === 'PendingApproval').length,
    [overtimeRequests],
  )

  const openLeaveActionDialog = (request: LeaveRequestDto, action: ApprovalAction) => {
    setSelectedLeave(request)
    setSelectedLeaveAction(action)
    setLeaveAdminNote('')
    setLeaveActionError(null)
  }

  const openOvertimeActionDialog = (request: OvertimeRequestDto, action: ApprovalAction) => {
    setSelectedOvertime(request)
    setSelectedOvertimeAction(action)
    setApprovedOvertimeHours(request.calculatedHours)
    setOvertimeAdminNote('')
    setOvertimeActionError(null)
  }

  const closeLeaveActionDialog = () => {
    if (isSavingLeaveAction) return
    setSelectedLeave(null)
    setLeaveActionError(null)
  }

  const closeOvertimeActionDialog = () => {
    if (isSavingOvertimeAction) return
    setSelectedOvertime(null)
    setOvertimeActionError(null)
  }

  const saveLeaveAction = async () => {
    if (!selectedLeave) return

    setIsSavingLeaveAction(true)
    setLeaveActionError(null)
    try {
      const request = { id: selectedLeave.id, adminNote: leaveAdminNote.trim() || null }
      const updated = selectedLeaveAction === 'approve'
        ? await approveLeaveRequest(request)
        : await rejectLeaveRequest(request)
      toast.success(selectedLeaveAction === 'approve' ? 'Leave request approved.' : 'Leave request rejected.')
      window.dispatchEvent(new CustomEvent('worklog:leave-request-updated', { detail: updated }))
      setSelectedLeave(null)
      await loadApprovals()
    } catch (error) {
      setLeaveActionError(getErrorMessage(error))
    } finally {
      setIsSavingLeaveAction(false)
    }
  }

  const saveOvertimeAction = async () => {
    if (!selectedOvertime) return
    if (selectedOvertimeAction === 'approve' && !isHalfHourIncrement(approvedOvertimeHours)) {
      setOvertimeActionError('Approved hours must be greater than zero and use 0.5 hour increments.')
      return
    }

    setIsSavingOvertimeAction(true)
    setOvertimeActionError(null)
    try {
      const updated = selectedOvertimeAction === 'approve'
        ? await approveOvertimeRequest({
            id: selectedOvertime.id,
            approvedHours: approvedOvertimeHours,
            adminNote: overtimeAdminNote.trim() || null,
          })
        : await rejectOvertimeRequest({
            id: selectedOvertime.id,
            adminNote: overtimeAdminNote.trim() || null,
          })
      toast.success(selectedOvertimeAction === 'approve' ? 'Overtime request approved.' : 'Overtime request rejected.')
      window.dispatchEvent(new CustomEvent('worklog:overtime-request-updated', { detail: updated }))
      setSelectedOvertime(null)
      await loadApprovals()
    } catch (error) {
      setOvertimeActionError(getErrorMessage(error))
    } finally {
      setIsSavingOvertimeAction(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">This page is only available for administrators.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {pendingLeaveCount + pendingOvertimeCount} pending requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-3 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-0">
            <CardDescription className="flex items-center gap-2">
              <Palmtree className="h-4 w-4" />
              Pending Leave Requests
            </CardDescription>
            <CardTitle className="text-3xl">{pendingLeaveCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-3 border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-0">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Overtime Requests
            </CardDescription>
            <CardTitle className="text-3xl">{pendingOvertimeCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load approvals</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Approval Filters</CardTitle>
          <CardDescription>Shared filters are backed by LeaveRequest and OvertimeRequest APIs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  <SelectItem value="PendingApproval">Pending approval</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Leave type</Label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as LeaveTypeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All leave types</SelectItem>
                  <SelectItem value="Vacation">Vacation</SelectItem>
                  <SelectItem value="Permission">Permission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date from</Label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date to</Label>
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Approve or reject backend vacation and permission requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading leave requests..." />
          ) : leaveRequests.length === 0 ? (
            <EmptyState icon={<Palmtree className="h-12 w-12 text-muted-foreground/50 mb-4" />} title="No leave requests found" />
          ) : (
            <>
              <div className="hidden md:block rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Employee note</TableHead>
                      <TableHead>Admin note</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employeeName ?? 'Unknown employee'}</TableCell>
                        <TableCell>{request.type}</TableCell>
                        <TableCell>{format(parseISO(request.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right font-mono">{formatHours(request.hours)}</TableCell>
                        <TableCell>
                          <StatusPill status={request.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{format(parseISO(request.requestDate), 'MMM d')}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{request.employeeNote || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{request.adminNote || '-'}</TableCell>
                        <TableCell>
                          {request.status === 'PendingApproval' ? (
                            <ApprovalButtons
                              onApprove={() => openLeaveActionDialog(request, 'approve')}
                              onReject={() => openLeaveActionDialog(request, 'reject')}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {leaveRequests.map((request) => (
                  <Card key={request.id} className="py-3">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{request.employeeName ?? 'Unknown employee'}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(request.date), 'EEEE, MMM d, yyyy')}</p>
                        </div>
                        <div className="text-right">
                          <StatusPill status={request.status} />
                          <p className="font-mono font-medium mt-1">{formatHours(request.hours)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.type}</p>
                      {request.employeeNote && <p className="text-sm text-muted-foreground rounded bg-muted p-2">{request.employeeNote}</p>}
                      {request.adminNote && <p className="text-sm text-muted-foreground rounded border p-2">Admin note: {request.adminNote}</p>}
                      {request.status === 'PendingApproval' && (
                        <div className="flex gap-2">
                          <Button className="flex-1" variant="outline" onClick={() => openLeaveActionDialog(request, 'reject')}>
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button className="flex-1" onClick={() => openLeaveActionDialog(request, 'approve')}>
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overtime Requests</CardTitle>
          <CardDescription>Review day entries and approve or reject calculated overtime.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingState label="Loading overtime requests..." />
          ) : overtimeRequests.length === 0 ? (
            <EmptyState icon={<Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />} title="No overtime requests found" />
          ) : (
            <>
              <div className="hidden md:block rounded-sm border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Calculated</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Day entries</TableHead>
                      <TableHead>Admin note</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.employeeName ?? 'Unknown employee'}</TableCell>
                        <TableCell>{format(parseISO(request.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-right font-mono">{formatHours(request.calculatedHours)}</TableCell>
                        <TableCell className="text-right font-mono">{request.approvedHours > 0 ? formatHours(request.approvedHours) : '-'}</TableCell>
                        <TableCell>
                          <StatusPill status={request.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDayEntrySummary(request)}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{request.adminNote || '-'}</TableCell>
                        <TableCell>
                          {request.status === 'PendingApproval' ? (
                            <ApprovalButtons
                              onApprove={() => openOvertimeActionDialog(request, 'approve')}
                              onReject={() => openOvertimeActionDialog(request, 'reject')}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Processed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {overtimeRequests.map((request) => (
                  <Card key={request.id} className="py-3">
                    <CardContent className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{request.employeeName ?? 'Unknown employee'}</p>
                          <p className="text-sm text-muted-foreground">{format(parseISO(request.date), 'EEEE, MMM d, yyyy')}</p>
                        </div>
                        <StatusPill status={request.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <Metric label="Calculated" value={formatHours(request.calculatedHours)} />
                        <Metric label="Approved" value={request.approvedHours > 0 ? formatHours(request.approvedHours) : '-'} />
                        <Metric label="Entries" value={formatDayEntrySummary(request)} />
                      </div>
                      {request.adminNote && <p className="text-sm text-muted-foreground rounded border p-2">Admin note: {request.adminNote}</p>}
                      {request.status === 'PendingApproval' && (
                        <div className="flex gap-2">
                          <Button className="flex-1" variant="outline" onClick={() => openOvertimeActionDialog(request, 'reject')}>
                            <X className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button className="flex-1" onClick={() => openOvertimeActionDialog(request, 'approve')}>
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLeave} onOpenChange={(open) => !open && closeLeaveActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLeaveAction === 'approve' ? 'Approve leave request' : 'Reject leave request'}</DialogTitle>
            <DialogDescription>
              {selectedLeave ? `${selectedLeave.employeeName ?? 'Employee'} · ${selectedLeave.type} · ${formatHours(selectedLeave.hours)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <ActionError error={leaveActionError} />
          <AdminNote value={leaveAdminNote} onChange={setLeaveAdminNote} disabled={isSavingLeaveAction} action={selectedLeaveAction} />
          <DialogFooter>
            <Button variant="outline" onClick={closeLeaveActionDialog} disabled={isSavingLeaveAction}>
              Cancel
            </Button>
            <Button variant={selectedLeaveAction === 'reject' ? 'destructive' : 'default'} onClick={saveLeaveAction} disabled={isSavingLeaveAction}>
              {isSavingLeaveAction ? 'Saving...' : selectedLeaveAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOvertime} onOpenChange={(open) => !open && closeOvertimeActionDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedOvertimeAction === 'approve' ? 'Approve overtime request' : 'Reject overtime request'}</DialogTitle>
            <DialogDescription>
              {selectedOvertime ? `${selectedOvertime.employeeName ?? 'Employee'} · ${formatHours(selectedOvertime.calculatedHours)} calculated` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ActionError error={overtimeActionError} />
            {selectedOvertimeAction === 'approve' && (
              <div className="space-y-2">
                <Label>Approved hours</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={approvedOvertimeHours}
                  onChange={(event) => setApprovedOvertimeHours(parseFloat(event.target.value) || 0)}
                  disabled={isSavingOvertimeAction}
                />
              </div>
            )}
            {selectedOvertime && (
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium mb-2">Day time entries</p>
                {selectedOvertime.dayTimeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No time entries returned for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedOvertime.dayTimeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{entry.workItemCode ? `${entry.workItemCode} - ` : ''}{entry.workItemTitle ?? 'Work item'}</p>
                          <p className="text-muted-foreground truncate">{entry.customerName ?? '-'} · {entry.projectName ?? '-'}</p>
                        </div>
                        <span className="font-mono">{formatHours(entry.time)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <AdminNote value={overtimeAdminNote} onChange={setOvertimeAdminNote} disabled={isSavingOvertimeAction} action={selectedOvertimeAction} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeOvertimeActionDialog} disabled={isSavingOvertimeAction}>
              Cancel
            </Button>
            <Button variant={selectedOvertimeAction === 'reject' ? 'destructive' : 'default'} onClick={saveOvertimeAction} disabled={isSavingOvertimeAction}>
              {isSavingOvertimeAction ? 'Saving...' : selectedOvertimeAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <Badge variant="secondary" className={cn('font-medium', requestStatusClass(status))}>
      {requestStatusLabel(status)}
    </Badge>
  )
}

function ApprovalButtons({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={onApprove}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onReject}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon}
      <h3 className="font-medium text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground">Adjust filters or wait for new employee requests.</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono font-medium">{value}</p>
    </div>
  )
}

function ActionError({ error }: { error: string | null }) {
  if (!error) return null

  return (
    <Alert variant="destructive">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Unable to update request</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )
}

function AdminNote({
  value,
  onChange,
  disabled,
  action,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  action: ApprovalAction
}) {
  return (
    <div className="space-y-2">
      <Label>Admin note (optional)</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={action === 'approve' ? 'Approval note' : 'Rejection reason'}
        disabled={disabled}
      />
    </div>
  )
}

function formatDayEntrySummary(request: OvertimeRequestDto) {
  if (request.dayTimeEntries.length === 0) return '-'
  const total = request.dayTimeEntries.reduce((sum, entry) => sum + entry.time, 0)
  return `${request.dayTimeEntries.length} entries · ${formatHours(total)}`
}
