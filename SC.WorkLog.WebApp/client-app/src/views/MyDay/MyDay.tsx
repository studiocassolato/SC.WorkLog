import { useCallback, useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import { format, parseISO } from "date-fns"
import { useAuth } from "helpers/services/AuthContext"
import {
  createLeaveRequest,
  getLeaveRequests,
  getTimeCompleteness,
  getTimeEntries,
  getWorkItems,
  type DailyTimeCompletenessRowDto,
  type DailyTimeCompletenessStatus,
  type LeaveRequestDto,
  type LeaveRequestType,
  type RequestStatus,
  type TimeEntryListItemDto,
  type WorkItemListItemDto,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Badge } from "components/ui/badge"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import { AddTimeDialog } from "components/add-time-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import { Textarea } from "components/ui/textarea"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Palmtree,
  Plus,
  ShieldAlert,
} from "lucide-react"
import { cn } from "lib/utils"
import { toast } from "sonner"

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to view this day."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load My Day. Please try again."
}

const toApiDate = (date: Date) => format(date, "yyyy-MM-dd")
const formatHours = (hours: number) => `${hours.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`
const isHalfHourIncrement = (value: number) => Number.isFinite(value) && value > 0 && Number.isInteger(value * 2)

const requestStatusLabel = (status: RequestStatus) => {
  if (status === "PendingApproval") return "Pending approval"
  return status
}

const requestStatusClass = (status: RequestStatus) => {
  if (status === "Approved") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (status === "Rejected") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
}

const completenessLabel = (status: DailyTimeCompletenessStatus) => {
  if (status === "MissingHours") return "Missing hours"
  if (status === "OvertimePending") return "Overtime pending"
  if (status === "OvertimeApproved") return "Overtime approved"
  return "Complete"
}

