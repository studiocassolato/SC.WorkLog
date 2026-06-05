import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "helpers/services/AuthContext"
import {
  createTimeEntry,
  getActiveEmployees,
  getProjects,
  getWorkItems,
  type EmployeeDto,
  type ProjectListItemDto,
  type WorkItemFilter,
  type WorkItemListItemDto,
} from "helpers/services/worklog-api"
import { Button } from "components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "components/ui/drawer"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Checkbox } from "components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "components/ui/collapsible"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Textarea } from "components/ui/textarea"
import { useIsMobile } from "hooks/use-mobile"
import { ChevronDown, ChevronUp, Filter, Search, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

const hourOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]

interface AddTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultWorkItemId?: string
  defaultDate?: string
}

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to add time."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save time entry. Please try again."
}

const toDateInputValue = (value?: string) => value || new Date().toISOString().split("T")[0]

const isHalfHourIncrement = (value: number) => Number.isFinite(value) && value > 0 && Number.isInteger(value * 2)

export function AddTimeDialog({
  open,
  onOpenChange,
  defaultWorkItemId,
  defaultDate,
}: AddTimeDialogProps) {
  const isMobile = useIsMobile()
  const { currentUser, isAdmin } = useAuth()
  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [projects, setProjects] = useState<ProjectListItemDto[]>([])
  const [workItems, setWorkItems] = useState<WorkItemListItemDto[]>([])
  const [employeeId, setEmployeeId] = useState("")
  const [workItemId, setWorkItemId] = useState(defaultWorkItemId || "")
  const [date, setDate] = useState(toDateInputValue(defaultDate))
  const [hours, setHours] = useState(1)
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState("")
  const [customerId, setCustomerId] = useState("all")
  const [projectId, setProjectId] = useState("all")
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(false)
  const [isLoadingReferences, setIsLoadingReferences] = useState(false)
  const [isLoadingWorkItems, setIsLoadingWorkItems] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const currentEmployeeId = currentUser?.employeeId ?? ""
  const currentUserEmail = currentUser?.email ?? ""
  const employeeOptions = isAdmin ? employees : []
  const selectedEmployeeId = isAdmin ? employeeId : currentEmployeeId
  const selectedProject = projects.find((project) => project.id === projectId)
  const customers = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((project) => {
      if (project.customerId && project.customerName) map.set(project.customerId, project.customerName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [projects])
  const projectsForCustomer = useMemo(
    () => customerId === "all" ? projects : projects.filter((project) => project.customerId === customerId),
    [customerId, projects],
  )

  const resetForm = useCallback(() => {
    setWorkItemId(defaultWorkItemId || "")
    setDate(toDateInputValue(defaultDate))
    setHours(1)
    setDescription("")
    setNotes("")
    setShowSearch(false)
    setSearch("")
    setCustomerId("all")
    setProjectId("all")
    setAssignedToMe(false)
    setIncludeClosed(false)
    setErrorMessage(null)
  }, [defaultDate, defaultWorkItemId])

  useEffect(() => {
    if (!open) return
    resetForm()
    setEmployeeId(currentEmployeeId)
  }, [currentEmployeeId, open, resetForm])

  useEffect(() => {
    if (!open) return

    const loadReferences = async () => {
      setIsLoadingReferences(true)
      setErrorMessage(null)
      try {
        const [projectResponse, employeeResponse] = await Promise.all([
          getProjects(),
          isAdmin ? getActiveEmployees() : Promise.resolve([]),
        ])
        setProjects(projectResponse)
        setEmployees(employeeResponse)
        if (isAdmin) {
          const defaultEmployeeId = currentEmployeeId || employeeResponse[0]?.id || ""
          setEmployeeId(defaultEmployeeId)
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoadingReferences(false)
      }
    }

    void loadReferences()
  }, [currentEmployeeId, isAdmin, open])

  useEffect(() => {
    if (!open) return

    const loadWorkItems = async () => {
      setIsLoadingWorkItems(true)
      try {
        const filter: WorkItemFilter = {
          search: search.trim() || undefined,
          customerId: customerId === "all" ? undefined : customerId,
          projectId: projectId === "all" ? undefined : projectId,
          assigneeId: assignedToMe && currentUserEmail ? currentUserEmail : undefined,
          includeClosed,
        }
        const response = await getWorkItems(filter)
        setWorkItems(response)
      } catch (error) {
        setWorkItems([])
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsLoadingWorkItems(false)
      }
    }

    const handle = window.setTimeout(() => void loadWorkItems(), 250)
    return () => window.clearTimeout(handle)
  }, [assignedToMe, currentEmployeeId, customerId, includeClosed, open, projectId, search])

  const validationMessage = useMemo(() => {
    if (!selectedEmployeeId) return "Employee is required."
    if (!workItemId) return "Work Item is required."
    if (!date) return "Date is required."
    if (!isHalfHourIncrement(hours)) return "Time must be greater than zero and use 0.5 hour increments."
    return null
  }, [date, hours, selectedEmployeeId, workItemId])

  const handleCustomerChange = (value: string) => {
    setCustomerId(value)
    setProjectId("all")
  }

  const handleSubmit = async () => {
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      const created = await createTimeEntry({
        employeeId: selectedEmployeeId,
        workItemId,
        date,
        time: hours,
        description: description.trim() || null,
        notes: notes.trim() || null,
      })
      toast.success("Time entry saved.")
      window.dispatchEvent(new CustomEvent("worklog:time-entry-saved", { detail: created }))
      onOpenChange(false)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const getWorkItemDisplay = (workItem: WorkItemListItemDto) => {
    const code = workItem.code ? `${workItem.code} - ` : ""
    const project = workItem.projectName ? ` · ${workItem.projectName}` : ""
    const customer = workItem.customerName ? ` · ${workItem.customerName}` : ""
    const status = workItem.statusName || workItem.statusKey
    const assignee = workItem.assigneeName ? ` · ${workItem.assigneeName}` : ""
    return `${code}${workItem.title}${project}${customer} · ${status}${assignee}`
  }

  const content = (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to save time</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {isAdmin ? (
        <div className="space-y-2">
          <Label htmlFor="employee">Employee</Label>
          <Select value={employeeId} onValueChange={setEmployeeId} disabled={isLoadingReferences || isSaving}>
            <SelectTrigger id="employee">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employeeOptions.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <input type="hidden" value={selectedEmployeeId} readOnly />
      )}

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={isSaving} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workItem">Work Item</Label>
        <Select value={workItemId} onValueChange={setWorkItemId} disabled={isLoadingWorkItems || isSaving}>
          <SelectTrigger id="workItem">
            <SelectValue placeholder={isLoadingWorkItems ? "Loading work items..." : "Select a work item"} />
          </SelectTrigger>
          <SelectContent>
            {workItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {getWorkItemDisplay(item)}
              </SelectItem>
            ))}
            {workItems.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No work items found.</div>
            )}
          </SelectContent>
        </Select>

        <Collapsible open={showSearch} onOpenChange={setShowSearch}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Search and filters
              </span>
              {showSearch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Code, title or description..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Customer</Label>
                <Select value={customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectsForCustomer.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assignedToMe"
                  checked={assignedToMe}
                  onCheckedChange={(checked) => setAssignedToMe(checked === true)}
                  disabled={!currentEmployeeId}
                />
                <label htmlFor="assignedToMe" className="text-xs">Assigned to me</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeClosed"
                  checked={includeClosed}
                  onCheckedChange={(checked) => setIncludeClosed(checked === true)}
                />
                <label htmlFor="includeClosed" className="text-xs">Include closed</label>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {isLoadingWorkItems ? "Loading work items..." : `${workItems.length} work items found`}
              {selectedProject ? ` in ${selectedProject.name}` : ""}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="space-y-2">
        <Label>Hours</Label>
        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            {[0.5, 1, 1.5, 2, 4, 8].map((value) => (
              <Button
                key={value}
                type="button"
                variant={hours === value ? "default" : "outline"}
                size="sm"
                onClick={() => setHours(value)}
                disabled={isSaving}
              >
                {value}h
              </Button>
            ))}
          </div>
        ) : (
          <Select value={hours.toString()} onValueChange={(value) => setHours(parseFloat(value))} disabled={isSaving}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value} hour{value !== 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="What did you work on?"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          disabled={isSaving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          disabled={isSaving}
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Add Time Entry</DrawerTitle>
            <DrawerDescription>Log work against a backend Work Item.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!!validationMessage || isSaving || isLoadingReferences} className="w-full">
              {isSaving ? "Saving..." : "Save Entry"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Time Entry</DialogTitle>
          <DialogDescription>Log work against a backend Work Item.</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!!validationMessage || isSaving || isLoadingReferences}>
            {isSaving ? "Saving..." : "Save Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
