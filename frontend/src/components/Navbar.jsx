import { Link, NavLink } from 'react-router-dom';
import { Moon, Sprout, Sun } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../redux/store.js';

export default function Navbar() {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.theme.mode);
  const token = useSelector((state) => state.auth.token);

  return (
    <nav className="navbar navbar-expand-lg app-nav">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <Sprout size={24} /> FarmAI
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <div className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            {['Home', 'About', 'Features', 'Services', 'Contact'].map((item) => (
              <a className="nav-link" href={`/#${item.toLowerCase()}`} key={item}>{item}</a>
            ))}
            {token ? (
              <NavLink className="btn btn-success btn-sm" to="/dashboard">Dashboard</NavLink>
            ) : (
              <>
                <NavLink className="nav-link" to="/login">Login</NavLink>
                <NavLink className="btn btn-success btn-sm" to="/register">Register</NavLink>
              </>
            )}
            <button className="icon-btn ms-lg-2" type="button" title="Toggle theme" onClick={() => dispatch(toggleTheme())}>
              {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
