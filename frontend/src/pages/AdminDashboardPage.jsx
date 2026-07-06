import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Activity, BarChart3, CheckCircle2, Database, FileText, LineChart, Search, Settings, Shield, Trash2, Users } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import {
  adminAnalytics,
  adminCreateRecord,
  adminCreateUser,
  adminDeleteRecord,
  adminDeleteUser,
  adminRecords,
  adminUpdateRecord,
  adminUpdateUser,
  adminUsers
} from '../services/api.js';

const tabs = [
  ['users', 'User Management', Users],
  ['crop-recommendations', 'Crop Management', Database],
  ['disease-reports', 'Disease Management', FileText],
  ['government-schemes', 'Scheme Management', Shield],
  ['knowledge-base', 'Knowledge Base', FileText],
  ['reports', 'Reports', BarChart3],
  ['analytics', 'Analytics', LineChart],
  ['monitoring', 'Activity Monitoring', Activity]
];

const recordModules = ['crop-recommendations', 'disease-reports', 'government-schemes', 'knowledge-base'];
const capabilityGroups = [
  ['User Management', 'Create, Read, Update, Delete, Search'],
  ['Crop Management', 'CRUD operations'],
  ['Disease Management', 'CRUD operations'],
  ['Government Scheme Management', 'CRUD operations'],
  ['Knowledge Base Management', 'CRUD operations'],
  ['Reports', 'User, Crop, Disease, Weather, Market reports'],
  ['Analytics', 'Charts, graphs, statistics'],
  ['Activity Monitoring', 'Login logs, user activities, system monitoring']
];

