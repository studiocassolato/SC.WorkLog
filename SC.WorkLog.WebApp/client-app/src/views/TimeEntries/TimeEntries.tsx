import { useCallback, useEffect, useMemo, useState } from "react"
import { useHistory } from "react-router-dom"
import { format, parseISO, subDays } from "date-fns"
import {
  CalendarIcon,
  Clock,
  Edit2,
  ExternalLink,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react"
import { useAuth } from "helpers/services/AuthContext"
import {
  getActiveEmployees,
  getProjects,
  getTimeEntries,
  getWorkItems,
  updateApprovedTime,
  updateTimeEntry,
  type EmployeeDto,
  type ProjectListItemDto,
  type RequestStatus,
  type TimeEntryFilter,
  type TimeEntryListItemDto,
  type WorkItemListItemDto,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Badge } from "components/ui/badge"
import { Button } from "components/ui/button"
import { Card, CardContent } from "components/ui/card"
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
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"
import { Calendar } from "components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import { Textarea } from "components/ui/textarea"
import { LevelBadge } from "components/status-badges"
import { cn } from "lib/utils"
import { toast } from "sonner"

type StatusFilter = "all" | RequestStatus

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to manage this time entry."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to load time entries. Please try again."
}

const toApiDate = (date: Date) => format(date, "yyyy-MM-dd")
const formatDate = (value: string) => format(parseISO(value), "MMM d, yyyy")
const formatHours = (value: number | null | undefined) => value == null ? "-" : `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}h`
const isHalfHourIncrement = (value: number) => Number.isFinite(value) && value >= 0 && Number.isInteger(value * 2)

const statusLabel = (status: RequestStatus) => {
  if (status === "PendingApproval") return "Pending approval"
  return status
}

const statusBadgeClass = (status: RequestStatus) => {
  if (status === "Approved") return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
  if (status === "Rejected") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
}

const getWorkItemLabel = (workItem: WorkItemListItemDto) => {
  const code = workItem.code ? `${workItem.code} - ` : ""
  const project = workItem.projectName ? ` · ${workItem.projectName}` : ""
  const customer = workItem.customerName ? ` · ${workItem.customerName}` : ""
  return `${code}${workItem.title}${project}${customer}`
}

