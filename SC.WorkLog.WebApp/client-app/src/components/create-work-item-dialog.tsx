import { useState } from 'react'
import { useWorkLog } from 'lib/worklog-context'
import { Button } from 'components/ui/button'
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
import { Textarea } from 'components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select'
import type { WorkItemStatus, WorkItemPriority } from 'lib/mock-data'

interface CreateWorkItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkItemDialog({ open, onOpenChange }: CreateWorkItemDialogProps) {
  const { projects, customers, employees, statusConfigs, addWorkItem } = useWorkLog()
  const activeStatuses = statusConfigs.filter((status) => status.active).sort((a, b) => a.order - b.order)
  const initialStatusKey = activeStatuses.find((status) => status.typology === 'New')?.key ?? activeStatuses[0]?.key ?? 'new'

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState('')
  const [statusKey, setStatusKey] = useState<WorkItemStatus>(initialStatusKey)
  const [priority, setPriority] = useState<WorkItemPriority>('Normal')
  const [assigneeId, setAssigneeId] = useState<string>('__unassigned__')
  const [reporter, setReporter] = useState('')

  const handleSubmit = () => {
    if (!title || !projectId) return

    addWorkItem({
      projectId,
      title,
      description,
      statusKey,
      priority,
      assigneeId: assigneeId === '__unassigned__' ? null : assigneeId,
      reporter: reporter.trim() || null,
      origin: 'Manual',
      externalReference: null,
      openingDate: new Date().toISOString().split('T')[0],
      closingDate: null,
    })

    // Reset form
    setTitle('')
    setDescription('')
    setProjectId('')
    setStatusKey(initialStatusKey)
    setPriority('Normal')
    setAssigneeId('__unassigned__')
    setReporter('')
    onOpenChange(false)
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer?.companyName || ''
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Work Item</DialogTitle>
          <DialogDescription>Add a new work item to track</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Work item title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({getCustomerName(project.customerId)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusKey} onValueChange={(v) => setStatusKey(v as WorkItemStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeStatuses.map((statusConfig) => (
                    <SelectItem key={statusConfig.id} value={statusConfig.key}>
                      {statusConfig.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as WorkItemPriority)}>
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Assignee (optional)</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {employees
                  .filter((e) => e.active)
                  .map((employee) => (
                    <SelectItem key={employee.id} value={employee.email}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reporter">Reporter email (optional)</Label>
            <Input
              id="reporter"
              type="email"
              placeholder="reporter@example.com"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the work item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !projectId}>
            Create Work Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
