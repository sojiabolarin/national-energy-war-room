import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { AdminLayout } from "@/components/layout/admin-layout";
import NotFound from "@/pages/not-found";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ComplaintsPage from "@/pages/complaints/index";
import ComplaintDetailPage from "@/pages/complaints/detail";
import PlantsPage from "@/pages/registry/plants";
import TransmissionPage from "@/pages/registry/transmission";
import DiscosPage from "@/pages/registry/discos";
import GasPage from "@/pages/registry/gas";
import ProjectsPage from "@/pages/registry/projects";
import MinigridsPage from "@/pages/registry/minigrids";
import ValueChainPage from "@/pages/registry/value-chain";
import GridMetricsPage from "@/pages/operations/grid-metrics";
import SettlementPage from "@/pages/operations/settlement";
import AlertsPage from "@/pages/operations/alerts";
import ImportsPage from "@/pages/imports";
import EscalationRulesPage from "@/pages/escalation-rules";
import UsersPage from "@/pages/users";
import AuditLogPage from "@/pages/audit-log";
import SettingsPage from "@/pages/settings";
import DataQualityPage from "@/pages/data-quality";
import TariffOrdersPage from "@/pages/regulatory/tariff-orders";
import StateRegulatorsPage from "@/pages/regulatory/state-regulators";
import DispatchHistoryPage from "@/pages/regulatory/dispatch-history";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const REGISTRY_OPS_ROLES = ["ADMIN", "MINISTRY_STAFF", "NERC_VIEWER"] as const;
const WRITE_ROLES = ["ADMIN", "MINISTRY_STAFF"] as const;
const ADMIN_ONLY = ["ADMIN"] as const;

function AdminRoutes() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/complaints" element={<ComplaintsPage />} />
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />

          <Route
            path="/registry/plants"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <PlantsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/transmission"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <TransmissionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/discos"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <DiscosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/gas"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <GasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/projects"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <ProjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/minigrids"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <MinigridsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registry/value-chain"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <ValueChainPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operations/grid-metrics"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <GridMetricsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operations/settlement"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <SettlementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operations/alerts"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/imports"
            element={
              <ProtectedRoute requiredRoles={[...WRITE_ROLES]}>
                <ImportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/escalation-rules"
            element={
              <ProtectedRoute requiredRoles={[...WRITE_ROLES]}>
                <EscalationRulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={[...ADMIN_ONLY]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/data-quality"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <DataQualityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regulatory/tariff-orders"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <TariffOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regulatory/state-regulators"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <StateRegulatorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regulatory/dispatch-history"
            element={
              <ProtectedRoute requiredRoles={[...REGISTRY_OPS_ROLES]}>
                <DispatchHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute requiredRoles={[...ADMIN_ONLY]}>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRoles={[...ADMIN_ONLY]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/*" element={<AdminRoutes />} />
    </Routes>
  );
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter basename={base === "/" ? undefined : base}>
            <AppRoutes />
          </BrowserRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
