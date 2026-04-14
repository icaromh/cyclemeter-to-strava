import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Strava Sync Checker</div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/activities">Atividades</NavLink>
          <NavLink to="/upload">Upload</NavLink>
          <NavLink to="/login">Conectar</NavLink>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
