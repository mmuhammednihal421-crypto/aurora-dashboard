import { useEffect, useMemo, useState } from 'react';
import AuthScreen from "./AuthScreen";
import VoiceAssistant from "./VoiceAssistant";
import {
  getDay,
  saveRoutine,
  getRoutineRange,
  logoutUser,
} from "./api";
import {
  Activity, ArrowDownRight, ArrowUpRight, BookOpen, BriefcaseBusiness, CalendarDays,
  Check, CheckCheck, ChevronRight, Circle, Clock3, Coffee, GraduationCap, LayoutDashboard,
  ListTodo, Mic, MoonStar, Plus, Sparkles, Target, Trash2, TrendingUp, Volume2, X,
  Zap, Dumbbell, CalendarClock, House, Users, MoreHorizontal
} from 'lucide-react';

const ROUTINE_DEFAULTS = [
  { id: 'class', name: 'Class', target: 2, icon: 'class', color: 'cyan' },
  { id: 'work', name: 'Work', target: 2, icon: 'work', color: 'violet' },
  { id: 'study', name: 'Study', target: 2, icon: 'study', color: 'teal' },
  { id: 'practice', name: 'Practice', target: 0.5, icon: 'practice', color: 'pink' },
  { id: 'walk', name: 'Morning Walk', target: 1, icon: 'walk', color: 'cyan' },
  { id: 'english', name: 'English Practice', target: 0.5, icon: 'english', color: 'teal' },
];
const ICONS = {
  class: GraduationCap,
  work: BriefcaseBusiness,
  study: BookOpen,
  practice: Dumbbell,
  walk: Activity,
  english: BookOpen,
  Home: House,
  Friends: Users,
  Personal: Coffee,
  Urgent: Zap,
  Other: ListTodo,
};
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateOffsetKey = (offset) => { const d = new Date(); d.setDate(d.getDate()+offset); return todayKey(d); };
const prettyDate = (d = new Date()) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const blankDay = () => ({ targets: Object.fromEntries(ROUTINE_DEFAULTS.map(x => [x.id, x.target])), actual: Object.fromEntries(ROUTINE_DEFAULTS.map(x => [x.id, 0])), tasks: [] });
function readStore() {
  try { return JSON.parse(localStorage.getItem('aurora-productivity-v1')) || { days: {} }; }
  catch { return { days: {} }; }
}
function IconTile({ icon: Icon, color = 'cyan', size = 42 }) {
  return <div className={`icon-tile ${color}`} style={{ width: size, height: size }}><Icon size={20} strokeWidth={1.8}/></div>;
}
function ProgressRing({ value, target, color = '#64e4f0' }) {
  const pct = target > 0 ? Math.min(100, value / target * 100) : value > 0 ? 100 : 0;
  return <div className="ring" style={{ '--pct': `${pct}%`, '--ring-color': color }}><div className="ring-inner"><strong>{Math.round(pct)}%</strong><span>done</span></div></div>;
}
function formatHours(n) { return `${Number(n.toFixed(2))}h`; }

