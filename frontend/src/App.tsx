import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { Layout } from './components/layout/Layout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { UploadCenterPage } from './pages/UploadCenterPage.js';
import { ReviewPage } from './pages/ReviewPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { DevicesPage } from './pages/DevicesPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';

// Version 2 Pages
import { FocusPage } from './pages/FocusPage';
import { BlockerPage } from './pages/BlockerPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { AutomationPage } from './pages/AutomationPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

// Version 3 Pages
import { AiAssistantPage } from './pages/AiAssistantPage';
import { PredictionsPage } from './pages/PredictionsPage';
import { PlannerPage } from './pages/PlannerPage';
import { CommunityPage } from './pages/CommunityPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DeveloperPage } from './pages/DeveloperPage';

// Version 4 Autonomous Operating System Pages
import { PersonalOsPage } from './pages/v4/PersonalOsPage';
import { AgentsStudioPage } from './pages/v4/AgentsStudioPage';
import { WorkflowStudioPage } from './pages/v4/WorkflowStudioPage';
import { KnowledgeHubPage } from './pages/v4/KnowledgeHubPage';
import { SimulationsPage } from './pages/v4/SimulationsPage';
import { ReflectionsPage } from './pages/v4/ReflectionsPage';
import { EcosystemPage } from './pages/v4/EcosystemPage';
import { PlatformEnterprisePage } from './pages/v4/PlatformEnterprisePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Version 4 Operating System Routes */}
          <Route
            path="/os"
            element={
              <ProtectedRoute>
                <PersonalOsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                <AgentsStudioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows"
            element={
              <ProtectedRoute>
                <WorkflowStudioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge"
            element={
              <ProtectedRoute>
                <KnowledgeHubPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulations"
            element={
              <ProtectedRoute>
                <SimulationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reflections"
            element={
              <ProtectedRoute>
                <ReflectionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ecosystem"
            element={
              <ProtectedRoute>
                <EcosystemPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/platform"
            element={
              <ProtectedRoute>
                <PlatformEnterprisePage />
              </ProtectedRoute>
            }
          />

          {/* Core V1 Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <PersonalOsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/uploads"
            element={
              <ProtectedRoute>
                <UploadCenterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute>
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedRoute>
                <DevicesPage />
              </ProtectedRoute>
            }
          />

          {/* Version 2 Routes */}
          <Route
            path="/focus"
            element={
              <ProtectedRoute>
                <FocusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blocking"
            element={
              <ProtectedRoute>
                <BlockerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/routines"
            element={
              <ProtectedRoute>
                <RoutinesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/automation"
            element={
              <ProtectedRoute>
                <AutomationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <AchievementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Version 3 Intelligent Ecosystem Routes */}
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AiAssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <PredictionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/planner"
            element={
              <ProtectedRoute>
                <PlannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <PrivacyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/developer"
            element={
              <ProtectedRoute>
                <DeveloperPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
