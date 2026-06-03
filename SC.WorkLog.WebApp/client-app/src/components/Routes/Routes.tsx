import { Redirect, Route, Switch } from 'react-router-dom'
import type { ComponentType } from 'react'
import { AppLayout } from 'components/app-layout'
import { useWorkLog } from 'lib/worklog-context'
import Approvals from 'views/Approvals'
import CustomerReports from 'views/CustomerReports'
import Dashboard from 'views/Dashboard'
import MyDay from 'views/MyDay'
import ProjectDetail from 'views/ProjectDetail'
import Projects from 'views/Projects'
import Settings from 'views/Settings'
import TimeCompleteness from 'views/TimeCompleteness'
import TimeEntries from 'views/TimeEntries'
import UserSettings from 'views/UserSettings'
import WorkItemDetail from 'views/WorkItemDetail'
import WorkItems from 'views/WorkItems'

type AdminRouteProps = {
  component: ComponentType
  exact?: boolean
  path: string
}

const AdminRoute = ({ component: Component, ...routeProps }: AdminRouteProps) => {
  const { role } = useWorkLog()

  return (
    <Route
      {...routeProps}
      render={() => (role === 'Admin' ? <Component /> : <Redirect to="/my-day" />)}
    />
  )
}

const Routes = () => {
  return (
    <AppLayout>
      <Switch>
        <Route exact path="/">
          <Redirect to="/dashboard" />
        </Route>
        <AdminRoute exact path="/dashboard" component={Dashboard} />
        <Route exact path="/my-day" component={MyDay} />
        <Route exact path="/projects" component={Projects} />
        <Route exact path="/projects/:id" component={ProjectDetail} />
        <Route exact path="/work-items" component={WorkItems} />
        <Route exact path="/work-items/:id" component={WorkItemDetail} />
        <Route exact path="/time-entries" component={TimeEntries} />
        <Route exact path="/time-completeness" component={TimeCompleteness} />
        <AdminRoute exact path="/approvals" component={Approvals} />
        <AdminRoute exact path="/customer-reports" component={CustomerReports} />
        <AdminRoute exact path="/settings" component={Settings} />
        <Route exact path="/user-settings" component={UserSettings} />
        <Redirect to="/dashboard" />
      </Switch>
    </AppLayout>
  )
}

export default Routes
