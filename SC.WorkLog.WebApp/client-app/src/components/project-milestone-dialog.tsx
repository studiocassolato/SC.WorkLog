import { type FormEvent, useState } from "react"
import {
  createProjectMilestone,
  updateProjectMilestone,
  type ProjectMilestoneDto,
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
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"

type ProjectMilestoneDialogProps = {
  open: boolean
  projectId: string
  milestone: ProjectMilestoneDto | null
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
  if (status === 403) return "You do not have permission to save milestones."
  if (Array.isArray(errors) && errors.every((item) => typeof item === "string")) return errors.join(" ")
  if (error instanceof Error && error.message) return error.message
  return "Unable to save milestone. Please try again."
}

const dateInputValue = (value?: string | null) => value?.slice(0, 10) ?? ""

export function ProjectMilestoneDialog({ open, projectId, milestone, onOpenChange, onSaved }: ProjectMilestoneDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)
    const title = formData.get("title")?.toString().trim() ?? ""
    const date = formData.get("date")?.toString() ?? ""

    if (!title) {
      setErrorMessage("Title is required.")
      setIsSaving(false)
      return
    }

    if (!date) {
      setErrorMessage("Date is required.")
      setIsSaving(false)
      return
    }

    try {
      if (milestone) {
        await updateProjectMilestone({ id: milestone.id, projectId, title, date })
      } else {
        await createProjectMilestone({ projectId, title, date })
      }
      await onSaved()
      toast.success(milestone ? "Milestone updated successfully" : "Milestone created successfully")
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
          <DialogTitle>{milestone ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
          <DialogDescription>Project milestones are visible from the Project Detail page.</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Unable to save milestone</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-title">Title</Label>
            <Input id="milestone-title" name="title" defaultValue={milestone?.title ?? ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-date">Date</Label>
            <Input id="milestone-date" name="date" type="date" defaultValue={dateInputValue(milestone?.date)} required />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
