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
// CSMsPage now redirects to settings via route below
import CSHealthPage from "./pages/CSHealthPage";
import CSChurnPage from "./pages/CSChurnPage";
import CSFinancialPage from "./pages/CSFinancialPage";
import ChatWidget from "./pages/ChatWidget";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWorkspace from "./pages/AdminWorkspace";
import AdminAttendants from "./pages/AdminAttendants";

import AdminSettings from "./pages/AdminSettings";
import AdminDashboardGerencial from "./pages/AdminDashboardGerencial";
import AdminChatHistory from "./pages/AdminChatHistory";
import AdminBanners from "./pages/AdminBanners";
import PendingApproval from "./pages/PendingApproval";
import UserPortal from "./pages/UserPortal";
import People from "./pages/People";
import NPSSettings from "./pages/NPSSettings";

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
          <Route path="/csms" element={<Navigate to="/nps/settings" replace />} />
          
          {/* Chat Module Routes */}
          <Route path="/widget" element={<ChatWidget />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/workspace" element={<AdminWorkspace />} />
          <Route path="/admin/workspace/:roomId" element={<AdminWorkspace />} />
          <Route path="/admin/attendants" element={<AdminAttendants />} />
          {/* /admin/users removed - managed via Settings > Team tab */}
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/settings/:tab" element={<AdminSettings />} />
          <Route path="/admin/gerencial" element={<AdminDashboardGerencial />} />
          <Route path="/admin/history" element={<AdminChatHistory />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/portal/:token" element={<UserPortal />} />
          
          {/* NPS Module Routes */}
          <Route path="/nps/dashboard" element={<Dashboard />} />
          <Route path="/nps/contacts" element={<Contacts />} />
          <Route path="/nps/people" element={<People />} />
          <Route path="/nps/campaigns" element={<Campaigns />} />
          <Route path="/nps/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/nps/settings" element={<Settings />} />
          <Route path="/nps/nps-settings" element={<NPSSettings />} />
          
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
