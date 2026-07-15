import { NavLink, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon.jsx";

const NAV_ITEMS = [
  { to: "", label: "Overview", icon: Icon.Grid, end: true },
  { to: "datasets", label: "Datasets", icon: Icon.Database },
  { to: "train", label: "Train", icon: Icon.Play },
  { to: "experiments", label: "Experiments", icon: Icon.Beaker },
  { to: "deployments", label: "Deployments", icon: Icon.Rocket },
  { to: "inference", label: "Inference", icon: Icon.Send },
];

export function Sidebar({ project }) {
  const navigate = useNavigate();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-text">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-hover font-mono text-xs font-bold text-white shadow">
          WF
        </div>
        <span className="text-sm font-semibold text-sidebar-text-active">WorkFlow</span>
      </div>

      <button
        onClick={() => navigate("/")}
        className="mx-3 mb-4 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active"
      >
        <Icon.ChevronLeft size={14} />
        All projects
      </button>

      <div className="px-5 pb-2">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-sidebar-text/60">
          Current project
        </p>
        <p className="truncate text-sm font-medium text-sidebar-text-active" title={project?.name}>
          {project?.name || "Loading..."}
        </p>
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:content-[''] ${
                isActive
                  ? "bg-sidebar-hover text-sidebar-text-active before:bg-accent"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active before:bg-transparent"
              }`
            }
          >
            <item.icon size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-sidebar-text/60">
        Lightweight ML Engineering Workspace
      </div>
    </aside>
  );
}
