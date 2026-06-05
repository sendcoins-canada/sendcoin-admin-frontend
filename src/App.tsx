import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Provider } from 'react-redux';
import { store } from './store';
import NotFound from '@/pages/not-found';

// Guards
import { AuthGuard, GuestGuard, PermissionGuard } from '@/components/guards';

// Auth pages
import Login from '@/pages/Login';
import SetupPassword from '@/pages/SetupPassword';
import ConfirmPassword from '@/pages/ConfirmPassword';

// Protected pages
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import ManageTeam from '@/pages/ManageTeam';
import Users from '@/pages/Users';
import AuditLogs from '@/pages/AuditLogs';
import Wallets from '@/pages/Wallets';
import KycQueue from '@/pages/KycQueue';
import Conversions from '@/pages/Conversions';
import Analytics from '@/pages/Analytics';
import BankAccounts from '@/pages/BankAccounts';
import Merchants from '@/pages/Merchants';
import Settings from '@/pages/Settings';
import Mail from '@/pages/Mail';
import Newsletter from '@/pages/Newsletter';
import Security from '@/pages/Security';
import Rates from '@/pages/Rates';

// =============================================================================
// Route Components with Guards
// =============================================================================

/**
 * Guest routes - only accessible when not authenticated
 */
const GuestRoutes = () => (
  <GuestGuard>
    <Switch>
      {/* More specific paths first (wouter uses prefix matching; "/" would match everything) */}
      <Route path="/set-password" component={SetupPassword} />
      <Route path="/reset-password" component={SetupPassword} />
      <Route path="/setup-password" component={SetupPassword} />
      <Route path="/confirm-password" component={ConfirmPassword} />
      <Route path="/login" component={Login} />
      <Route path="/" component={Login} />
      <Route component={NotFound} />
    </Switch>
  </GuestGuard>
);

/**
 * Protected routes - only accessible when authenticated
 */
const ProtectedRoutes = () => (
  <AuthGuard>
    <Switch>
      {/* Dashboard */}
      <Route path="/dashboard">
        <PermissionGuard permission="VIEW_DASHBOARD">
          <Dashboard />
        </PermissionGuard>
      </Route>

      {/* Transactions - requires transaction permissions */}
      <Route path="/transactions">
        <PermissionGuard anyOf={['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS']}>
          <Transactions />
        </PermissionGuard>
      </Route>

      {/* Users - requires user permissions */}
      <Route path="/users">
        <PermissionGuard anyOf={['READ_USERS', 'SUSPEND_USERS', 'VERIFY_KYC']}>
          <Users />
        </PermissionGuard>
      </Route>

      {/* Team Management - requires team permissions */}
      <Route path="/team">
        <PermissionGuard permission="MANAGE_ADMINS">
          <ManageTeam />
        </PermissionGuard>
      </Route>
      <Route path="/manage-team">
        <PermissionGuard permission="MANAGE_ADMINS">
          <ManageTeam />
        </PermissionGuard>
      </Route>


      {/* Wallets */}
      <Route path="/wallets">
        <PermissionGuard permission="READ_WALLETS">
          <Wallets />
        </PermissionGuard>
      </Route>

      {/* KYC Queue */}
      <Route path="/kyc">
        <PermissionGuard permission="VERIFY_KYC">
          <KycQueue />
        </PermissionGuard>
      </Route>

      {/* Conversions */}
      <Route path="/conversions">
        <PermissionGuard anyOf={['READ_TRANSACTIONS', 'VERIFY_TRANSACTIONS']}>
          <Conversions />
        </PermissionGuard>
      </Route>

      {/* Analytics */}
      <Route path="/analytics">
        <PermissionGuard permission="VIEW_ANALYTICS">
          <Analytics />
        </PermissionGuard>
      </Route>

      {/* Audit Logs */}
      <Route path="/audit-logs">
        <PermissionGuard permission="READ_AUDIT_LOGS">
          <AuditLogs />
        </PermissionGuard>
      </Route>

      {/* Bank Accounts */}
      <Route path="/bank-accounts">
        <PermissionGuard permission="READ_USERS">
          <BankAccounts />
        </PermissionGuard>
      </Route>

      {/* Merchants */}
      <Route path="/merchants">
        <PermissionGuard anyOf={['READ_USERS', 'VERIFY_KYC']}>
          <Merchants />
        </PermissionGuard>
      </Route>

      {/* Mail */}
      <Route path="/mail">
        <PermissionGuard anyOf={['VIEW_ANALYTICS', 'MANAGE_ADMINS', 'SEND_EMAILS']}>
          <Mail />
        </PermissionGuard>
      </Route>

      {/* Newsletter */}
      <Route path="/newsletter">
        <PermissionGuard anyOf={['MANAGE_ADMINS', 'SEND_EMAILS']}>
          <Newsletter />
        </PermissionGuard>
      </Route>

      {/* System Settings */}
      <Route path="/settings">
        <PermissionGuard permission="MANAGE_ADMINS">
          <Settings />
        </PermissionGuard>
      </Route>

      {/* Currency Rates */}
      <Route path="/rates">
        <PermissionGuard permission="READ_RATES">
          <Rates />
        </PermissionGuard>
      </Route>

      {/* Security Settings - accessible to all authenticated users */}
      <Route path="/security" component={Security} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  </AuthGuard>
);

// =============================================================================
// Main Router
// =============================================================================

function Router() {
  return (
    <Switch>
      {/* Guest routes: specific paths first (wouter prefix-matches; "/" matches all) */}
      <Route path="/set-password" component={GuestRoutes} />
      <Route path="/reset-password" component={GuestRoutes} />
      <Route path="/setup-password" component={GuestRoutes} />
      <Route path="/confirm-password" component={GuestRoutes} />
      <Route path="/login" component={GuestRoutes} />
      <Route path="/" component={GuestRoutes} />

      {/* All other routes are protected */}
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

// =============================================================================
// App Component
// =============================================================================

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
