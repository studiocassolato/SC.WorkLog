import { useState } from "react"
import { useWorkLog } from "lib/worklog-context"
import { Button } from "components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import { Separator } from "components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/ui/dialog"
import { Badge } from "components/ui/badge"
import { toast } from "sonner"
import { 
  Building2,
  Users,
  Calendar,
  Search,
  Plus,
  Pencil,
  Settings
} from "lucide-react"

export default function SettingsPage() {
  const { 
    customers, 
    employees,
    statusConfigs,
    addCustomer,
    updateCustomer,
    addEmployee,
    updateEmployee,
    role 
  } = useWorkLog()
  
  const [activeTab, setActiveTab] = useState("company")
  
  // Customer state
  const [customerSearch, setCustomerSearch] = useState("")
  const [customerStatusFilter, setCustomerStatusFilter] = useState("all")
  const [editingCustomer, setEditingCustomer] = useState<typeof customers[0] | null>(null)
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  
  // Employee state
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [employeeLevelFilter, setEmployeeLevelFilter] = useState("all")
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState("all")
  const [editingEmployee, setEditingEmployee] = useState<typeof employees[0] | null>(null)
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)

  // Redirect if not admin
  if (role !== "Admin") {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.companyName.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.contactPerson.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.contactEmail.toLowerCase().includes(customerSearch.toLowerCase())
    const matchesStatus = customerStatusFilter === "all" || (customerStatusFilter === "active" ? customer.active : !customer.active)
    return matchesSearch && matchesStatus
  })

  // Filter employees
  const filteredEmployees = employees.filter((employee) => {
    const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase()
    const matchesSearch =
      fullName.includes(employeeSearch.toLowerCase()) ||
      employee.email.toLowerCase().includes(employeeSearch.toLowerCase())
    const matchesLevel = employeeLevelFilter === "all" || employee.level === employeeLevelFilter
    const matchesStatus = employeeStatusFilter === "all" || (employeeStatusFilter === "active" ? employee.active : !employee.active)
    return matchesSearch && matchesLevel && matchesStatus
  })

  const handleSaveCustomer = (formData: FormData) => {
    const customerData = {
      companyName: formData.get("companyName") as string,
      companyDomain: formData.get("companyDomain") as string || undefined,
      contactPerson: formData.get("contactPerson") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      active: formData.get("active") === "true",
    }
    
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, customerData)
      toast.success("Customer updated successfully")
    } else {
      addCustomer(customerData)
      toast.success("Customer created successfully")
    }
    setIsCustomerDialogOpen(false)
    setEditingCustomer(null)
  }

  const handleSaveEmployee = (formData: FormData) => {
    const employeeData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      level: formData.get("level") as "Junior" | "Mid" | "Senior",
      defaultHourlyRate: parseFloat(formData.get("defaultHourlyRate") as string) || 0,
      expectedDailyHours: parseFloat(formData.get("expectedDailyHours") as string) || 8,
      active: formData.get("active") === "true",
    }
    
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeData)
      toast.success("Employee updated successfully")
    } else {
      addEmployee(employeeData)
      toast.success("Employee created successfully")
    }
    setIsEmployeeDialogOpen(false)
    setEditingEmployee(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} customers, {employees.filter(e => e.active).length} active employees
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-[500px] grid-cols-4">
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="statuses">
            Statuses
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Building2 className="mr-2 h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="employees">
            <Users className="mr-2 h-4 w-4" />
            Employees
          </TabsTrigger>
        </TabsList>

        {/* Company Tab */}
        <TabsContent value="company">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Basic company details and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" defaultValue="SC Company" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input id="companyEmail" type="email" defaultValue="info@sccompany.com" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => toast.success("Company info saved")}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Time Tracking Policies
                </CardTitle>
                <CardDescription>Configure company-wide time tracking rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium">Work Schedule</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard Work Hours</span>
                        <span>8 hours/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Work Days</span>
                        <span>Monday - Friday</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Entry Approval</span>
                        <span>Required</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Leave Policies</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Annual Leave</span>
                        <span>20 days/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sick Leave</span>
                        <span>10 days/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Leave Approval</span>
                        <span>Manager required</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Fiscal Year</h3>
                  <div className="flex items-center gap-4">
                    <Calendar className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium">January 1 - December 31</p>
                      <p className="text-sm text-muted-foreground">Current fiscal year: 2024</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Statuses Tab */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>Work Item Statuses</CardTitle>
              <CardDescription>Configure status options for work items. Statuses marked as &quot;closed&quot; indicate completed work items.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Internal Name</TableHead>
                    <TableHead>Customer Display Name</TableHead>
                    <TableHead>Is Closed</TableHead>
                    <TableHead>Is Initial</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusConfigs.sort((a, b) => a.order - b.order).map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">{status.name}</TableCell>
                      <TableCell>{status.displayName}</TableCell>
                      <TableCell>
                        {status.isClosed ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.isInitial ? (
                          <Badge>Default</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => toast.info("Status management coming soon")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium">Customers</h2>
              <Button onClick={() => { setEditingCustomer(null); setIsCustomerDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>

            <div className="bg-card border rounded-sm p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={customerStatusFilter} onValueChange={setCustomerStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No customers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.companyName}</TableCell>
                        <TableCell>{customer.contactPerson}</TableCell>
                        <TableCell>{customer.contactEmail}</TableCell>
                        <TableCell>{customer.contactPhone}</TableCell>
                        <TableCell>
                          <Badge variant={customer.active ? "default" : "secondary"}>
                            {customer.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingCustomer(customer); setIsCustomerDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium">Employees</h2>
              <Button onClick={() => { setEditingEmployee(null); setIsEmployeeDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </div>

            <div className="bg-card border rounded-sm p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={employeeLevelFilter} onValueChange={setEmployeeLevelFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card border rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Hourly Rate</TableHead>
                    <TableHead className="text-right">Daily Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.level}</Badge>
                        </TableCell>
                        <TableCell className="text-right">${employee.defaultHourlyRate}/h</TableCell>
                        <TableCell className="text-right">{employee.expectedDailyHours}h</TableCell>
                        <TableCell>
                          <Badge variant={employee.active ? "default" : "secondary"}>
                            {employee.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingEmployee(employee); setIsEmployeeDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? "Update customer information" : "Add a new customer to the system"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleSaveCustomer(new FormData(event.currentTarget))
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" name="companyName" defaultValue={editingCustomer?.companyName || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="companyDomain">Company Domain</Label>
                <Input id="companyDomain" name="companyDomain" placeholder="e.g., videndum.com" defaultValue={editingCustomer?.companyDomain || ""} />
                <p className="text-xs text-muted-foreground">Used for client login (e.g., videndum.com)</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" defaultValue={editingCustomer?.contactPerson || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={editingCustomer?.contactEmail || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={editingCustomer?.contactPhone || ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="active">Status</Label>
                <Select name="active" defaultValue={editingCustomer?.active !== false ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCustomer ? "Save Changes" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? "Update employee information" : "Add a new employee to the system"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              handleSaveEmployee(new FormData(event.currentTarget))
            }}
            className="space-y-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={editingEmployee?.firstName || ""} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={editingEmployee?.lastName || ""} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="level">Level</Label>
                <Select name="level" defaultValue={editingEmployee?.level || "Mid"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="defaultHourlyRate">Hourly Rate ($)</Label>
                  <Input id="defaultHourlyRate" name="defaultHourlyRate" type="number" step="0.01" defaultValue={editingEmployee?.defaultHourlyRate || 50} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expectedDailyHours">Daily Hours</Label>
                  <Input id="expectedDailyHours" name="expectedDailyHours" type="number" step="0.5" defaultValue={editingEmployee?.expectedDailyHours || 8} required />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="active">Status</Label>
                <Select name="active" defaultValue={editingEmployee?.active !== false ? "true" : "false"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingEmployee ? "Save Changes" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
