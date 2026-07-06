import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'FARMER', phone: '', stateName: '', district: '' });
  const [customDistrict, setCustomDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const districts = form.stateName ? stateDistricts[form.stateName] || [] : [];

  async function submit(event) {
    event.preventDefault();
    const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      await register({ ...form, district });
      setNotice('Account created successfully. Redirecting to login...');
      window.setTimeout(() => navigate('/login'), 700);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Unable to create account. Check backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-panel wide" onSubmit={submit}>
        <h1>Register</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}
        <div className="grid-2">
          {['fullName', 'email', 'phone'].map((field) => (
            <input key={field} className="form-control" placeholder={field.replace(/([A-Z])/g, ' $1')} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
          ))}
          <select className="form-select" value={form.stateName} onChange={(e) => setForm({ ...form, stateName: e.target.value, district: '' })}>
            <option value="">Select state</option>
            {states.map((state) => <option value={state} key={state}>{state}</option>)}
          </select>
          <select className="form-select" value={form.district} disabled={!form.stateName} onChange={(e) => setForm({ ...form, district: e.target.value })}>
            <option value="">Select district</option>
            {districts.map((district) => <option value={district} key={district}>{district}</option>)}
          </select>
          {form.district === 'Other / Not listed' && (
            <input className="form-control" placeholder="Enter district" value={customDistrict} onChange={(e) => setCustomDistrict(e.target.value)} />
          )}
          <input className="form-control" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="FARMER">Farmer</option>
            <option value="EXPERT">Agricultural Expert</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button className="btn btn-success w-100" type="submit" disabled={loading}>{loading ? 'Creating Account...' : 'Create Account'}</button>
        <Link to="/login">Already registered?</Link>
      </form>
    </main>
  );
}