export default function TimeEntriesPage() {
  const { isAdmin } = useAuth()
  const history = useHistory()
  const [entries, setEntries] = useState<TimeEntryListItemDto[]>([])
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [projects, setProjects] = useState<ProjectListItemDto[]>([])
  const [workItemOptions, setWorkItemOptions] = useState<WorkItemListItemDto[]>([])
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 7))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [customerFilter, setCustomerFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editEntry, setEditEntry] = useState<TimeEntryListItemDto | null>(null)
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState(0)
  const [editWorkItemId, setEditWorkItemId] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editApprovedTime, setEditApprovedTime] = useState(0)
  const [editAdminNote, setEditAdminNote] = useState("")
  const [editWorkItemSearch, setEditWorkItemSearch] = useState("")
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const customers = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((project) => {
      if (project.customerId && project.customerName) map.set(project.customerId, project.customerName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])

  const projectsForCustomer = useMemo(
    () => customerFilter === "all" ? projects : projects.filter((project) => project.customerId === customerFilter),
    [customerFilter, projects],
  )

  const totalHours = entries.reduce((sum, entry) => sum + entry.time, 0)
  const totalApprovedHours = entries.reduce((sum, entry) => sum + (entry.approvedTime ?? 0), 0)

  const loadReferences = useCallback(async () => {
    const [projectResponse, employeeResponse] = await Promise.all([
      getProjects(),
      isAdmin ? getActiveEmployees() : Promise.resolve([]),
    ])
    setProjects(projectResponse)
    setEmployees(employeeResponse)
  }, [isAdmin])

  const loadEntries = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const filter: TimeEntryFilter = {
        dateFrom: toApiDate(dateFrom),
        dateTo: toApiDate(dateTo),
        employeeId: isAdmin && employeeFilter !== "all" ? employeeFilter : undefined,
        customerId: customerFilter !== "all" ? customerFilter : undefined,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }
      const response = await getTimeEntries(filter)
      setEntries(response)
    } catch (error) {
      setEntries([])
      setLoadError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [customerFilter, dateFrom, dateTo, employeeFilter, isAdmin, projectFilter, statusFilter])

  useEffect(() => {
    void loadReferences().catch((error) => setLoadError(getErrorMessage(error)))
  }, [loadReferences])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  useEffect(() => {
    const handleSaved = () => void loadEntries()
    window.addEventListener("worklog:time-entry-saved", handleSaved)
    window.addEventListener("worklog:time-entry-updated", handleSaved)
    return () => {
      window.removeEventListener("worklog:time-entry-saved", handleSaved)
      window.removeEventListener("worklog:time-entry-updated", handleSaved)
    }
  }, [loadEntries])

  useEffect(() => {
    if (!editEntry) return

    const loadWorkItemOptions = async () => {
      setIsLoadingWorkItems(true)
      try {
        const response = await getWorkItems({ search: editWorkItemSearch.trim() || undefined, includeClosed: true })
        const hasCurrent = response.some((workItem) => workItem.id === editEntry.workItemId)
        setWorkItemOptions(hasCurrent ? response : [
          {
            id: editEntry.workItemId,
            code: editEntry.workItemCode,
            projectId: editEntry.projectId,
            projectName: editEntry.projectName,
            customerId: editEntry.customerId,
            customerName: editEntry.customerName,
            title: editEntry.workItemTitle || "Current work item",
            description: null,
            statusKey: editEntry.status,
            statusName: statusLabel(editEntry.status),
            statusTypology: "InProgress",
            customerDisplayName: null,
            isClosed: false,
            priority: "Normal",
            assigneeId: null,
            assigneeName: null,
            origin: "Manual",
            externalReference: null,
            openingDate: editEntry.date,
            closingDate: null,
            isPriority: false,
            loggedHours: 0,
            approvedHours: null,
          },
          ...response,
        ])
      } catch (error) {
        setSaveError(getErrorMessage(error))
      } finally {
        setIsLoadingWorkItems(false)
      }
    }

    const handle = window.setTimeout(() => void loadWorkItemOptions(), 250)
    return () => window.clearTimeout(handle)
  }, [editEntry, editWorkItemSearch])

  const openEditDialog = (entry: TimeEntryListItemDto) => {
    setEditEntry(entry)
    setEditDate(entry.date.split("T")[0])
    setEditTime(entry.time)
    setEditWorkItemId(entry.workItemId)
    setEditDescription(entry.description || "")
    setEditNotes(entry.notes || "")
    setEditApprovedTime(entry.approvedTime ?? entry.time)
    setEditAdminNote(entry.adminNote || "")
    setEditWorkItemSearch("")
    setSaveError(null)
  }

  const closeEditDialog = () => {
    setEditEntry(null)
    setWorkItemOptions([])
    setSaveError(null)
  }

  const saveEdit = async () => {
    if (!editEntry) return
    if (!editWorkItemId) {
      setSaveError("Work Item is required.")
      return
    }
    if (!editDate) {
      setSaveError("Date is required.")
      return
    }
    if (!isHalfHourIncrement(editTime) || editTime <= 0) {
      setSaveError("Time must be greater than zero and use 0.5 hour increments.")
      return
    }
    if (isAdmin && !isHalfHourIncrement(editApprovedTime)) {
      setSaveError("Approved time must be zero or greater and use 0.5 hour increments.")
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await updateTimeEntry({
        id: editEntry.id,
        workItemId: editWorkItemId,
        date: editDate,
        time: editTime,
        description: editDescription.trim() || null,
        notes: editNotes.trim() || null,
      })
      if (isAdmin) {
        await updateApprovedTime({
          id: editEntry.id,
          approvedTime: editApprovedTime,
          adminNote: editAdminNote.trim() || null,
        })
      }
      toast.success("Time entry updated.")
      window.dispatchEvent(new CustomEvent("worklog:time-entry-updated", { detail: { id: editEntry.id, projectId: editEntry.projectId, workItemId: editEntry.workItemId } }))
      closeEditDialog()
      await loadEntries()
    } catch (error) {
      setSaveError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const resetFilters = () => {
    setDateFrom(subDays(new Date(), 7))
    setDateTo(new Date())
    setEmployeeFilter("all")
    setCustomerFilter("all")
    setProjectFilter("all")
    setStatusFilter("all")
  }

  const handleCustomerChange = (value: string) => {
    setCustomerFilter(value)
    setProjectFilter("all")
  }

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Date From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Date To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateTo, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
          </PopoverContent>
        </Popover>
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label>Employee</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Customer</Label>
        <Select value={customerFilter} onValueChange={handleCustomerChange}>
          <SelectTrigger>
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Project</Label>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projectsForCustomer.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PendingApproval">Pending approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Entries</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading entries..." : `${entries.length} entries, ${formatHours(totalHours)} total${isAdmin ? `, ${formatHours(totalApprovedHours)} approved` : ""}`}
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load time entries</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="hidden lg:flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateFrom, "MMM d")} - {format(dateTo, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {isAdmin && (
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All employees</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={customerFilter} onValueChange={handleCustomerChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projectsForCustomer.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PendingApproval">Pending</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden w-full">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>

      <Card className="hidden md:block py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>Customer</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Work Item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Time</TableHead>
              {isAdmin && (
                <>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </>
              )}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 12 : 8} className="h-32 text-center text-muted-foreground">
                  Loading time entries...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 12 : 8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No time entries found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const value = entry.calculatedValue ?? null

                return (
                  <TableRow key={entry.id} className="group">
                    <TableCell className="font-medium">{formatDate(entry.date)}</TableCell>
                    {isAdmin && <TableCell className="text-muted-foreground">{entry.employeeName || "-"}</TableCell>}
                    <TableCell className="text-muted-foreground">{entry.customerName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.projectName || "-"}</TableCell>
                    <TableCell className="max-w-xs">
                      <button
                        className="text-left truncate hover:text-primary hover:underline flex items-center gap-1"
                        onClick={() => history.push(`/work-items/${entry.workItemId}`)}
                      >
                        <span className="truncate">
                          {entry.workItemCode ? `${entry.workItemCode} - ` : ""}{entry.workItemTitle || "Work item"}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn("font-medium", statusBadgeClass(entry.status))}>
                        {statusLabel(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-muted-foreground truncate">
                      {entry.notes || entry.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{formatHours(entry.time)}</TableCell>
                    {isAdmin && (
                      <>
                        <TableCell className="text-right font-mono tabular-nums">
                          <span className={cn(entry.approvedTime !== entry.time && "text-amber-600 font-medium")}>
                            {formatHours(entry.approvedTime)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.employeeLevelSnapshot ? <LevelBadge level={entry.employeeLevelSnapshot} /> : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {value && value > 0 ? value.toLocaleString("en-US", { style: "currency", currency: "EUR" }) : "-"}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(entry)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="md:hidden space-y-3">
        {!isLoading && entries.map((entry) => {
          const value = entry.calculatedValue ?? null

          return (
            <Card key={entry.id} className="py-3">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {entry.workItemCode ? `${entry.workItemCode} - ` : ""}{entry.workItemTitle || "Work item"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.customerName || "-"} · {entry.projectName || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(entry.date)}
                      {isAdmin && entry.employeeName ? ` · ${entry.employeeName}` : ""}
                    </p>
                    <Badge variant="secondary" className={cn("mt-2 font-medium", statusBadgeClass(entry.status))}>
                      {statusLabel(entry.status)}
                    </Badge>
                    {(entry.notes || entry.description) && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {entry.notes || entry.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-medium">{formatHours(entry.time)}</p>
                    {isAdmin && (
                      <p className={cn("text-xs", entry.approvedTime !== entry.time ? "text-amber-600" : "text-muted-foreground")}>
                        Approved: {formatHours(entry.approvedTime)}
                      </p>
                    )}
                    {isAdmin && value && value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {value.toLocaleString("en-US", { style: "currency", currency: "EUR" })}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => openEditDialog(entry)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {isAdmin ? "Edit Entry / Approved Time" : "Edit Entry"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center md:hidden">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-medium text-lg">No time entries found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
        </div>
      )}

      <Dialog open={!!editEntry} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAdmin ? "Edit Time Entry" : "Edit Time Entry"}</DialogTitle>
            <DialogDescription>
              Update logged time. Approved time is saved through the Admin-only endpoint.
            </DialogDescription>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              {saveError && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Unable to save changes</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">
                  {editEntry.workItemCode ? `${editEntry.workItemCode} - ` : ""}{editEntry.workItemTitle || "Work item"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {editEntry.employeeName || "Employee"} · {editEntry.projectName || "Project"}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Work Item</Label>
                <Input
                  placeholder="Search work items..."
                  value={editWorkItemSearch}
                  onChange={(event) => setEditWorkItemSearch(event.target.value)}
                  disabled={isSaving}
                />
                <Select value={editWorkItemId} onValueChange={setEditWorkItemId} disabled={isLoadingWorkItems || isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingWorkItems ? "Loading work items..." : "Select a work item"} />
                  </SelectTrigger>
                  <SelectContent>
                    {workItemOptions.map((workItem) => (
                      <SelectItem key={workItem.id} value={workItem.id}>{getWorkItemLabel(workItem)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editDate} onChange={(event) => setEditDate(event.target.value)} disabled={isSaving} />
                </div>
                <div className="space-y-2">
                  <Label>Time (hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={editTime}
                    onChange={(event) => setEditTime(parseFloat(event.target.value) || 0)}
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={2} disabled={isSaving} />
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea value={editNotes} onChange={(event) => setEditNotes(event.target.value)} rows={2} disabled={isSaving} />
              </div>

              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label>Approved Time (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editApprovedTime}
                      onChange={(event) => setEditApprovedTime(parseFloat(event.target.value) || 0)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Admin Note (optional)</Label>
                    <Textarea
                      placeholder="Reason for approved time adjustment"
                      value={editAdminNote}
                      onChange={(event) => setEditAdminNote(event.target.value)}
                      rows={2}
                      disabled={isSaving}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
