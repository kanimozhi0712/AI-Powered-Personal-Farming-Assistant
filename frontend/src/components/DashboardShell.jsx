import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BarChart3, Bot, CloudSun, Droplets, FileText, FlaskConical, Leaf, LogOut, Shield, Sprout, Store, Wheat } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';
import { logout } from '../redux/store.js';

const links = [
  ['dashboard', 'Dashboard', BarChart3],
  ['ai-chat', 'AI Chat', Bot],
  ['crop-recommendations', 'Crops', Wheat],
  ['disease-reports', 'Disease', Leaf],
  ['weather-history', 'Weather', CloudSun],
  ['irrigation-records', 'Irrigation', Droplets],
  ['fertilizer-recommendations', 'Fertilizer', FlaskConical],
  ['market-prices', 'Market', Store],
  ['government-schemes', 'Schemes', Shield],
  ['knowledge-base', 'Knowledge', FileText]
];

export default function DashboardShell({ children }) {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user && !localStorage.getItem('farm_token')) {
      navigate('/login');
    }
  }, [navigate, user]);

  function signOut() {
    dispatch(logout());
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="brand"><Sprout /> FarmAI</Link>
        <nav>
          <NavLink to="/admin"><BarChart3 size={18} /> Admin</NavLink>
          {links.map(([key, label, Icon]) => (
            key === 'dashboard'
              ? <NavLink key={key} to="/dashboard"><Icon size={18} /> {label}</NavLink>
              : <NavLink key={key} to={`/module/${key}`}><Icon size={18} /> {label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Personal Farming Assistant</span>
            <h1>{user?.fullName || 'Welcome Farmer'}</h1>
          </div>
          <div className="d-flex gap-2">
            <Link className="btn btn-success" to="/admin"><BarChart3 size={16} /> Admin</Link>
            <Link className="btn btn-outline-success" to="/profile">Profile</Link>
            <button className="btn btn-dark" onClick={signOut}><LogOut size={16} /> Logout</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
