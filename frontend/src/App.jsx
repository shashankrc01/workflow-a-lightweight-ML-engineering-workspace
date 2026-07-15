import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ProjectsPage } from "./pages/ProjectsPage.jsx";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout.jsx";
import { OverviewPage } from "./pages/OverviewPage.jsx";
import { DatasetsPage } from "./pages/DatasetsPage.jsx";
import { TrainPage } from "./pages/TrainPage.jsx";
import { ExperimentsPage } from "./pages/ExperimentsPage.jsx";
import { DeploymentsPage } from "./pages/DeploymentsPage.jsx";
import { InferencePage } from "./pages/InferencePage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<WorkspaceLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="train" element={<TrainPage />} />
            <Route path="experiments" element={<ExperimentsPage />} />
            <Route path="deployments" element={<DeploymentsPage />} />
            <Route path="inference" element={<InferencePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
