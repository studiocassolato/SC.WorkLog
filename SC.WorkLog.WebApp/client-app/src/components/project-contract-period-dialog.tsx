import { type FormEvent, useState } from "react"
import {
  createProjectContractPeriod,
  updateProjectContractPeriod,
  type ProjectContractPeriodDto,
} from "helpers/services/worklog-api"
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert"
import { Button } from "components/ui/button"
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
import { Textarea } from "components/ui/textarea"
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"

type ProjectContractPeriodDialogProps = {
  open: boolean
  projectId: string
  period: ProjectContractPeriodDto | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
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
  if (status === 403) return "You do not have permission to save contract periods."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save contract period. Please try again."
}

const dateInputValue = (value?: string | null) => value?.slice(0, 10) ?? ""

const nullableText = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim() ?? ""
  return text || null
}

export function ProjectContractPeriodDialog({ open, projectId, period, onOpenChange, onSaved }: ProjectContractPeriodDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const startDate = formData.get("startDate")?.toString() ?? ""
    const endDate = formData.get("endDate")?.toString() ?? ""
    const amount = Number(formData.get("amount")?.toString() ?? "0")
    const paymentDate = nullableText(formData.get("paymentDate"))

    if (!startDate) {
      setErrorMessage("Start date is required.")
      setIsSaving(false)
      return
    }

    if (!endDate) {
      setErrorMessage("End date is required.")
      setIsSaving(false)
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage("End date must be after or equal to start date.")
      setIsSaving(false)
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage("Amount must be greater than zero.")
      setIsSaving(false)
      return
    }

    try {
      const request = {
        projectId,
        startDate,
        endDate,
        amount,
        paymentDate,
        note: nullableText(formData.get("note")),
      }
      if (period) {
        await updateProjectContractPeriod({ ...request, id: period.id })
      } else {
        await createProjectContractPeriod(request)
      }
      await onSaved()
      toast.success(period ? "Contract period updated successfully" : "Contract period created successfully")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{period ? "Edit Contract Period" : "Add Contract Period"}</DialogTitle>
          <DialogDescription>Contract periods are available only for Annual retainer projects.</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to save contract period</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-start-date">Start date</Label>
              <Input id="contract-start-date" name="startDate" type="date" defaultValue={dateInputValue(period?.startDate)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-end-date">End date</Label>
              <Input id="contract-end-date" name="endDate" type="date" defaultValue={dateInputValue(period?.endDate)} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contract-amount">Amount</Label>
              <Input id="contract-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={period?.amount ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract-payment-date">Payment date</Label>
              <Input id="contract-payment-date" name="paymentDate" type="date" defaultValue={dateInputValue(period?.paymentDate)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-note">Note</Label>
            <Textarea id="contract-note" name="note" defaultValue={period?.note ?? ""} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Contract Period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