export default function App() {
  const [store, setStore] = useState(readStore);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [taskText, setTaskText] = useState('');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskHours, setTaskHours] = useState('');
  const [logModal, setLogModal] = useState(null);
  const [logValue, setLogValue] = useState('1');
  const [activeNav, setActiveNav] = useState('Overview');
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("aurora-token");

    if (!token) return null;

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem("aurora-token");
        return null;
      }

      return { email: localStorage.getItem("aurora-email") || "" };
    } catch {
      localStorage.removeItem("aurora-token");
      return null;
    }
  });
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [cloudError, setCloudError] = useState(false);
  const [weeklyRows, setWeeklyRows] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState(false);
  useEffect(() => {
  if (!user) return;

  let cancelled = false;

  async function loadCloudData() {
    try {
      const data = await getDay(selectedDate);

      if (cancelled) return;

      setCloudError(false);

      setStore((previous) => {
        const existingDay =
          previous.days[selectedDate] || blankDay();

        const targets = { ...existingDay.targets };
        const actual = { ...existingDay.actual };

        for (const routine of data.routines || []) {
          targets[routine.activity_id] =
            Number(routine.target_hours);

          actual[routine.activity_id] =
            Number(routine.actual_hours);
        }

        return {
          ...previous,
          days: {
            ...previous.days,
            [selectedDate]: {
              ...existingDay,
              targets,
              actual,
              tasks: existingDay.tasks || [],
            },
          },
        };
      });

      setCloudLoaded(true);
    } catch (error) {
      console.error("Failed to load AURORA data:", error);
      setCloudError(true);
      setCloudLoaded(false);
      setToast("Could not load cloud data. Your local data is preserved.");
    }
  }

  loadCloudData();

  return () => {
    cancelled = true;
  };
}, [user, selectedDate]);

