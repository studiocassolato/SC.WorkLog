import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "lib/utils"
import { useWorkLog } from "lib/worklog-context"
import { useAuth } from "helpers/services/AuthContext"
import { Button } from "components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "components/ui/sheet"
import { Avatar, AvatarFallback } from "components/ui/avatar"
import { Input } from "components/ui/input"
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Clock,
  CheckSquare,
  FileCheck,
  FileText,
  FolderKanban,
  Settings,
  Menu,
  Plus,
  ChevronLeft,
  User,
  LogOut,
  ChevronDown,
  Search,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  employeeOnly?: boolean
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: true },
  { label: "My Day", href: "/my-day", icon: Calendar, employeeOnly: true },
  { label: "Projects", href: "/projects", icon: FolderKanban, employeeOnly: true },
  { label: "Work Items", href: "/work-items", icon: ClipboardList, employeeOnly: true },
  { label: "Time Entries", href: "/time-entries", icon: Clock, employeeOnly: true },
  { label: "Time Completeness", href: "/time-completeness", icon: CheckSquare, adminOnly: true },
  { label: "Approvals", href: "/approvals", icon: FileCheck, adminOnly: true },
  { label: "Customer Reports", href: "/customer-reports", icon: FileText, adminOnly: true },
  { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
  { label: "User Settings", href: "/user-settings", icon: User, employeeOnly: true },
]

function getVisibleNavItems(isAdmin: boolean, isEmployee: boolean) {
  return navItems.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.employeeOnly) return isEmployee
    return true
  })
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const { pathname } = useLocation()
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

  return (
    <Link
     to={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { isAdmin, isEmployee } = useAuth()
  const filteredNavItems = getVisibleNavItems(isAdmin, isEmployee)

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-2")}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              SC
            </div>
            <span className="font-semibold">WorkLog</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            SC
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-3 border-r">
        {filteredNavItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>
      <div className="border-t border-r p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          onClick={onToggle}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="text-sm">Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const { isAdmin, isEmployee } = useAuth()
  const [open, setOpen] = useState(false)
  const filteredNavItems = getVisibleNavItems(isAdmin, isEmployee)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center border-b px-4 gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            SC
          </div>
          <span className="font-semibold">WorkLog</span>
        </div>
        <nav className="space-y-0.5 p-3">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
             to={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

export function TopBar({ onAddTime, onAddWorkItem }: { onAddTime: () => void; onAddWorkItem?: () => void }) {
  const { role, setRole, currentUser } = useWorkLog()
  const { currentUser: backendCurrentUser, displayName, email, isAdmin, signOut } = useAuth()
  const showDemoRoleSwitcher = import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCHER !== 'false'
  const userLabel = displayName || `${currentUser.firstName} ${currentUser.lastName}`
  const userEmail = email || currentUser.email
  const backendRole = backendCurrentUser?.role ?? 'Unknown'
  const backendUserType = backendCurrentUser?.userType ?? 'Unknown'
  const initials = (userLabel || userEmail || 'WL')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <MobileNav />

      {/* Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search projects, work items..."
            className="pl-9 h-8 w-full bg-muted/50 border-0 focus-visible:bg-card focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right side - actions and user */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {onAddWorkItem && isAdmin && (
          <Button size="sm" variant="outline" onClick={onAddWorkItem} className="gap-1.5 h-8 px-3 text-sm font-medium">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Work Item</span>
          </Button>
        )}

        <Button size="sm" onClick={onAddTime} className="gap-1.5 h-8 px-3 text-sm font-medium">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Time</span>
        </Button>

        {showDemoRoleSwitcher && (
          <div className="hidden sm:flex flex-col gap-0.5">
            <Select value={role} onValueChange={(value) => setRole(value as "Admin" | "Employee")}>
              <SelectTrigger className="w-28 h-8 text-sm border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] leading-none text-muted-foreground">Demo UI only</span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 pl-2 border-l ml-1 h-8 px-2 hover:bg-accent/30">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium">
                {userLabel}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userLabel}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <p className="text-xs text-muted-foreground">Role: {backendRole}</p>
                <p className="text-xs text-muted-foreground">User type: {backendUserType}</p>
                {showDemoRoleSwitcher && (
                  <p className="text-xs text-muted-foreground">Demo UI role: {role}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/user-settings">
                <User className="mr-2 h-4 w-4" />
                User Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => void signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function MobileBottomNav() {
  const { pathname } = useLocation()
  const { isAdmin, isEmployee } = useAuth()

  const mobileNavItems = [
    ...(isEmployee
      ? [
          { label: "My Day", href: "/my-day", icon: Calendar },
          { label: "Projects", href: "/projects", icon: FolderKanban },
          { label: "Work Items", href: "/work-items", icon: ClipboardList },
          { label: "Time", href: "/time-entries", icon: Clock },
        ]
      : []),
    ...(isAdmin
      ? [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }]
      : []),
    { label: "More", href: isAdmin ? "/settings" : "/user-settings", icon: Settings },
  ].slice(0, 5)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background lg:hidden">
      {mobileNavItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
           to={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
