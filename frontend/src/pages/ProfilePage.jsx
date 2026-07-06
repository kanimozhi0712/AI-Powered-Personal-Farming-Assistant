import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import DashboardShell from '../components/DashboardShell.jsx';
import { updateUser } from '../services/api.js';
import { setUser } from '../redux/store.js';
import { stateDistricts, states } from '../utils/locations.js';

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    stateName: user?.stateName || '',
    district: user?.district || ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!user?.id) {
      setError('Login again to update profile.');
      return;
    }
    const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await updateUser(user.id, {
        ...form,
        district,
        profileImageUrl: user?.profileImageUrl || ''
      });
      dispatch(setUser(data));
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <form className="dashboard-panel profile-form" onSubmit={submit}>
        <div>
          <span className="eyebrow">Profile</span>
          <h2>Update Profile</h2>
        </div>

        <input className="form-control" placeholder="Full name" value={form.fullName} onChange={(event) => update('fullName', event.target.value)} />
        <input className="form-control" placeholder="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
        <select className="form-select" value={form.stateName} onChange={(event) => setForm({ ...form, stateName: event.target.value, district: '' })}>
          <option value="">Select state</option>
          {states.map((state) => <option value={state} key={state}>{state}</option>)}
        </select>
        <select className="form-select" value={form.district} disabled={!form.stateName} onChange={(event) => update('district', event.target.value)}>
          <option value="">Select district</option>
          {districts.map((district) => <option value={district} key={district}>{district}</option>)}
        </select>
        {form.district === 'Other / Not listed' && (
          <input className="form-control" placeholder="Enter district" value={customDistrict} onChange={(event) => setCustomDistrict(event.target.value)} />
        )}

        <button className="btn btn-success" disabled={saving}>{saving ? 'Updating...' : 'Update Profile'}</button>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-danger">{error}</div>}
      </form>
    </DashboardShell>
  );
}