export default function AdminDashboardPage() {
  const user = useSelector((state) => state.auth.user);
  const [tab, setTab] = useState('users');
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const isAdmin = String(user?.role || '').toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [isAdmin]);

  async function loadAnalytics() {
    setError('');
    try {
      const { data } = await adminAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err?.response?.status === 403 ? 'Admin access required. Login with admin@example.com / password123.' : 'Unable to load admin dashboard.');
    }
  }

  if (!isAdmin) {
    return (
      <DashboardShell>
        <section className="dashboard-panel admin-access-panel">
          <span className="eyebrow">Admin Module</span>
          <h2>Admin login required</h2>
          <p>This module is visible in the dashboard, but only ADMIN users can open management data.</p>
          <div className="assistant-answer">
            Email: admin@example.com<br />
            Password: password123
          </div>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <section className="admin-page">
        <div className="admin-header dashboard-panel">
          <div>
            <span className="eyebrow">Admin Module</span>
            <h2>Admin Dashboard</h2>
          </div>
          <button className="btn btn-outline-success" onClick={loadAnalytics}>Refresh</button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="admin-tabs">
          {tabs.map(([key, label, Icon]) => (
            <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <section className="admin-capabilities">
          {capabilityGroups.map(([title, detail]) => (
            <article key={title}>
              <CheckCircle2 size={18} />
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
            </article>
          ))}
        </section>

        {tab === 'users' && <UserManagement onChanged={loadAnalytics} />}
        {recordModules.includes(tab) && <RecordManagement module={tab} onChanged={loadAnalytics} />}
        {tab === 'reports' && <ReportsPanel analytics={analytics} />}
        {tab === 'analytics' && <AnalyticsPanel analytics={analytics} />}
        {tab === 'monitoring' && <MonitoringPanel analytics={analytics} />}
      </section>
    </DashboardShell>
  );
}

function UserManagement({ onChanged }) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankUser());

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    const { data } = await adminUsers(search);
    setUsers(data);
  }

  async function save(event) {
    event.preventDefault();
    if (editingId) {
      await adminUpdateUser(editingId, form);
    } else {
      await adminCreateUser(form);
    }
    setForm(blankUser());
    setEditingId(null);
    await load();
    await onChanged();
  }

  function edit(user) {
    setEditingId(user.id);
    setForm({ ...user, password: '', enabled: user.enabled ?? true });
  }

  async function remove(id) {
    await adminDeleteUser(id);
    await load();
    await onChanged();
  }

  return (
    <section className="admin-grid">
      <form className="dashboard-panel admin-form" onSubmit={save}>
        <h3>{editingId ? 'Update User' : 'Create User'}</h3>
        <input className="form-control" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        <input className="form-control" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="form-control" placeholder={editingId ? 'New password optional' : 'Password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="FARMER">FARMER</option>
          <option value="EXPERT">EXPERT</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <input className="form-control" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="form-control" placeholder="State" value={form.stateName} onChange={(e) => setForm({ ...form, stateName: e.target.value })} />
        <input className="form-control" placeholder="District" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
        <label className="admin-check"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Enabled</label>
        <button className="btn btn-success">{editingId ? 'Update User' : 'Create User'}</button>
      </form>

      <div className="dashboard-panel admin-list">
        <SearchBox value={search} onChange={setSearch} placeholder="Search users" />
        {users.map((user) => (
          <article key={user.id}>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email} | {user.role} | {user.district || 'No district'}</span>
            </div>
            <div className="admin-actions">
              <button className="btn btn-outline-success" onClick={() => edit(user)}>Edit</button>
              <button className="btn btn-outline-danger" onClick={() => remove(user.id)}><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecordManagement({ module, onChanged }) {
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankRecord());

  useEffect(() => {
    load();
  }, [module, search]);

  async function load() {
    const { data } = await adminRecords(module, search);
    setRecords(data);
  }

  async function save(event) {
    event.preventDefault();
    if (editingId) {
      await adminUpdateRecord(module, editingId, form);
    } else {
      await adminCreateRecord(module, form);
    }
    setEditingId(null);
    setForm(blankRecord());
    await load();
    await onChanged();
  }

  async function remove(id) {
    await adminDeleteRecord(module, id);
    await load();
    await onChanged();
  }

  return (
    <section className="admin-grid">
      <form className="dashboard-panel admin-form" onSubmit={save}>
        <h3>{editingId ? 'Update' : 'Create'} {labelFor(module)}</h3>
        <input className="form-control" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="form-control" rows="7" placeholder="Content / details" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <textarea className="form-control" rows="3" placeholder='Metadata JSON, example {"crop":"paddy"}' value={form.metadataJson} onChange={(e) => setForm({ ...form, metadataJson: e.target.value })} />
        <button className="btn btn-success">{editingId ? 'Update Record' : 'Create Record'}</button>
      </form>

      <div className="dashboard-panel admin-list">
        <SearchBox value={search} onChange={setSearch} placeholder={`Search ${labelFor(module)}`} />
        {records.map((record) => (
          <article key={record.id}>
            <div>
              <strong>{record.title}</strong>
              <span>{record.content || 'No content'}</span>
            </div>
            <div className="admin-actions">
              <button className="btn btn-outline-success" onClick={() => { setEditingId(record.id); setForm(record); }}>Edit</button>
              <button className="btn btn-outline-danger" onClick={() => remove(record.id)}><Trash2 size={15} /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportsPanel({ analytics }) {
  return (
    <section className="dashboard-panel admin-report-grid">
      {(analytics?.reports || []).map((report) => (
        <article key={report.title}>
          <FileText size={22} />
          <strong>{report.count}</strong>
          <span>{report.title}</span>
          <small>{report.status}</small>
        </article>
      ))}
    </section>
  );
}

function AnalyticsPanel({ analytics }) {
  const summary = analytics?.summary;
  const cards = summary ? [
    ['Users', summary.users],
    ['Records', summary.records],
    ['Crops', summary.crops],
    ['Diseases', summary.diseases],
    ['Schemes', summary.schemes],
    ['Knowledge', summary.knowledge],
    ['Weather', summary.weather],
    ['Market', summary.market]
  ] : [];
  const max = Math.max(...cards.map(([, value]) => value), 1);
  return (
    <section className="dashboard-panel admin-analytics">
      <h3>Charts, Graphs, Statistics</h3>
      <div className="admin-chart">
        {cards.map(([label, value]) => (
          <div key={label}>
            <span style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonitoringPanel({ analytics }) {
  return (
    <section className="dashboard-panel admin-monitoring">
      <h3><Settings size={20} /> Login Logs, User Activities, System Monitoring</h3>
      {(analytics?.activities || []).map((item) => (
        <article key={`${item.time}-${item.target}`}>
          <Activity size={16} />
          <div>
            <strong>{item.action}</strong>
            <span>{item.actor} | {item.target}</span>
            <small>{item.time}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="admin-search">
      <Search size={16} />
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function blankUser() {
  return { fullName: '', email: '', password: '', role: 'FARMER', phone: '', stateName: '', district: '', enabled: true };
}

function blankRecord() {
  return { title: '', content: '', metadataJson: '', ownerId: null };
}

function labelFor(module) {
  return {
    'crop-recommendations': 'Crop Management',
    'disease-reports': 'Disease Management',
    'government-schemes': 'Government Scheme Management',
    'knowledge-base': 'Knowledge Base Management'
  }[module] || module;
}
