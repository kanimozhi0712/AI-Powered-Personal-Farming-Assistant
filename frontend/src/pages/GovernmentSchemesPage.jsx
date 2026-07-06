import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileCheck2, Landmark, MapPin, Search, ShieldCheck } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { schemeRecommend } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const purposes = [
  'General farming support',
  'Loan purpose',
  'Crop insurance',
  'Irrigation / water pump',
  'Solar pump',
  'Fertilizer / soil testing',
  'Horticulture subsidy',
  'Market selling support',
  'Storage / warehouse / processing'
];

export default function GovernmentSchemesPage() {
  const [form, setForm] = useState({
    stateName: '',
    district: '',
    village: '',
    cropName: '',
    purpose: '',
    farmerType: ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);
  const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
  const canSearch = form.stateName && district;

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => {
      loadSchemes();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, customDistrict]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await loadSchemes();
  }

  async function loadSchemes() {
    if (!canSearch) {
      setError('Select state and district first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await schemeRecommend({ ...form, district });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load schemes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <section className="schemes-page">
        <form className="dashboard-panel schemes-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Government Schemes</span>
            <h2>Find farmer schemes, crop support, insurance, and loans</h2>
          </div>

          <div className="grid-2">
            <select className="form-select" value={form.stateName} onChange={(event) => setForm({ ...form, stateName: event.target.value, district: '' })}>
              <option value="">Select state</option>
              {states.map((state) => <option value={state} key={state}>{state}</option>)}
            </select>
            <select className="form-select" value={form.district} disabled={!form.stateName} onChange={(event) => update('district', event.target.value)}>
              <option value="">Select district</option>
              {districts.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
            {form.district === 'Other / Not listed' && (
              <input className="form-control" placeholder="Enter district" value={customDistrict} onChange={(event) => setCustomDistrict(event.target.value)} />
            )}
            <input className="form-control" placeholder="Village / city / place" value={form.village} onChange={(event) => update('village', event.target.value)} />
            <input className="form-control" placeholder="Crop, example paddy / tomato / cotton" value={form.cropName} onChange={(event) => update('cropName', event.target.value)} />
            <select className="form-select" value={form.purpose} onChange={(event) => update('purpose', event.target.value)}>
              <option value="">Purpose if known</option>
              {purposes.map((purpose) => <option value={purpose} key={purpose}>{purpose}</option>)}
            </select>
            <input className="form-control" placeholder="Farmer type, example small farmer / FPO / tenant" value={form.farmerType} onChange={(event) => update('farmerType', event.target.value)} />
          </div>

          <button className="btn btn-success" disabled={loading}>{loading ? 'Finding schemes...' : 'Refresh Scheme Recommendations'}</button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel schemes-result-panel">
          {!result ? (
            <p>Select state and district. Crop and purpose are optional; the app will show general farmer schemes if they are not known.</p>
          ) : (
            <SchemesResult result={result} />
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function SchemesResult({ result }) {
  return (
    <div className="schemes-result">
      <div className="schemes-hero">
        <span><MapPin size={16} /> {result.location}</span>
        <h2>{result.purpose}</h2>
        <small>{result.cropName}</small>
      </div>

      <div className="schemes-summary">
        <ShieldCheck size={22} />
        <p>{result.summary}</p>
      </div>

      <div className="scheme-card-grid">
        {result.schemes.map((scheme) => (
          <article className="scheme-card" key={scheme.name}>
            <div>
              <span className="scheme-category"><Landmark size={15} /> {scheme.category}</span>
              <h3>{scheme.name}</h3>
            </div>
            <p>{scheme.benefit}</p>
            <section>
              <strong>Eligibility</strong>
              <span>{scheme.eligibility}</span>
            </section>
            <section>
              <strong>Suitable for</strong>
              <span>{scheme.suitableFor}</span>
            </section>
            <section>
              <strong>Documents</strong>
              <span>{scheme.documents}</span>
            </section>
            <div className="scheme-actions">
              <a className="btn btn-success" href={scheme.applyLink} target="_blank" rel="noreferrer">
                <ExternalLink size={16} /> Official Link
              </a>
              <a className="btn btn-outline-success" href={scheme.googleSearchLink} target="_blank" rel="noreferrer">
                <Search size={16} /> Google Apply
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="scheme-note"><FileCheck2 size={18} /> {result.note}</div>
    </div>
  );
}
