import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, CheckCircle2, Circle, ClipboardList, FolderKanban, LayoutDashboard, LogOut, Plus, Search, Settings, Users, X } from "lucide-react";
import { getToken, request } from "./api";

type User = { id: string; name: string; email: string };
type Org = { id: string; name: string; role: string };
type Project = { id: string; name: string; description: string; _count?: { tasks: number } };
type Task = { id: string; title: string; description: string; status: string; priority: string; assignee?: { name: string } | null; _count?: { comments: number } };
const columns = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const labels: Record<string, string> = { TODO: "To do", IN_PROGRESS: "In progress", REVIEW: "In review", DONE: "Done" };

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState<User | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [view, setView] = useState<"overview" | "board">("overview");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"project" | "task" | null>(null);
  const [search, setSearch] = useState("");

  async function loadWorkspace() {
    const me = await request("/api/auth/me");
    setUser(me);
    const list: Org[] = await request("/api/organizations");
    setOrgs(list);
    if (list.length) {
      setOrg(list[0]);
      const p: Project[] = await request(`/api/projects?organizationId=${list[0].id}`);
      setProjects(p);
      const d = await request(`/api/dashboard?organizationId=${list[0].id}`);
      setDashboard(d);
      if (p.length) { setProject(p[0]); setTasks(await request(`/api/tasks/project/${p[0].id}`)); }
    }
  }
  useEffect(() => { if (token) loadWorkspace().catch(e => { setError(e.message); localStorage.removeItem("teamflow_token"); setToken(null); }); }, [token]);
  async function refreshProject(p = project) {
    if (p) setTasks(await request(`/api/tasks/project/${p.id}`));
    if (org) setDashboard(await request(`/api/dashboard?organizationId=${org.id}`));
  }
  async function submitAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const payload: any = { email: form.get("email"), password: form.get("password") };
      if (authMode === "signup") { payload.name = form.get("name"); payload.organizationName = form.get("organizationName"); }
      const result = await request(`/api/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("teamflow_token", result.token); setToken(result.token);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function logout() { localStorage.removeItem("teamflow_token"); setToken(null); setUser(null); setOrg(null); setProject(null); }
  async function createProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try {
      const p = await request("/api/projects", { method: "POST", body: JSON.stringify({ organizationId: org?.id, name: f.get("name"), description: f.get("description") }) });
      setProjects([p, ...projects]); setProject(p); setTasks([]); setModal(null); setView("board");
    } catch (e) { setError((e as Error).message); }
  }
  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    try {
      await request("/api/tasks", { method: "POST", body: JSON.stringify({ projectId: project?.id, title: f.get("title"), description: f.get("description"), priority: f.get("priority") }) });
      setModal(null); await refreshProject();
    } catch (e) { setError((e as Error).message); }
  }
  async function moveTask(task: Task, status: string) {
    try { await request(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await refreshProject(); }
    catch (e) { setError((e as Error).message); }
  }
  const visibleTasks = useMemo(() => tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())), [tasks, search]);

  if (!token) return <main className="auth-shell"><div className="auth-card"><div className="brand-mark">T</div><p className="eyebrow">WORK, IN SYNC</p><h1>{authMode === "login" ? "Welcome back." : "Create your workspace."}</h1><p className="muted">Plan clearly. Move work forward. Keep your team aligned.</p>
    <form onSubmit={submitAuth} className="form-stack">
      {authMode === "signup" && <><label>Your name<input name="name" required minLength={2} placeholder="Aditya" /></label><label>Organization name<input name="organizationName" required minLength={2} placeholder="Acme Studio" /></label></>}
      <label>Email address<input name="email" type="email" required placeholder="you@company.com" /></label>
      <label>Password<input name="password" type="password" required minLength={8} placeholder="At least 8 characters" /></label>
      {error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"} <ArrowRight size={16}/></button>
    </form>
    <p className="switch-auth">{authMode === "login" ? "New to TeamFlow?" : "Already have an account?"} <button onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Create an account" : "Sign in"}</button></p>
    <p className="demo-hint">Demo: demo@teamflow.local · Password123!</p></div></main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark small">T</div><span>teamflow</span></div>
      <div className="workspace-label">WORKSPACE</div><div className="workspace-select"><div className="org-avatar">{org?.name?.[0] || "A"}</div><span>{org?.name || "Loading workspace"}</span><span className="chevron">⌄</span></div>
      <nav><button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => setView("overview")}><LayoutDashboard size={17}/> Overview</button><button className={view === "board" ? "nav-item active" : "nav-item"} onClick={() => setView("board")}><FolderKanban size={17}/> Projects</button><button className="nav-item" onClick={() => setView("overview")}><Users size={17}/> Team</button></nav>
      <div className="sidebar-section"><span>YOUR PROJECTS</span><button className="icon-button" onClick={() => setModal("project")} title="New project"><Plus size={15}/></button></div>
      {projects.map(p => <button key={p.id} className={project?.id === p.id ? "project-link selected" : "project-link"} onClick={async () => { setProject(p); setTasks(await request(`/api/tasks/project/${p.id}`)); setView("board"); }}><span className="project-dot"/> {p.name}</button>)}
      <div className="sidebar-bottom"><div className="user-mini"><div className="user-avatar">{user?.name?.[0] || "U"}</div><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div><button className="icon-button" onClick={logout} title="Log out"><LogOut size={17}/></button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> {view === "overview" ? "Overview" : project?.name || "Projects"}</div><div className="top-actions"><div className="searchbox"><Search size={15}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" /></div><div className="user-avatar">{user?.name?.[0] || "U"}</div></div></header>
      <section className="page-content">
        {error && <div className="alert">{error}<button onClick={() => setError("")}><X size={14}/></button></div>}
        {view === "overview" ? <><div className="page-heading"><div><p className="eyebrow">MONDAY, LET'S MAKE PROGRESS</p><h1>Good work starts here.</h1><p className="muted">Here's what's happening across your workspace.</p></div><button className="primary" onClick={() => setModal("project")}><Plus size={16}/> New project</button></div>
          <div className="stat-grid">{[{label:"Total tasks",value:dashboard?.total ?? 0,icon:<ClipboardList/>},{label:"To do",value:dashboard?.todo ?? 0,icon:<Circle/>},{label:"In progress",value:dashboard?.progress ?? 0,icon:<Activity/>},{label:"Completed",value:dashboard?.done ?? 0,icon:<CheckCircle2/>}].map(s=><div className="stat-card" key={s.label}><div className="stat-top">{s.label}<span>{s.icon}</span></div><strong>{s.value}</strong><small>Across your workspace</small></div>)}</div>
          <div className="overview-grid"><div className="panel"><div className="panel-heading"><div><h2>Projects</h2><p className="muted">Work your team is moving forward</p></div><button className="text-button" onClick={() => setView("board")}>View board <ArrowRight size={14}/></button></div>
            {projects.length ? projects.map(p=><button className="project-row" key={p.id} onClick={async()=>{setProject(p);setTasks(await request(`/api/tasks/project/${p.id}`));setView("board");}}><div className="project-icon"><FolderKanban size={18}/></div><div className="project-info"><strong>{p.name}</strong><small>{p.description || "No description"}</small></div><span className="task-count">{p._count?.tasks ?? 0} tasks</span><ArrowRight size={16}/></button>) : <div className="empty"><FolderKanban size={28}/><strong>No projects yet</strong><span>Create a project to get started.</span></div>}
          </div><div className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p className="muted">Latest updates from your team</p></div></div>
            {dashboard?.recent?.length ? dashboard.recent.map((a:any)=><div className="activity-row" key={a.id}><div className="activity-avatar">{a.user.name[0]}</div><div><strong>{a.user.name}</strong><p>{a.details}</p><small>{new Date(a.createdAt).toLocaleString()}</small></div></div>) : <div className="empty"><Activity size={26}/><span>Activity will appear here.</span></div>}
          </div></div>
        </> : <><div className="page-heading"><div><p className="eyebrow">PROJECT WORKSPACE</p><h1>{project?.name || "Choose a project"}</h1><p className="muted">{project?.description || "Select a project or create a new one."}</p></div><button className="primary" disabled={!project} onClick={() => setModal("task")}><Plus size={16}/> Add task</button></div>
          <div className="board-toolbar"><span>{tasks.length} tasks</span><span className="board-hint">Move tasks between stages using the controls on each card.</span></div>
          <div className="kanban">{columns.map(status=><div className="kanban-column" key={status}><div className="column-heading"><span className={`status-dot ${status.toLowerCase()}`}/><strong>{labels[status]}</strong><span className="column-count">{visibleTasks.filter(t=>t.status===status).length}</span></div>
            {visibleTasks.filter(t=>t.status===status).map(task=><article className="task-card" key={task.id}><div className="task-card-top"><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="task-menu">•••</span></div><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div className="task-card-footer"><span className="assignee">{task.assignee?.name?.[0] || "U"}</span><span className="comment-count">◷ {task._count?.comments || 0}</span><select aria-label="Move task" value={task.status} onChange={e=>moveTask(task,e.target.value)}>{columns.map(c=><option value={c} key={c}>{labels[c]}</option>)}</select></div></article>)}
            {visibleTasks.filter(t=>t.status===status).length===0 && <div className="column-empty">No tasks here</div>}
          </div>)}</div>
        </>}
      </section>
    </main>
    {modal && <div className="modal-backdrop" onClick={() => setModal(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">WORKSPACE</p><h2>{modal === "project" ? "Create a project" : "Add a task"}</h2></div><button className="icon-button" onClick={() => setModal(null)}><X size={18}/></button></div>
      <form className="form-stack" onSubmit={modal === "project" ? createProject : createTask}><label>{modal === "project" ? "Project name" : "Task title"}<input name={modal === "project" ? "name" : "title"} required minLength={2} placeholder={modal === "project" ? "Website redesign" : "Design the landing page"}/></label><label>Description<textarea name="description" rows={3} placeholder="Add a little context…"/></label>{modal === "task" && <label>Priority<select name="priority" defaultValue="MEDIUM"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>}<button className="primary full"><Plus size={16}/> Create {modal}</button></form>
    </div></div>}
  </div>;
}
