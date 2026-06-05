import { useEffect, useMemo, useState } from "react"
import {
  createWorkItem,
  updateWorkItem,
  type CreateWorkItemRequest,
  type EmployeeDto,
  type ProjectListItemDto,
  type StatusConfigDto,
  type WorkItemDetailDto,
  type WorkItemOrigin,
  type WorkItemPriority,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Button } from "components/ui/button"
import { Checkbox } from "components/ui/checkbox"
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
import { Textarea } from "components/ui/textarea"
import { ShieldAlert } from "lucide-react"

const unassignedValue = "__unassigned__"
const backendDefaultStatusValue = "__backend_default__"

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to save work items."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save work item. Please try again."
}

const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return ""
  return value.slice(0, 10)
}

const todayInputValue = () => new Date().toISOString().slice(0, 10)

const originLabel = (origin: WorkItemOrigin) => {
  switch (origin) {
    case "AzureDevOps":
      return "Azure DevOps"
    default:
      return origin
  }
}

const statusOptionLabel = (status: StatusConfigDto) => {
  if (status.customerDisplayName && status.customerDisplayName !== status.name) {
    return `${status.name} (customer: ${status.customerDisplayName})`
  }
  return status.name
}

type WorkItemFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: ProjectListItemDto[]
  statuses: StatusConfigDto[]
  employees: EmployeeDto[]
  workItem?: WorkItemDetailDto | null
  defaultProjectId?: string
  onSaved: (workItem: WorkItemDetailDto) => void | Promise<void>
}

export function WorkItemFormDialog({
  defaultProjectId,
  employees,
  onOpenChange,
  onSaved,
  open,
  projects,
  statuses,
  workItem,
}: WorkItemFormDialogProps) {
  const isEdit = Boolean(workItem)
  const activeStatuses = useMemo(() => statuses.filter((status) => status.active).sort((a, b) => a.order - b.order), [statuses])

  const [assigneeId, setAssigneeId] = useState(unassignedValue)
  const [closingDate, setClosingDate] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [externalReference, setExternalReference] = useState("")
  const [isPriority, setIsPriority] = useState(false)
  const [openingDate, setOpeningDate] = useState(todayInputValue())
  const [origin, setOrigin] = useState<WorkItemOrigin>("Manual")
  const [priority, setPriority] = useState<WorkItemPriority>("Normal")
  const [projectId, setProjectId] = useState(defaultProjectId ?? "")
  const [reporter, setReporter] = useState("")
  const [statusKey, setStatusKey] = useState(backendDefaultStatusValue)
  const [title, setTitle] = useState("")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return

    setSaveError(null)
    setAssigneeId(workItem?.assigneeId ?? unassignedValue)
    setClosingDate(toDateInputValue(workItem?.closingDate))
    setCode(workItem?.code ?? "")
    setDescription(workItem?.description ?? "")
    setExternalReference(workItem?.externalReference ?? "")
    setIsPriority(workItem?.isPriority ?? false)
    setOpeningDate(toDateInputValue(workItem?.openingDate) || todayInputValue())
    setOrigin(workItem?.origin ?? "Manual")
    setPriority(workItem?.priority ?? "Normal")
    setProjectId(workItem?.projectId ?? defaultProjectId ?? "")
    setReporter(workItem?.reporter ?? "")
    setStatusKey(workItem?.statusKey ?? backendDefaultStatusValue)
    setTitle(workItem?.title ?? "")
  }, [defaultProjectId, open, workItem])

  const validate = () => {
    if (!title.trim()) return "Title is required."
    if (!projectId) return "Project is required."
    if (!priority) return "Priority is required."
    if (!openingDate) return "Opening date is required."
    if (closingDate && openingDate && new Date(closingDate) < new Date(openingDate)) {
      return "Closing date must be greater than or equal to opening date."
    }
    if (isEdit && statusKey === backendDefaultStatusValue) return "Status is required when updating a work item."
    return null
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    const request: CreateWorkItemRequest = {
      code: code.trim() || null,
      projectId,
      title: title.trim(),
      description: description.trim() || null,
      statusKey: statusKey === backendDefaultStatusValue ? null : statusKey,
      priority,
      assigneeId: assigneeId === unassignedValue ? null : assigneeId,
      reporter: reporter.trim() || null,
      origin,
      externalReference: externalReference.trim() || null,
      openingDate,
      closingDate: closingDate || null,
      isPriority,
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const saved = workItem
        ? await updateWorkItem({ ...request, id: workItem.id })
        : await createWorkItem(request)
      await onSaved(saved)
      onOpenChange(false)
    } catch (error) {
      setSaveError(getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Work Item" : "Create Work Item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update editable Work Item fields through WorkItem/UpdateWorkItem."
              : "Create a Work Item through WorkItem/CreateWorkItem."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {saveError && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Unable to save work item</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workItemProject">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="workItemProject">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}{project.customerName ? ` (${project.customerName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workItemCode">Code</Label>
              <Input
                id="workItemCode"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Optional code"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItemTitle">Title</Label>
            <Input id="workItemTitle" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItemDescription">Description</Label>
            <Textarea
              id="workItemDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workItemStatus">Status</Label>
              <Select value={statusKey} onValueChange={setStatusKey}>
                <SelectTrigger id="workItemStatus">
                  <SelectValue placeholder={isEdit ? "Select status" : "Backend default"} />
                </SelectTrigger>
                <SelectContent>
                  {!isEdit && <SelectItem value={backendDefaultStatusValue}>Backend default initial status</SelectItem>}
                  {activeStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.key}>
                      {statusOptionLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workItemPriority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as WorkItemPriority)}>
                <SelectTrigger id="workItemPriority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workItemAssignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="workItemAssignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={unassignedValue}>Unassigned</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workItemOrigin">Origin</Label>
              <Select value={origin} onValueChange={(value) => setOrigin(value as WorkItemOrigin)} disabled={isEdit}>
                <SelectTrigger id="workItemOrigin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["Manual", "Jira", "AzureDevOps", "Email"] as WorkItemOrigin[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {originLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItemReporter">Reporter email</Label>
            <Input
              id="workItemReporter"
              type="email"
              value={reporter}
              onChange={(event) => setReporter(event.target.value)}
              placeholder="Optional reporter email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workItemExternalReference">External reference</Label>
            <Input
              id="workItemExternalReference"
              value={externalReference}
              onChange={(event) => setExternalReference(event.target.value)}
              placeholder="Optional external reference"
              disabled={isEdit}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workItemOpeningDate">Opening date</Label>
              <Input
                id="workItemOpeningDate"
                type="date"
                value={openingDate}
                onChange={(event) => setOpeningDate(event.target.value)}
                disabled={isEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workItemClosingDate">Closing date</Label>
              <Input
                id="workItemClosingDate"
                type="date"
                value={closingDate}
                onChange={(event) => setClosingDate(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="workItemIsPriority" checked={isPriority} onCheckedChange={(checked) => setIsPriority(checked === true)} />
            <Label htmlFor="workItemIsPriority" className="cursor-pointer text-sm font-normal">
              Mark as priority for the assignee
            </Label>
          </div>

          {isEdit && (
            <p className="text-xs text-muted-foreground">
              Moving a Work Item to another project updates related TimeEntry project references on the backend. Code, origin, external reference and opening date remain read-only in the current update endpoint.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : isEdit ? "Save Work Item" : "Create Work Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
