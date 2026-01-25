import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import Settings from "./pages/Settings";
import NPSResponse from "./pages/NPSResponse";
import NPSEmbed from "./pages/NPSEmbed";
import NotFound from "./pages/NotFound";
import CSDashboard from "./pages/CSDashboard";
import CSTrailsPage from "./pages/CSTrailsPage";
import CSMsPage from "./pages/CSMsPage";
import CSHealthPage from "./pages/CSHealthPage";
import CSChurnPage from "./pages/CSChurnPage";
import CSFinancialPage from "./pages/CSFinancialPage";

const queryClient = new QueryClient();

// Helper component for dynamic campaign redirect
const CampaignRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/nps/campaigns/${id}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* CS Dashboard is the new homepage */}
          <Route path="/" element={<Navigate to="/cs-dashboard" replace />} />
          <Route path="/cs-dashboard" element={<CSDashboard />} />
          <Route path="/cs-trails" element={<CSTrailsPage />} />
          <Route path="/cs-health" element={<CSHealthPage />} />
          <Route path="/cs-churn" element={<CSChurnPage />} />
          <Route path="/cs-financial" element={<CSFinancialPage />} />
          <Route path="/csms" element={<CSMsPage />} />
          
          {/* NPS Module Routes */}
          <Route path="/nps/dashboard" element={<Dashboard />} />
          <Route path="/nps/contacts" element={<Contacts />} />
          <Route path="/nps/campaigns" element={<Campaigns />} />
          <Route path="/nps/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/nps/settings" element={<Settings />} />
          
          {/* Legacy routes redirect to new structure */}
          <Route path="/dashboard" element={<Navigate to="/nps/dashboard" replace />} />
          <Route path="/contacts" element={<Navigate to="/nps/contacts" replace />} />
          <Route path="/campaigns" element={<Navigate to="/nps/campaigns" replace />} />
          <Route path="/campaigns/:id" element={<CampaignRedirect />} />
          <Route path="/settings" element={<Navigate to="/nps/settings" replace />} />
          
          {/* Auth & NPS Response */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/nps/:token" element={<NPSResponse />} />
          
          {/* Embedded NPS Widget */}
          <Route path="/embed" element={<NPSEmbed />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
