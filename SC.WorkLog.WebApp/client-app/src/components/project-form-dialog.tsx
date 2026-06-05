import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  createProject,
  getCustomers,
  updateProject,
  type CreateProjectRequest,
  type CustomerDto,
  type ProjectDetailDto,
  type ProjectPaymentType,
  type ProjectStatus,
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
import { toast } from "sonner"

type ProjectFormDialogProps = {
  open: boolean
  project: ProjectDetailDto | null
  onOpenChange: (open: boolean) => void
  onSaved: (project: ProjectDetailDto) => void | Promise<void>
}

const paymentTypes: Array<{ value: ProjectPaymentType; label: string }> = [
  { value: "TimeAndMaterial", label: "Time & material" },
  { value: "FixedPrice", label: "Fixed price" },
  { value: "AnnualRetainer", label: "Annual retainer" },
  { value: "Internal", label: "Internal" },
]

const projectStatuses: Array<{ value: ProjectStatus; label: string }> = [
  { value: "Active", label: "Active" },
  { value: "Suspended", label: "Suspended" },
  { value: "Closed", label: "Closed" },
]

const getErrorMessage = (error: unknown) => {
  const responseData = typeof error === "object" && error && "response" in error
    ? (error as { response?: { status?: number; data?: unknown } }).response
    : null
  const status = responseData?.status
  const errors = responseData?.data && typeof responseData.data === "object"
    ? ((responseData.data as { errors?: unknown; Errors?: unknown }).errors ?? (responseData.data as { errors?: unknown; Errors?: unknown }).Errors)
    : null

  if (status === 401) return "Authentication required. Please sign in again."
  if (status === 403) return "You do not have permission to save projects."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save project. Please try again."
}

const nullableNumber = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim() ?? ""
  if (!text) return null
  return Number(text)
}

const nullableText = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim() ?? ""
  return text || null
}

export function ProjectFormDialog({ open, project, onOpenChange, onSaved }: ProjectFormDialogProps) {
  const [customers, setCustomers] = useState<CustomerDto[]>([])
  const [customerId, setCustomerId] = useState("")
  const [paymentType, setPaymentType] = useState<ProjectPaymentType>("TimeAndMaterial")
  const [status, setStatus] = useState<ProjectStatus>("Active")
  const [isDefault, setIsDefault] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    setErrorMessage(null)
    setPaymentType(project?.paymentType ?? "TimeAndMaterial")
    setStatus(project?.status ?? "Active")
    setIsDefault(project?.isDefault ?? false)
    setCustomerId(project?.customerId ?? "")
    setIsLoadingCustomers(true)

    getCustomers()
      .then((response) => {
        setCustomers(response)
        if (!project) {
          setCustomerId(response.find((customer) => customer.active)?.id ?? response[0]?.id ?? "")
        }
      })
      .catch((error) => {
        setCustomers([])
        setErrorMessage(getErrorMessage(error))
      })
      .finally(() => setIsLoadingCustomers(false))
  }, [open, project])

  const selectableCustomers = useMemo(() => {
    const rows = customers.filter((customer) => customer.active || customer.id === project?.customerId)
    return rows.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.companyName.localeCompare(b.companyName)
    })
  }, [customers, project?.customerId])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const baseRequest: CreateProjectRequest = {
      customerId,
      name: formData.get("name")?.toString().trim() ?? "",
      paymentType,
      status,
      notes: nullableText(formData.get("notes")),
      isDefault,
      juniorRate: paymentType === "TimeAndMaterial" ? nullableNumber(formData.get("juniorRate")) : null,
      midRate: paymentType === "TimeAndMaterial" ? nullableNumber(formData.get("midRate")) : null,
      seniorRate: paymentType === "TimeAndMaterial" ? nullableNumber(formData.get("seniorRate")) : null,
      fixedAmount: paymentType === "FixedPrice" ? nullableNumber(formData.get("fixedAmount")) : null,
    }

    try {
      const savedProject = project
        ? await updateProject({ ...baseRequest, id: project.id })
        : await createProject(baseRequest)
      await onSaved(savedProject)
      toast.success(project ? "Project updated successfully" : "Project created successfully")
      onOpenChange(false)
    } catch (error) {
      const message = getErrorMessage(error)
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            Save project base information through the backend Project API. Milestones, payments and contract periods remain separate flows.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to save project</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-customer">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId} disabled={isLoadingCustomers || selectableCustomers.length === 0}>
                <SelectTrigger id="project-customer">
                  <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select customer"} />
                </SelectTrigger>
                <SelectContent>
                  {selectableCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName}{customer.active ? "" : " (inactive)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
                <SelectTrigger id="project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projectStatuses.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input id="project-name" name="name" defaultValue={project?.name ?? ""} required />
          </div>

          <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
            <Checkbox
              id="project-is-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="project-is-default">Default project for this customer</Label>
              <p className="text-sm text-muted-foreground">
                Each customer can have at most one default project.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-payment-type">Payment type</Label>
            <Select value={paymentType} onValueChange={(value) => setPaymentType(value as ProjectPaymentType)}>
              <SelectTrigger id="project-payment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentType === "TimeAndMaterial" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="project-junior-rate">Junior rate</Label>
                <Input id="project-junior-rate" name="juniorRate" type="number" min="0.01" step="0.01" defaultValue={project?.juniorRate ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-mid-rate">Mid rate</Label>
                <Input id="project-mid-rate" name="midRate" type="number" min="0.01" step="0.01" defaultValue={project?.midRate ?? ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-senior-rate">Senior rate</Label>
                <Input id="project-senior-rate" name="seniorRate" type="number" min="0.01" step="0.01" defaultValue={project?.seniorRate ?? ""} required />
              </div>
            </div>
          )}

          {paymentType === "FixedPrice" && (
            <div className="space-y-2">
              <Label htmlFor="project-fixed-amount">Fixed amount</Label>
              <Input id="project-fixed-amount" name="fixedAmount" type="number" min="0.01" step="0.01" defaultValue={project?.fixedAmount ?? ""} required />
            </div>
          )}

          {paymentType === "AnnualRetainer" && (
            <Alert>
              <AlertTitle>Contract periods</AlertTitle>
              <AlertDescription>Retainer amounts are managed through Contract Periods.</AlertDescription>
            </Alert>
          )}

          {paymentType === "Internal" && (
            <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Internal projects do not require economic setup.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="project-notes">Notes</Label>
            <Textarea id="project-notes" name="notes" defaultValue={project?.notes ?? ""} rows={4} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingCustomers || !customerId}>
              {isSaving ? "Saving..." : "Save Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
