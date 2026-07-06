import { Bot, CloudSun, Droplets, FlaskConical, Leaf, ShieldCheck, Store, Users, Wheat } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell.jsx';

const stats = [
  ['Farmers', '1,240', Users],
  ['AI Chats', '8,932', Bot],
  ['Crop Plans', '426', Wheat],
  ['Disease Reports', '113', Leaf],
  ['Weather Alerts', '28', CloudSun],
  ['Market Updates', '64', Store],
  ['Irrigation Tasks', '92', Droplets],
  ['Fertilizer Plans', '58', FlaskConical]
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <section className="dashboard-panel admin-entry-panel">
        <div>
          <span className="eyebrow">Admin Access</span>
          <h2>Admin Dashboard</h2>
          <p>Manage users, crop records, disease records, schemes, knowledge base, reports, analytics, and system activity.</p>
        </div>
        <Link className="btn btn-success" to="/admin"><ShieldCheck size={18} /> Open Admin Module</Link>
      </section>
      <section className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <Icon size={24} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>
      <section className="dashboard-panel">
        <h2>System Activity</h2>
        <div className="chart-bars">
          {[64, 42, 78, 55, 91, 73, 48].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
        </div>
      </section>
    </DashboardShell>
  );
}
