import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import ChatLandingPage from "./pages/ChatLandingPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import CSHealthPage from "./pages/CSHealthPage";
import CSChurnPage from "./pages/CSChurnPage";
import CSFinancialPage from "./pages/CSFinancialPage";
import ChatWidget from "./pages/ChatWidget";
import AdminDashboard from "./pages/AdminDashboard";
import AdminWorkspace from "./pages/AdminWorkspace";
import AdminAttendants from "./pages/AdminAttendants";
import AdminCSATReport from "./pages/AdminCSATReport";

import AdminSettings from "./pages/AdminSettings";
import AdminDashboardGerencial from "./pages/AdminDashboardGerencial";
import AdminChatHistory from "./pages/AdminChatHistory";
import AdminBanners from "./pages/AdminBanners";
import PendingApproval from "./pages/PendingApproval";
import UserPortal from "./pages/UserPortal";
import People from "./pages/People";
import NPSSettings from "./pages/NPSSettings";
import MyProfile from "./pages/MyProfile";
import Backoffice from "./pages/Backoffice";
import SidebarLayout from "./components/SidebarLayout";

// Help Center - lazy loaded
const HelpOverview = lazy(() => import("./pages/HelpOverview"));
const HelpArticles = lazy(() => import("./pages/HelpArticles"));
const HelpArticleEditor = lazy(() => import("./pages/HelpArticleEditor"));
const HelpCollections = lazy(() => import("./pages/HelpCollections"));
const HelpSettings = lazy(() => import("./pages/HelpSettings"));
const HelpImport = lazy(() => import("./pages/HelpImport"));
const HelpPublicHome = lazy(() => import("./pages/HelpPublicHome"));
const HelpPublicCollection = lazy(() => import("./pages/HelpPublicCollection"));
const HelpPublicArticle = lazy(() => import("./pages/HelpPublicArticle"));

const queryClient = new QueryClient();

// Helper component for dynamic campaign redirect
const CampaignRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/nps/campaigns/${id}`} replace />;
};

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          {/* Public Landing Pages */}
          <Route path="/" element={<ChatLandingPage />} />
          <Route path="/journey" element={<LandingPage />} />
          
          {/* Chat Widget (public) */}
          <Route path="/widget" element={<ChatWidget />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/portal/:token" element={<UserPortal />} />
          
          {/* Auth & NPS Response */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/nps/:token" element={<NPSResponse />} />
          
          {/* Embedded NPS Widget */}
          <Route path="/embed" element={<NPSEmbed />} />

          {/* Public Help Center pages */}
          <Route path="/:tenantSlug/help" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicHome /></Suspense>} />
          <Route path="/:tenantSlug/help/c/:collectionSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicCollection /></Suspense>} />
          <Route path="/:tenantSlug/help/a/:articleSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicArticle /></Suspense>} />
          
          {/* Legacy routes redirect to new structure */}
          <Route path="/dashboard" element={<Navigate to="/nps/dashboard" replace />} />
          <Route path="/contacts" element={<Navigate to="/nps/contacts" replace />} />
          <Route path="/campaigns" element={<Navigate to="/nps/campaigns" replace />} />
          <Route path="/campaigns/:id" element={<CampaignRedirect />} />
          <Route path="/settings" element={<Navigate to="/nps/settings" replace />} />
          <Route path="/csms" element={<Navigate to="/nps/settings" replace />} />

          {/* Protected routes with persistent SidebarLayout */}
          <Route element={<SidebarLayout />}>
            {/* Chat Module */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/workspace" element={<AdminWorkspace />} />
            <Route path="/admin/workspace/:roomId" element={<AdminWorkspace />} />
            <Route path="/admin/attendants" element={<AdminAttendants />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/settings/:tab" element={<AdminSettings />} />
            <Route path="/admin/gerencial" element={<AdminDashboardGerencial />} />
            <Route path="/admin/history" element={<AdminChatHistory />} />
            <Route path="/admin/banners" element={<AdminBanners />} />
            <Route path="/admin/csat" element={<AdminCSATReport />} />

            {/* NPS Module */}
            <Route path="/nps/dashboard" element={<Dashboard />} />
            <Route path="/nps/contacts" element={<Contacts />} />
            <Route path="/nps/people" element={<People />} />
            <Route path="/nps/campaigns" element={<Campaigns />} />
            <Route path="/nps/campaigns/:id" element={<CampaignDetails />} />
            <Route path="/nps/settings" element={<Settings />} />
            <Route path="/nps/nps-settings" element={<NPSSettings />} />

            {/* CS Module */}
            <Route path="/cs-dashboard" element={<CSDashboard />} />
            <Route path="/cs-trails" element={<CSTrailsPage />} />
            <Route path="/cs-health" element={<CSHealthPage />} />
            <Route path="/cs-churn" element={<CSChurnPage />} />
            <Route path="/cs-financial" element={<CSFinancialPage />} />

            {/* Help Center Module */}
            <Route path="/help/overview" element={<Suspense fallback={<SuspenseFallback />}><HelpOverview /></Suspense>} />
            <Route path="/help/articles" element={<Suspense fallback={<SuspenseFallback />}><HelpArticles /></Suspense>} />
            <Route path="/help/articles/new" element={<Suspense fallback={<SuspenseFallback />}><HelpArticleEditor /></Suspense>} />
            <Route path="/help/articles/:id/edit" element={<Suspense fallback={<SuspenseFallback />}><HelpArticleEditor /></Suspense>} />
            <Route path="/help/collections" element={<Suspense fallback={<SuspenseFallback />}><HelpCollections /></Suspense>} />
            <Route path="/help/settings" element={<Suspense fallback={<SuspenseFallback />}><HelpSettings /></Suspense>} />
            <Route path="/help/import" element={<Suspense fallback={<SuspenseFallback />}><HelpImport /></Suspense>} />

            {/* Profile */}
            <Route path="/profile" element={<MyProfile />} />

            {/* Backoffice Master */}
            <Route path="/backoffice" element={<Backoffice />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
