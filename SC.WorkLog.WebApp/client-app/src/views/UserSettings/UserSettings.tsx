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
import { Switch } from "components/ui/switch"
import { Separator } from "components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar"
import { toast } from "sonner"
import { 
  User, 
  Bell, 
  Clock, 
  Mail,
  ArrowLeft
} from "lucide-react"
import { Link } from "react-router-dom"

export default function UserSettingsPage() {
  const { currentUser, updateEmployee } = useWorkLog()
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    weeklyReport: true,
    approvalUpdates: true,
    leaveUpdates: true,
  })
  const [preferences, setPreferences] = useState({
    defaultView: "my-day",
    timeFormat: "12h",
    weekStartsOn: "monday",
    defaultBillable: true,
  })

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const fullName = `${currentUser.firstName} ${currentUser.lastName}`

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  }

  const handleSaveProfile = (formData: FormData) => {
    updateEmployee(currentUser.id, {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
    })
    toast.success("Profile updated successfully")
  }

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved")
  }

  const handleSavePreferences = () => {
    toast.success("Work preferences saved")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/my-day">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">User Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your personal preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="work">
            <Clock className="mr-2 h-4 w-4" />
            Work
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    handleSaveProfile(new FormData(event.currentTarget))
                  }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src="" alt={fullName} />
                      <AvatarFallback className="text-xl">
                        {getInitials(currentUser.firstName, currentUser.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button type="button" variant="outline" size="sm">
                        Change Avatar
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" defaultValue={currentUser.firstName} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" defaultValue={currentUser.lastName} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input id="email" name="email" type="email" defaultValue={currentUser.email} className="pl-10" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="level">Level</Label>
                      <Input id="level" value={currentUser.level} disabled className="bg-muted" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Time Entry Reminder</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to log your time at the end of each day
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyReminder}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, dailyReminder: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Summary Report</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly summary of your logged hours
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, weeklyReport: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Time Entry Approval Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when your time entries are approved or rejected
                    </p>
                  </div>
                  <Switch
                    checked={notifications.approvalUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, approvalUpdates: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Leave Request Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about leave request approvals and updates
                    </p>
                  </div>
                  <Switch
                    checked={notifications.leaveUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, leaveUpdates: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Tab */}
        <TabsContent value="work">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Preferences
              </CardTitle>
              <CardDescription>
                Customize your time tracking experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="defaultView">Default View</Label>
                  <Select
                    value={preferences.defaultView}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, defaultView: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my-day">My Day</SelectItem>
                      <SelectItem value="work-items">Work Items</SelectItem>
                      <SelectItem value="time-entries">Time Entries</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The page shown when you open the app
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select
                    value={preferences.timeFormat}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, timeFormat: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                      <SelectItem value="24h">24-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="weekStartsOn">Week Starts On</Label>
                  <Select
                    value={preferences.weekStartsOn}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, weekStartsOn: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Default Billable</Label>
                    <p className="text-sm text-muted-foreground">
                      New time entries are billable by default
                    </p>
                  </div>
                  <Switch
                    checked={preferences.defaultBillable}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, defaultBillable: checked }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePreferences}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
