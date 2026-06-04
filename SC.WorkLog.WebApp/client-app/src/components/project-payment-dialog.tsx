import { type FormEvent } from "react"
import {
  createProjectPayment,
  updateProjectPayment,
  type ProjectPaymentDto,
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
import { useState } from "react"
import { toast } from "sonner"

type ProjectPaymentDialogProps = {
  open: boolean
  projectId: string
  payment: ProjectPaymentDto | null
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
  if (status === 403) return "You do not have permission to save project payments."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save project payment. Please try again."
}

const dateInputValue = (value?: string | null) => {
  if (!value) return new Date().toISOString().slice(0, 10)
  return value.slice(0, 10)
}

const nullableText = (value: FormDataEntryValue | null) => {
  const text = value?.toString().trim() ?? ""
  return text || null
}

export function ProjectPaymentDialog({ open, projectId, payment, onOpenChange, onSaved }: ProjectPaymentDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const paymentDate = formData.get("paymentDate")?.toString() ?? ""
    const amount = Number(formData.get("amount")?.toString() ?? "0")

    if (!paymentDate) {
      setErrorMessage("Payment date is required.")
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
        paymentDate,
        amount,
        note: nullableText(formData.get("note")),
      }
      if (payment) {
        await updateProjectPayment({ ...request, id: payment.id })
      } else {
        await createProjectPayment(request)
      }
      await onSaved()
      toast.success(payment ? "Payment updated successfully" : "Payment created successfully")
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
          <DialogTitle>{payment ? "Edit Payment" : "Add Payment"}</DialogTitle>
          <DialogDescription>Payments are available only for Time & material projects.</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to save payment</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment date</Label>
              <Input id="payment-date" name="paymentDate" type="date" defaultValue={dateInputValue(payment?.paymentDate)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount</Label>
              <Input id="payment-amount" name="amount" type="number" min="0.01" step="0.01" defaultValue={payment?.amount ?? ""} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-note">Note</Label>
            <Textarea id="payment-note" name="note" defaultValue={payment?.note ?? ""} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