export default function MyDayPage() {
  const { currentUser, isAdmin } = useAuth()
  const history = useHistory()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [addTimeOpen, setAddTimeOpen] = useState(false)
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntryListItemDto[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestDto[]>([])
  const [completeness, setCompleteness] = useState<DailyTimeCompletenessRowDto | null>(null)
  const [priorityItems, setPriorityItems] = useState<WorkItemListItemDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [leaveType, setLeaveType] = useState<LeaveRequestType>("Vacation")
  const [leaveDate, setLeaveDate] = useState("")
  const [leaveRequestHours, setLeaveRequestHours] = useState(8)
  const [leaveNote, setLeaveNote] = useState("")
  const [isSavingLeave, setIsSavingLeave] = useState(false)
  const [leaveSaveError, setLeaveSaveError] = useState<string | null>(null)

  const employeeId = currentUser?.employeeId ?? ""
  const dateStr = toApiDate(selectedDate)
  const isToday = dateStr === toApiDate(new Date())

  const loadMyDay = useCallback(async () => {
    if (!employeeId) {
      setTimeEntries([])
      setLeaveRequests([])
      setCompleteness(null)
      setPriorityItems([])
      setLoadError("Your WorkLog user is not linked to an Employee profile.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const [timeResponse, completenessResponse, leaveResponse, workItemResponse] = await Promise.all([
        getTimeEntries({ employeeId, dateFrom: dateStr, dateTo: dateStr }),
        getTimeCompleteness({ employeeId, dateFrom: dateStr, dateTo: dateStr }),
        getLeaveRequests({ employeeId, dateFrom: dateStr, dateTo: dateStr }),
        getWorkItems({ assigneeId: employeeId, includeClosed: false }),
      ])

      setTimeEntries(timeResponse)
      setLeaveRequests(leaveResponse)
      setCompleteness(completenessResponse.rows.find((row) => row.employeeId === employeeId) ?? completenessResponse.rows[0] ?? null)
      setPriorityItems(workItemResponse.filter((item) => item.isPriority))
    } catch (error) {
      setTimeEntries([])
      setLeaveRequests([])
      setCompleteness(null)
      setPriorityItems([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [dateStr, employeeId])

  useEffect(() => {
    void loadMyDay()
  }, [loadMyDay])

  useEffect(() => {
    const refresh = () => void loadMyDay()
    window.addEventListener("worklog:time-entry-saved", refresh)
    window.addEventListener("worklog:time-entry-updated", refresh)
    window.addEventListener("worklog:leave-request-saved", refresh)
    window.addEventListener("worklog:leave-request-updated", refresh)
    window.addEventListener("worklog:overtime-request-updated", refresh)
    return () => {
      window.removeEventListener("worklog:time-entry-saved", refresh)
      window.removeEventListener("worklog:time-entry-updated", refresh)
      window.removeEventListener("worklog:leave-request-saved", refresh)
      window.removeEventListener("worklog:leave-request-updated", refresh)
      window.removeEventListener("worklog:overtime-request-updated", refresh)
    }
  }, [loadMyDay])

  const totalHours = completeness?.workItemHours ?? timeEntries.reduce((sum, entry) => sum + entry.time, 0)
  const expectedHours = completeness?.expectedDailyHours ?? 0
  const leaveHours = completeness?.leaveHours ?? 0
  const dailyTotal = completeness?.dailyTotal ?? totalHours + leaveHours
  const missingHours = completeness?.missingHours ?? Math.max(expectedHours - dailyTotal, 0)
  const overtimeHours = completeness?.overtimeHours ?? Math.max(dailyTotal - expectedHours, 0)
  const completenessStatus = completeness?.status ?? "OK"
  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const openLeaveDialog = () => {
    setLeaveType("Vacation")
    setLeaveDate(dateStr)
    setLeaveRequestHours(expectedHours > 0 ? expectedHours : 8)
    setLeaveNote("")
    setLeaveSaveError(null)
    setLeaveRequestOpen(true)
  }

  const saveLeaveRequest = async () => {
    if (!employeeId) {
      setLeaveSaveError("Your WorkLog user is not linked to an Employee profile.")
      return
    }
    if (!leaveDate) {
      setLeaveSaveError("Date is required.")
      return
    }
    if (!isHalfHourIncrement(leaveRequestHours)) {
      setLeaveSaveError("Hours must be greater than zero and use 0.5 hour increments.")
      return
    }

    setIsSavingLeave(true)
    setLeaveSaveError(null)
    try {
      const created = await createLeaveRequest({
        employeeId,
        type: leaveType,
        date: leaveDate,
        hours: leaveRequestHours,
        employeeNote: leaveNote.trim() || null,
      })
      toast.success("Leave request submitted.")
      window.dispatchEvent(new CustomEvent("worklog:leave-request-saved", { detail: created }))
      setLeaveRequestOpen(false)
      await loadMyDay()
    } catch (error) {
      setLeaveSaveError(getErrorMessage(error))
    } finally {
      setIsSavingLeave(false)
    }
  }

  const renderStatusTitle = () => {
    if (completenessStatus === "MissingHours") {
      return (
        <>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="text-amber-600">Missing {formatHours(missingHours)}</span>
        </>
      )
    }
    if (completenessStatus === "OvertimePending") {
      return (
        <>
          <Clock className="h-5 w-5 text-blue-500" />
          <span className="text-blue-600">+{formatHours(overtimeHours)} overtime</span>
        </>
      )
    }
    if (completenessStatus === "OvertimeApproved") {
      return (
        <>
          <CheckCircle2 className="h-5 w-5 text-blue-500" />
          <span className="text-blue-600">Overtime approved</span>
        </>
      )
    }
    return (
      <>
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="text-green-600">Complete</span>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Day</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading your day..." : `${formatHours(totalHours)} logged, ${timeEntries.length} entries`}
              {isAdmin && <span className="ml-1">(your employee profile)</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openLeaveDialog} disabled={!employeeId}>
            <Palmtree className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Request Leave</span>
            <span className="sm:hidden">Leave</span>
          </Button>
          <Button onClick={() => setAddTimeOpen(true)} disabled={!employeeId}>
            <Plus className="mr-2 h-4 w-4" />
            Add Time
          </Button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load My Day</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {priorityItems.length > 0 && (
        <Card className="py-0 overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-base">My Priorities</CardTitle>
            <CardDescription>Backend Work Items assigned to you and marked as priority</CardDescription>
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
                {priorityItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer group"
                    onClick={() => history.push(`/work-items/${item.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.code || "-"}</TableCell>
                    <TableCell className="font-medium group-hover:text-primary transition-colors">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground">{item.customerName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.projectName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={item.priority === "Urgent" ? "destructive" : "default"} className="text-xs">
                        {item.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-48 justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Logged Hours</CardDescription>
            <CardTitle className="text-3xl">
              {formatHours(totalHours)}
              <span className="text-lg text-muted-foreground"> / {formatHours(expectedHours)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  completenessStatus === "OK" && "bg-green-500",
                  completenessStatus === "MissingHours" && "bg-amber-500",
                  completenessStatus.startsWith("Overtime") && "bg-blue-500",
                )}
                style={{ width: `${expectedHours > 0 ? Math.min((totalHours / expectedHours) * 100, 100) : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Day Status</CardDescription>
            <CardTitle className="flex items-center gap-2">{renderStatusTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{completenessLabel(completenessStatus)}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Time Entries</CardDescription>
            <CardTitle className="text-3xl">{timeEntries.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across {new Set(timeEntries.map((entry) => entry.workItemId)).size} work items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Leave / Permission</CardDescription>
            <CardTitle>
              {leaveRequests.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{formatHours(leaveHours)}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {leaveRequests.length} request{leaveRequests.length !== 1 ? "s" : ""} on this day
            </p>
          </CardContent>
        </Card>
      </div>

      {leaveRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave / Permission Requests</CardTitle>
            <CardDescription>Existing backend requests for this date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaveRequests.map((request) => (
              <div key={request.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{request.type} · {formatHours(request.hours)}</p>
                  {request.employeeNote && <p className="text-sm text-muted-foreground">{request.employeeNote}</p>}
                </div>
                <Badge variant="secondary" className={cn("w-fit font-medium", requestStatusClass(request.status))}>
                  {requestStatusLabel(request.status)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Time Entries</CardTitle>
          <CardDescription>Your backend time entries for this day</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">Loading time entries...</p>
            </div>
          ) : timeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No entries yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Start tracking your work for this day</p>
              <Button onClick={() => setAddTimeOpen(true)} disabled={!employeeId}>
                <Plus className="mr-2 h-4 w-4" />
                Add Time Entry
              </Button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Work Item</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-muted-foreground">{format(parseISO(entry.date), "MMM d")}</TableCell>
                        <TableCell className="font-medium">
                          {entry.workItemCode ? `${entry.workItemCode} - ` : ""}{entry.workItemTitle || "Work item"}
                        </TableCell>
                        <TableCell>{entry.customerName || "-"}</TableCell>
                        <TableCell>{entry.projectName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn("font-medium", requestStatusClass(entry.status))}>
                            {requestStatusLabel(entry.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatHours(entry.time)}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {entry.notes || entry.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="My Day edit is pending; use global Time Entries for now">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {timeEntries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.workItemCode ? `${entry.workItemCode} - ` : ""}{entry.workItemTitle || "Work item"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.customerName || "-"} · {entry.projectName || "-"}
                      </p>
                      <div className="mt-2">
                        <Badge variant="secondary" className={cn("font-medium", requestStatusClass(entry.status))}>
                          {requestStatusLabel(entry.status)}
                        </Badge>
                      </div>
                      {(entry.notes || entry.description) && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {entry.notes || entry.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{formatHours(entry.time)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="My Day edit is pending; use global Time Entries for now">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="fixed bottom-20 right-4 lg:hidden">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setAddTimeOpen(true)}
          disabled={!employeeId}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <AddTimeDialog open={addTimeOpen} onOpenChange={setAddTimeOpen} defaultDate={dateStr} />
      <Dialog open={leaveRequestOpen} onOpenChange={setLeaveRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a vacation or permission request for the selected day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {leaveSaveError && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Unable to submit leave request</AlertTitle>
                <AlertDescription>{leaveSaveError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={leaveType} onValueChange={(value) => setLeaveType(value as LeaveRequestType)} disabled={isSavingLeave}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vacation">Vacation</SelectItem>
                  <SelectItem value="Permission">Permission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={leaveDate} onChange={(event) => setLeaveDate(event.target.value)} disabled={isSavingLeave} />
              </div>
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={leaveRequestHours}
                  onChange={(event) => setLeaveRequestHours(parseFloat(event.target.value) || 0)}
                  disabled={isSavingLeave}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Employee note (optional)</Label>
              <Textarea
                placeholder="Reason or context for the request"
                value={leaveNote}
                onChange={(event) => setLeaveNote(event.target.value)}
                rows={3}
                disabled={isSavingLeave}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveRequestOpen(false)} disabled={isSavingLeave}>
              Cancel
            </Button>
            <Button onClick={saveLeaveRequest} disabled={isSavingLeave}>
              {isSavingLeave ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
