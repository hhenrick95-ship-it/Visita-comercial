import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AIChatButton } from "@/components/AIChatButton";
import Auth from "./pages/Auth";
import PendingApproval from "./pages/PendingApproval";
import UserManagement from "./pages/UserManagement";
import TeamManagement from "./pages/TeamManagement";
import Visitas from "./pages/Visitas";
import SemLocalizacao from "./pages/SemLocalizacao";
import FormBuilder from "./pages/FormBuilder";
import FormTemplatesList from "./pages/FormTemplatesList";
import DynamicFormPage from "./pages/DynamicFormPage";
import Home from "./pages/Home";
import NovaVisita from "./pages/NovaVisita";
import VisitaComercial from "./pages/VisitaComercial";
import Dashboard from "./pages/Dashboard";
import Feedbacks from "./pages/Feedbacks";
import FeedbackForm from "./pages/FeedbackForm";
import Documentation from "./pages/Documentation";
import Tutorial from "./pages/Tutorial";
import ClientUpdate from "./pages/ClientUpdate";
import PesquisaSatisfacaoLogistica from "./pages/PesquisaSatisfacaoLogistica";
import SatisfacaoLogisticaResultados from "./pages/SatisfacaoLogisticaResultados";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AIChatButton />
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending" element={<PendingApproval />} />
            <Route path="/pesquisa/satisfacao-logistica" element={<PesquisaSatisfacaoLogistica />} />
            
            {/* Protected routes - require approval */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visitas/nova"
              element={
                <ProtectedRoute>
                  <NovaVisita />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visitas/nova/visita-comercial"
              element={
                <ProtectedRoute>
                  <VisitaComercial />
                </ProtectedRoute>
              }
            />
            <Route
              path="/form/:slug"
              element={
                <ProtectedRoute>
                  <DynamicFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedbacks"
              element={
                <ProtectedRoute>
                  <Feedbacks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback/:visitId"
              element={
                <ProtectedRoute>
                  <FeedbackForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/visitas"
              element={
                <ProtectedRoute>
                  <Visitas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sem-localizacao"
              element={
                <ProtectedRoute requireRole="admin">
                  <SemLocalizacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/satisfacao-logistica"
              element={
                <ProtectedRoute requireRole="admin">
                  <SatisfacaoLogisticaResultados />
                </ProtectedRoute>
              }
            />
            
            {/* Admin-only routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute requireRole="admin">
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-management"
              element={
                <ProtectedRoute requireRole="admin">
                  <TeamManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/form-builder"
              element={
                <ProtectedRoute requireRole="admin">
                  <FormTemplatesList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/form-builder/:templateId"
              element={
                <ProtectedRoute requireRole="admin">
                  <FormBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documentation"
              element={
                <ProtectedRoute>
                  <Documentation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tutorial"
              element={
                <ProtectedRoute>
                  <Tutorial />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes/atualizacao-cadastral"
              element={
                <ProtectedRoute>
                  <ClientUpdate />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
