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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from 'components/ui/drawer'
import { Label } from 'components/ui/label'
import { Textarea } from 'components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select'
import { useIsMobile } from 'hooks/use-mobile'
import { Calendar } from 'components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from 'lib/utils'
import type { LeaveType } from 'lib/mock-data'

interface LeaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeaveRequestDialog({ open, onOpenChange }: LeaveRequestDialogProps) {
  const isMobile = useIsMobile()
  const { currentUser, addLeaveRequest } = useWorkLog()
  const [type, setType] = useState<LeaveType>('Vacation')
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [hours, setHours] = useState<number>(8)
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!date) return

    addLeaveRequest({
      employeeId: currentUser.id,
      type,
      date: date.toISOString().split('T')[0],
      hours,
      status: 'Pending approval',
      requestDate: new Date().toISOString().split('T')[0],
      employeeNote: note,
      adminNote: null,
    })

    // Reset form
    setType('Vacation')
    setDate(new Date())
    setHours(8)
    setNote('')
    onOpenChange(false)
  }

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Vacation">Vacation</SelectItem>
            <SelectItem value="Permission">Permission</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !date && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Hours</Label>
        <Select value={hours.toString()} onValueChange={(v) => setHours(parseInt(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
              <SelectItem key={h} value={h.toString()}>
                {h} hour{h !== 1 ? 's' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Note (optional)</Label>
        <Textarea
          placeholder="Reason for leave request"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Request Leave</DrawerTitle>
            <DrawerDescription>Submit a vacation or permission request</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={!date} className="w-full">
              Submit Request
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
          <DialogTitle>Request Leave</DialogTitle>
          <DialogDescription>Submit a vacation or permission request</DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!date}>
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