useEffect(() => {
  if (!user) return;

  let cancelled = false;

  async function loadWeeklyData() {
    setWeeklyLoading(true);
    setWeeklyError(false);

    try {
      const selected = new Date(`${selectedDate}T12:00:00`);
      const day = selected.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;

      const weekStart = new Date(selected);
      weekStart.setDate(selected.getDate() + mondayOffset);

      const previousWeekStart = new Date(weekStart);
      previousWeekStart.setDate(weekStart.getDate() - 7);

      const nextWeekEnd = new Date(weekStart);
      nextWeekEnd.setDate(weekStart.getDate() + 6);

      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const result = await getRoutineRange(
        formatDate(previousWeekStart),
        formatDate(nextWeekEnd)
      );

      if (cancelled) return;

      setWeeklyRows(result.routines || []);
    } catch (error) {
      if (cancelled) return;

      console.error("Weekly comparison load failed:", error);
      setWeeklyError(true);
    } finally {
      if (!cancelled) setWeeklyLoading(false);
    }
  }

  loadWeeklyData();

  return () => {
    cancelled = true;
  };
}, [user, selectedDate]);

  const weekHours = useMemo(() => Array.from({length:7}, (_,i) => {
    const key = dateOffsetKey(i-6); const d = store.days[key] || blankDay();
    return { key, label: new Date(`${key}T12:00:00`).toLocaleDateString('en-US',{weekday:'short'}), hours: ROUTINE_DEFAULTS.reduce((s,r)=>s+Number(d.actual?.[r.id]||0),0)+(d.tasks||[]).reduce((s,t)=>s+Number(t.hours||0),0) };
  }), [store]);
  const maxWeekHours = Math.max(1, ...weekHours.map(d=>d.hours));
  const weeklyComparison = useMemo(() => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    const weekday = selected.getDay();
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;

    const currentMonday = new Date(selected);
    currentMonday.setDate(selected.getDate() + mondayOffset);

    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);

    const dateKey = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    function summarizeWeek(startDate) {
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      const rows = weeklyRows.filter((row) => {
        const date = String(row.activity_date).slice(0, 10);
        return date >= dateKey(startDate) && date <= dateKey(endDate);
      });

      const actualHours = rows.reduce(
        (sum, row) => sum + Number(row.actual_hours || 0),
        0
      );

      const targetHours = rows.reduce(
        (sum, row) => sum + Number(row.target_hours || 0),
        0
      );

      return {
        start: dateKey(startDate),
        end: dateKey(endDate),
        actualHours,
        targetHours,
        completion:
          targetHours > 0
            ? Math.round((actualHours / targetHours) * 100)
            : null,
      };
    }

    const previous = summarizeWeek(previousMonday);
    const current = summarizeWeek(currentMonday);

    const change =
      previous.actualHours > 0
        ? Math.round(
            ((current.actualHours - previous.actualHours) /
              previous.actualHours) *
              100
          )
        : null;

    return { previous, current, change };
  }, [selectedDate, weeklyRows]);

  useEffect(() => {
    if (!cloudLoaded) return;

    localStorage.setItem(
      'aurora-productivity-v1',
      JSON.stringify(store)
    );
  }, [store, cloudLoaded]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 2400); return () => clearTimeout(id); }, [toast]);

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  const day = store.days[selectedDate] || blankDay();
  const isToday = selectedDate === todayKey();
  const yesterdayKey = (() => { const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate()-1); return todayKey(d); })();
  const yesterday = store.days[yesterdayKey] || blankDay();
  const activities = ROUTINE_DEFAULTS.map(r => ({ ...r, target: Number(day.targets?.[r.id] ?? r.target), actual: Number(day.actual?.[r.id] || 0) }));
  const totalTarget = activities.reduce((s, x) => s + x.target, 0);
  const totalActual = activities.reduce((s, x) => s + x.actual, 0) + (day.tasks || []).reduce((s, t) => s + Number(t.hours || 0), 0);
  const yesterdayTotal = ROUTINE_DEFAULTS.reduce((s, r) => s + Number(yesterday.actual?.[r.id] || 0), 0) + (yesterday.tasks || []).reduce((s,t) => s + Number(t.hours || 0), 0);
  const pendingTasks = (day.tasks || []).filter(t => !t.done).length;
  const doneTasks = (day.tasks || []).filter(t => t.done).length;
  function updateDay(date, updater) {
    setStore(prev => {
      const current = prev.days[date] || blankDay();
      return { ...prev, days: { ...prev.days, [date]: updater(current) } };
    });
  }
  function changeTarget(id, value) {
    const n = Math.max(0, Math.min(24, Number(value) || 0));
    updateDay(selectedDate, d => ({ ...d, targets: { ...d.targets, [id]: n } }));
  }
  function logHours() {
    const amount = Number(logValue);
    if (!logModal || !Number.isFinite(amount) || amount <= 0 || amount > 24) return;
    if (logModal.type === 'routine') {
      updateDay(selectedDate, d => ({
        ...d,
        actual: {
          ...d.actual,
          [logModal.id]: amount
        }
      }));
    }
    else updateDay(selectedDate, d => ({ ...d, tasks: d.tasks.map(t => t.id === logModal.id ? { ...t, hours: Math.round((Number(t.hours || 0) + amount) * 100) / 100 } : t) }));
    setLogModal(null); setLogValue('1'); setToast(`${amount} hour${amount === 1 ? '' : 's'} logged`);
  }
  function addTask(e) {
    e.preventDefault(); if (!taskText.trim()) return;
    const task = { id: crypto.randomUUID?.() || String(Date.now()), title: taskText.trim(), category: taskCategory, done: false, hours: Number(taskHours) || 0, createdAt: new Date().toISOString() };
    updateDay(selectedDate, d => ({ ...d, tasks: [task, ...d.tasks] }));
    setTaskText(''); setTaskHours(''); setToast('Task added to your day');
  }
  function toggleTask(id) { updateDay(selectedDate, d => ({ ...d, tasks: d.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })); }
  function deleteTask(id) { updateDay(selectedDate, d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) })); setToast('Task removed'); }

  return <div className="app-shell">
    <VoiceAssistant
      enabled={true}
      actual={day.actual}
      targets={day.targets}
    />
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="ambient ambient-three"/>
    <aside className="sidebar glass-panel">
      <div className="brand"><div className="brand-mark"><span/><span/><span/></div><div><b>AURORA</b><small>PERSONAL SPACE</small></div></div>
      <div className="profile-card"><div className="avatar">N</div><div className="profile-copy"><strong>My workspace</strong><span>Personal command center</span></div><span className="online-dot"/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="nav-list">
        {[['Overview',LayoutDashboard],['My routine',Clock3],['Tasks',ListTodo],['Progress',TrendingUp]].map(([label, Icon]) => <button key={label} className={`nav-item ${activeNav===label?'active':''}`} onClick={()=>{setActiveNav(label); if(label==='My routine') document.getElementById('routine')?.scrollIntoView({behavior:'smooth'}); if(label==='Tasks') document.getElementById('tasks')?.scrollIntoView({behavior:'smooth'}); if(label==='Progress') document.getElementById('comparison')?.scrollIntoView({behavior:'smooth'}); if(label==='Overview') window.scrollTo({top:0,behavior:'smooth'});}}><Icon size={18}/><span>{label}</span>{label==='Tasks'&&pendingTasks>0&&<em>{pendingTasks}</em>}</button>)}
      </nav>
      <div className="nav-label tools-label">COMING LATER</div>
      <div className="nav-item disabled"><Mic size={18}/><span>Voice assistant</span><span className="soon-mini">SOON</span></div>
      <div className="sidebar-bottom"><div className="focus-card"><div className="focus-orb"><Sparkles size={18}/></div><strong>One day at a time.</strong><p>Small progress is still progress.</p><div className="focus-line"><span/></div></div><div className="sidebar-foot"><span className="status-dot"/> Saved locally on this device</div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{activeNav}</strong></div><div className="topbar-right"><div className="date-pill"><CalendarDays size={15}/>{prettyDate(new Date(`${selectedDate}T12:00:00`))}</div><button
        type="button"
        className="mini-avatar"
        title="Open profile menu"
        onClick={() => setProfileOpen(!profileOpen)}
      >
        N
      </button>
      {profileOpen && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-title">
            My AURORA Account
          </div>

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setToast("Profile settings coming soon!");
            }}
          >
            👤 My Profile
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              setToast("Settings coming soon!");
            }}
          >
            ⚙️ Settings
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              logoutUser();
              window.location.reload();
            }}
          >
            🚪 Log Out
          </button>
        </div>
      )}</div></header>
      <section className="welcome-row"><div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR DAY, IN YOUR FLOW</div><h1>{isToday ? 'Make today ' : 'Review your '}<span>{isToday ? 'count.' : 'progress.'}</span></h1><p>{isToday ? 'A little focus, a little progress. Let’s make it a good one.' : `Your activity log for ${prettyDate(new Date(`${selectedDate}T12:00:00`))}.`}</p><p className="brand-tagline">AURORA — Every Day, A Brighter Beginning.</p></div><div className="date-controls"><button className="icon-button" aria-label="Previous day" onClick={()=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()-1);setSelectedDate(todayKey(d));}}><ArrowDownRight size={16}/></button><button className="today-button" onClick={()=>setSelectedDate(todayKey())}>Today</button><button className="icon-button" aria-label="Next day" onClick={()=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()+1);if(todayKey(d)<=todayKey())setSelectedDate(todayKey(d));}} disabled={isToday}><ArrowUpRight size={16}/></button></div></section>

      <section className="stats-grid">
        <div className="stat-card glass-panel stat-main"><div className="stat-top"><span>TIME LOGGED</span><div className="stat-icon cyan"><Clock3 size={17}/></div></div><div className="stat-number">{formatHours(totalActual)}<small> / {formatHours(totalTarget)}</small></div><div className="stat-foot"><span className="tiny-pulse"/> {totalTarget>0?Math.round(totalActual/totalTarget*100):0}% of planned routine</div><div className="stat-track"><span style={{width:`${totalTarget?Math.min(100,totalActual/totalTarget*100):0}%`}}/></div></div>
        <div className="stat-card glass-panel"><div className="stat-top"><span>TASKS TO GO</span><div className="stat-icon violet"><ListTodo size={17}/></div></div><div className="stat-number">{pendingTasks}<small> pending</small></div><div className="stat-foot">{doneTasks} completed today</div><div className="stat-track purple-track"><span style={{width:`${(day.tasks||[]).length?doneTasks/(day.tasks||[]).length*100:0}%`}}/></div></div>
        <div className="stat-card glass-panel"><div className="stat-top"><span>VS YESTERDAY</span><div className="stat-icon teal"><Activity size={17}/></div></div><div className="stat-number">{totalActual-yesterdayTotal>0?'+':''}{formatHours(totalActual-yesterdayTotal)}</div><div className="stat-foot">{totalActual>yesterdayTotal?'More time logged':totalActual<yesterdayTotal?'Less time logged':'Same time logged'} than yesterday</div><div className="stat-trend"><TrendingUp size={15}/><span>Actual hours comparison</span></div></div>
      </section>

      <section className="weekly-comparison">
        <div className="weekly-comparison-heading">
          <div>
            <h2>Weekly Performance</h2>
            <p>Compare this week with last week</p>
          </div>
          <span className="weekly-live-label">
            {weeklyLoading ? "Loading..." : "NEON SYNC"}
          </span>
        </div>

        {weeklyError ? (
          <p>Unable to load weekly data. Please try again.</p>
        ) : (
          <>
            <div className="weekly-comparison-grid">
              {[
                {
                  title: "Last Week",
                  data: weeklyComparison.previous,
                },
                {
                  title: "This Week",
                  data: weeklyComparison.current,
                },
              ].map(({ title, data }) => (
                <div className="weekly-stat-card" key={title}>
                  <h3>{title}</h3>
                  <p className="weekly-hours">
                    {data.actualHours.toFixed(1)}
                    <span> hrs</span>
                  </p>
                  <p className="weekly-date">
                    {data.start} – {data.end}
                  </p>

                  <div className="weekly-progress-track">
                    <div
                      className="weekly-progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, data.completion || 0)
                        )}%`,
                      }}
                    />
                  </div>

                  <p>
                    Target completion:{" "}
                    {data.completion === null
                      ? "No target recorded"
                      : `${data.completion}%`}
                  </p>
                </div>
              ))}
            </div>

            <div className="weekly-change">
              <span>Weekly hours change</span>
              <strong>
                {weeklyComparison.change === null
                  ? "Waiting for enough data"
                  : `${weeklyComparison.change > 0 ? "+" : ""}${weeklyComparison.change}%`}
              </strong>
            </div>
          </>
        )}
      </section>

      <div className="content-grid">
        <section className="section-card glass-panel routine-section" id="routine">
          <div className="section-heading"><div><div className="section-kicker">YOUR BASELINE</div><h2>Daily routine <span className="live-chip"><span/> ACTIVE</span></h2><p>Adjust targets and log the time you actually spend.</p></div><div className="heading-icon"><Target size={20}/></div></div>
          <div className="routine-list">{activities.map(item=>{const Icon=ICONS[item.icon];const pct=item.target>0?Math.min(100,item.actual/item.target*100):0;return <article className="routine-item" key={item.id}><IconTile icon={Icon} color={item.color}/><div className="routine-details"><div className="routine-title-row"><strong>{item.name}</strong><span className="hours-label">{formatHours(item.actual)} <i>/</i> {formatHours(item.target)}</span></div><div className="progress-track"><span className={item.color} style={{width:`${pct}%`}}/></div><div className="routine-bottom"><span>{item.actual>=item.target&&item.target>0?'Target reached':`${formatHours(Math.max(0,item.target-item.actual))} remaining`}</span><div className="target-edit"><label htmlFor={`target-${item.id}`}>Target</label><input id={`target-${item.id}`} aria-label={`${item.name} target hours`} type="number" min="0" max="24" step="0.5" value={item.target} onChange={e=>changeTarget(item.id,e.target.value)}/><span>h</span></div></div></div><button className="log-button" onClick={()=>{setLogModal({type:'routine',id:item.id,name:item.name});setLogValue('1')}}><Plus size={15}/><span>Log</span></button></article>})}</div>
          <div className="routine-note"><Sparkles size={15}/><span>Targets are flexible. Actual hours are tracked separately.</span></div>
        </section>

        <section className="section-card glass-panel comparison-section" id="comparison">
          <div className="section-heading"><div><div className="section-kicker">DAILY REFLECTION</div><h2>Day by day</h2><p>Real hours, not just plans.</p></div><div className="heading-icon purple-heading"><Activity size={20}/></div></div>
          <div className="compare-summary"><div><span className="compare-label">YESTERDAY</span><strong>{formatHours(yesterdayTotal)}</strong><small>{yesterdayKey}</small></div><div className="compare-divider"><ChevronRight size={17}/></div><div><span className="compare-label">{isToday?'TODAY':'SELECTED DAY'}</span><strong>{formatHours(totalActual)}</strong><small>{selectedDate}</small></div></div>
          <div className="compare-delta"><div className={`delta-icon ${totalActual>=yesterdayTotal?'up':'down'}`}>{totalActual>=yesterdayTotal?<ArrowUpRight size={17}/>:<ArrowDownRight size={17}/>}</div><div><strong>{totalActual===yesterdayTotal?'Steady pace':`${Math.abs(totalActual-yesterdayTotal).toFixed(2).replace(/\.00$/,'')}h ${totalActual>yesterdayTotal?'more':'less'} logged`}</strong><span>Compared with the previous day</span></div></div>
          <div className="compare-breakdown"><div className="breakdown-head"><strong>Activity breakdown</strong><span>Yesterday <i/> Today</span></div>{activities.map(item=>{const old=Number(yesterday.actual?.[item.id]||0);return <div className="breakdown-row" key={item.id}><span>{item.name}</span><div className="double-bars"><div className="bar-old"><span style={{width:`${Math.min(100,old/4*100)}%`}}/></div><div className="bar-new"><span style={{width:`${Math.min(100,item.actual/4*100)}%`}}/></div></div><strong>{item.actual-old>0?'+':''}{(item.actual-old).toFixed(1).replace(/\.0$/,'')}h</strong></div>})}</div>
          <div className="gentle-insight"><MoonStar size={17}/><span>{totalActual>yesterdayTotal?'Nice progress. Keep a pace that feels sustainable.':totalActual<yesterdayTotal?'Every day is different. Use this comparison as information, not pressure.':'Consistency counts. You kept your logged time steady.'}</span></div>
        </section>
      </div>

      <div className="lower-grid">
        <section className="section-card glass-panel tasks-section" id="tasks">
          <div className="section-heading"><div><div className="section-kicker">FLEXIBLE PLANS</div><h2>Extra tasks <span className="count-badge">{(day.tasks||[]).length}</span></h2><p>Home, friends, errands, or anything that comes up.</p></div><div className="heading-icon teal-heading"><ListTodo size={20}/></div></div>
          <form className="add-task-form" onSubmit={addTask}><div className="task-input-wrap"><Plus size={17}/><input value={taskText} onChange={e=>setTaskText(e.target.value)} placeholder="Add something to do today..." aria-label="New task"/><button type="submit" disabled={!taskText.trim()} aria-label="Add task"><Plus size={18}/></button></div><div className="task-form-options"><label><span>Category</span><select value={taskCategory} onChange={e=>setTaskCategory(e.target.value)}><option>Personal</option><option>Home</option><option>Friends</option><option>Urgent</option><option>Other</option></select></label><label><span>Hours spent (optional)</span><input type="number" min="0" max="24" step="0.5" placeholder="0" value={taskHours} onChange={e=>setTaskHours(e.target.value)}/></label></div></form>
          <div className="task-list">{(day.tasks||[]).map(task=>{const CatIcon=ICONS[task.category]||ListTodo;return <div className={`task-row ${task.done?'task-done':''}`} key={task.id}><button className="check-task" onClick={()=>toggleTask(task.id)} aria-label={task.done?'Mark incomplete':'Mark complete'}>{task.done?<Check size={15}/>:<Circle size={18}/>}</button><div className="task-category-icon"><CatIcon size={16}/></div><div className="task-copy"><strong>{task.title}</strong><span>{task.category}{task.hours>0?` · ${formatHours(task.hours)} logged`:''}</span></div><button className="small-action" onClick={()=>{setLogModal({type:'task',id:task.id,name:task.title});setLogValue('0.5')}} aria-label="Log hours"><Clock3 size={15}/></button><button className="small-action delete-action" onClick={()=>deleteTask(task.id)} aria-label="Delete task"><Trash2 size={15}/></button></div>})}{(day.tasks||[]).length===0&&<div className="empty-tasks"><div className="empty-icon"><Coffee size={20}/></div><strong>Your list is clear.</strong><span>Add an unexpected task whenever it comes up.</span></div>}</div>
        </section>
        <section className="section-card glass-panel weekly-section">
          <div className="section-heading"><div><div className="section-kicker">LOOKING BACK</div><h2>This week</h2><p>Your logged hours over the last 7 days.</p></div><div className="heading-icon cyan-heading"><TrendingUp size={20}/></div></div>
          <div className="weekly-total"><strong>{formatHours(weekHours.reduce((s,d)=>s+d.hours,0))}</strong><span>total logged this week</span></div>
          <div className="week-chart">{weekHours.map((d,i)=><div className="week-day" key={d.key}><div className="week-bar-area"><div className={`week-bar ${d.key===selectedDate?'selected':''}`} style={{height:`${Math.max(5,d.hours/maxWeekHours*100)}%`}} title={`${d.label}: ${formatHours(d.hours)}`}/></div><span className={d.key===todayKey()?'current-day':''}>{d.label}</span></div>)}</div>
          <div className="week-foot"><span><span className="legend-dot"/> Hours logged</span><span>Updates automatically</span></div>
        </section>
      </div>

      <section className="assistant-banner glass-panel"><div className="assistant-visual"><div className="assistant-orbit orbit-one"/><div className="assistant-orbit orbit-two"/><div className="assistant-core"><Mic size={25}/></div><span className="assistant-star star-a">✦</span><span className="assistant-star star-b">✧</span></div><div className="assistant-text"><div className="section-kicker">ON YOUR WAVELENGTH</div><h2>Your assistant is taking shape.</h2><p>Voice commands, spoken replies, and smart schedule reminders will live here. For now, your dashboard is ready for manual tracking.</p></div><div className="coming-soon"><span className="coming-dot"/> VOICE ASSISTANT <b>COMING SOON</b></div></section>
      <footer className="footer"><span>✦ AURORA <i>·</i> YOUR PERSONAL SPACE</span><span><span className="status-dot"/> Your records are saved in this browser</span></footer>
    </main>

    {logModal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLogModal(null)}}><div className="log-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="log-title"><button className="modal-close" onClick={()=>setLogModal(null)} aria-label="Close"><X size={18}/></button><div className="modal-icon"><Clock3 size={22}/></div><div className="section-kicker">ACTUAL TIME TRACKING</div><h2 id="log-title">Log {logModal.name}</h2><p>How much time did you spend on this activity?</p><label className="hours-field"><input type="number" min="0.25" max="24" step="0.25" value={logValue} onChange={e=>setLogValue(e.target.value)} autoFocus/><span>hours</span></label><div className="quick-hours">{['0.5','1','1.5','2','3'].map(v=><button key={v} className={logValue===v?'chosen':''} onClick={()=>setLogValue(v)}>{v}h</button>)}</div><button className="primary-button" onClick={logHours} disabled={!Number.isFinite(Number(logValue))||Number(logValue)<=0||Number(logValue)>24}><CheckCheck size={17}/> Save logged time</button></div></div>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>;
}
