import { useEffect, useState, useMemo } from "react"
import { useWorkLog } from "lib/worklog-context"
import { isClosedWorkItemStatus } from "lib/mock-data"
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
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import { Textarea } from "components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "components/ui/collapsible"
import { Checkbox } from "components/ui/checkbox"
import { useIsMobile } from "hooks/use-mobile"
import { Search, ChevronDown, ChevronUp, Filter } from "lucide-react"

const hourOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8]

interface AddTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultWorkItemId?: string
  defaultDate?: string
}

export function AddTimeDialog({
  open,
  onOpenChange,
  defaultWorkItemId,
  defaultDate,
}: AddTimeDialogProps) {
  const isMobile = useIsMobile()
  const { workItems, projects, customers, employees, currentUser, timeEntries, addTimeEntry, role } = useWorkLog()
  
  const [workItemId, setWorkItemId] = useState(defaultWorkItemId || "")
  const [hours, setHours] = useState<number>(1)
  const [description, setDescription] = useState("")
  const [showOvertimeConfirm, setShowOvertimeConfirm] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentUser.id)
  
  // Search/filter state
  const [showSearch, setShowSearch] = useState(false)
  const [searchTitle, setSearchTitle] = useState("")
  const [searchCustomerId, setSearchCustomerId] = useState<string>("all")
  const [searchProjectId, setSearchProjectId] = useState<string>("all")
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [includeClosed, setIncludeClosed] = useState(false)

  useEffect(() => {
    setSelectedEmployeeId(currentUser.id)
  }, [currentUser.id])

  const today = defaultDate || new Date().toISOString().split("T")[0]

  // Get selected employee for admin functionality
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId) || currentUser

  // Calculate current daily hours for selected employee
  const currentDailyHours = timeEntries
    .filter((e) => e.employeeId === selectedEmployeeId && e.date === today)
    .reduce((sum, e) => sum + e.time, 0)

  const willCreateOvertime = currentDailyHours + hours > selectedEmployee.expectedDailyHours

  // Get projects for selected customer (for cascading filter)
  const projectsForCustomer = useMemo(() => {
    if (searchCustomerId === "all") return projects
    return projects.filter(p => p.customerId === searchCustomerId)
  }, [projects, searchCustomerId])

  // Filter work items based on search criteria
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((item) => {
      // Status filter
      if (!includeClosed && isClosedWorkItemStatus(item.statusKey)) return false
      
      // Title search
      if (searchTitle && !item.title.toLowerCase().includes(searchTitle.toLowerCase())) return false
      
      // Customer filter
      if (searchCustomerId !== "all") {
        const project = projects.find(p => p.id === item.projectId)
        if (project?.customerId !== searchCustomerId) return false
      }
      
      // Project filter
      if (searchProjectId !== "all" && item.projectId !== searchProjectId) return false
      
      // Assigned to me filter
      if (assignedToMe && item.assigneeId !== currentUser.id) return false
      
      return true
    })
  }, [workItems, projects, searchTitle, searchCustomerId, searchProjectId, assignedToMe, includeClosed, currentUser.id])

  // Reset project filter when customer changes
  const handleCustomerChange = (value: string) => {
    setSearchCustomerId(value)
    setSearchProjectId("all")
  }

  const handleSubmit = () => {
    if (willCreateOvertime) {
      setShowOvertimeConfirm(true)
    } else {
      saveEntry()
    }
  }

  const saveEntry = () => {
    const workItem = workItems.find((w) => w.id === workItemId)
    const project = projects.find((p) => p.id === workItem?.projectId)

    let projectRate = selectedEmployee.defaultHourlyRate
    if (project?.paymentType === "Time & material") {
      if (selectedEmployee.level === "Junior") projectRate = project.juniorRate || projectRate
      else if (selectedEmployee.level === "Mid") projectRate = project.midRate || projectRate
      else projectRate = project.seniorRate || projectRate
    }

    addTimeEntry({
      employeeId: selectedEmployeeId,
      workItemId,
      date: today,
      time: hours,
      approvedTime: hours,
      description,
      adminNote: null,
      employeeLevelSnapshot: selectedEmployee.level,
      defaultRateSnapshot: selectedEmployee.defaultHourlyRate,
      projectRateSnapshot: projectRate,
    })

    // Reset form
    setWorkItemId("")
    setHours(1)
    setDescription("")
    setShowSearch(false)
    setSearchTitle("")
    setSearchCustomerId("all")
    setSearchProjectId("all")
    setAssignedToMe(false)
    setIncludeClosed(false)
    onOpenChange(false)
    setShowOvertimeConfirm(false)
  }

  const getWorkItemDisplay = (workItem: (typeof workItems)[0]) => {
    const project = projects.find((p) => p.id === workItem.projectId)
    const customer = customers.find((c) => c.id === project?.customerId)
    return `${workItem.title} (${customer?.companyName || "Unknown"})`
  }

  const content = (
    <div className="space-y-4">
      {/* Admin: Employee selector */}
      {role === "Admin" && (
        <div className="space-y-2">
          <Label htmlFor="employee">Employee</Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.filter(e => e.active).map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="workItem">Work Item</Label>
        <Select value={workItemId} onValueChange={setWorkItemId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a work item" />
          </SelectTrigger>
          <SelectContent>
            {filteredWorkItems.slice(0, 20).map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {getWorkItemDisplay(item)}
              </SelectItem>
            ))}
            {filteredWorkItems.length > 20 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Showing first 20 items. Use search to filter.
              </div>
            )}
          </SelectContent>
        </Select>
        
        {/* Search/Filter Collapsible */}
        <Collapsible open={showSearch} onOpenChange={setShowSearch}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Search...
              </span>
              {showSearch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Title</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search by title..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>
            
            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Customer</Label>
                <Select value={searchCustomerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.filter(c => c.active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Project</Label>
                <Select value={searchProjectId} onValueChange={setSearchProjectId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projectsForCustomer.filter(p => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
              {filteredWorkItems.length} work items found
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="space-y-2">
        <Label>Hours</Label>
        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            {[0.5, 1, 1.5, 2, 4, 8].map((h) => (
              <Button
                key={h}
                type="button"
                variant={hours === h ? "default" : "outline"}
                size="sm"
                onClick={() => setHours(h)}
              >
                {h}h
              </Button>
            ))}
          </div>
        ) : (
          <Select value={hours.toString()} onValueChange={(v) => setHours(parseFloat(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((h) => (
                <SelectItem key={h} value={h.toString()}>
                  {h} hour{h !== 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Today: {currentDailyHours}h / {selectedEmployee.expectedDailyHours}h expected
          {role === "Admin" && selectedEmployeeId !== currentUser.id && (
            <span className="ml-1">({selectedEmployee.firstName})</span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="What did you work on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add Time Entry</DrawerTitle>
              <DrawerDescription>Log your work for today</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">{content}</div>
            <DrawerFooter>
              <Button onClick={handleSubmit} disabled={!workItemId} className="w-full">
                Save Entry
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={showOvertimeConfirm} onOpenChange={setShowOvertimeConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You are logging overtime</AlertDialogTitle>
              <AlertDialogDescription>
                With this entry you will exceed the expected daily hours. An overtime approval
                request will be created.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={saveEntry}>Confirm and save</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Entry</DialogTitle>
            <DialogDescription>Log your work for today</DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!workItemId}>
              Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showOvertimeConfirm} onOpenChange={setShowOvertimeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You are logging overtime</AlertDialogTitle>
            <AlertDialogDescription>
              With this entry you will exceed the expected daily hours. An overtime approval request
              will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={saveEntry}>Confirm and save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
