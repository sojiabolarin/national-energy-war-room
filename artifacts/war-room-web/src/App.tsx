import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/layout/protected-route";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import GenerationPage from "@/pages/generation";
import TransmissionPage from "@/pages/transmission";
import GenerationMapPage from "@/pages/generation-map";
import DiscoRankingsPage from "@/pages/disco-rankings";
import ValueChainPage from "@/pages/value-chain-page";
import ComplaintsOverviewPage from "@/pages/complaints-overview";
import CitizenPortalHome from "@/pages/complaints/index";
import FileComplaint from "@/pages/complaints/file";
import TrackComplaint from "@/pages/complaints/track";
import SatisfactionForm from "@/pages/complaints/satisfaction";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      {/* Public citizen portal routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/complaints" element={<CitizenPortalHome />} />
      <Route path="/complaints/file" element={<FileComplaint />} />
      <Route path="/complaints/track" element={<TrackComplaint />} />
      <Route path="/complaints/satisfaction/:token" element={<SatisfactionForm />} />

      {/* Protected staff routes */}
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/generation" element={<ProtectedRoute><GenerationPage /></ProtectedRoute>} />
      <Route path="/transmission" element={<ProtectedRoute><TransmissionPage /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><GenerationMapPage /></ProtectedRoute>} />
      <Route path="/rankings" element={<ProtectedRoute><DiscoRankingsPage /></ProtectedRoute>} />
      <Route path="/value-chain" element={<ProtectedRoute><ValueChainPage /></ProtectedRoute>} />
      <Route path="/staff/complaints" element={<ProtectedRoute><ComplaintsOverviewPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
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
