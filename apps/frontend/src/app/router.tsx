import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "../routes/AppLayout";
import { LoginRoute } from "../routes/LoginRoute";
import { DashboardRoute } from "../routes/DashboardRoute";
import { UploadCheckRoute } from "../routes/UploadCheckRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "login", element: <LoginRoute /> },
      { path: "dashboard", element: <DashboardRoute /> },
      { path: "upload", element: <UploadCheckRoute /> }
    ]
  }
]);

