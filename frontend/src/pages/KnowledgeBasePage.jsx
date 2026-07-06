import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Lightbulb, MapPin, Search, UserCheck } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { knowledgeRecommend } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const topics = ['General farming', 'Soil health', 'Fertilizer', 'Irrigation', 'Disease and pest', 'Crop planning', 'Weather decision', 'Market and storage', 'Organic farming'];
const soilTypes = ['Clay soil', 'Black soil', 'Sandy soil', 'Loamy soil', 'Red soil', 'Alluvial soil', 'Laterite soil'];
const seasons = ['Kharif / Monsoon', 'Rabi / Winter', 'Zaid / Summer', 'Whole year'];

export default function KnowledgeBasePage() {
  const [form, setForm] = useState({
    stateName: '',
    district: '',
    village: '',
    cropName: '',
    topic: '',
    season: '',
    soilType: ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);
  const district = form.district === 'Other / Not listed' ? customDistrict : form.district;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadKnowledge();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, customDistrict]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await loadKnowledge();
  }

  async function loadKnowledge() {
    setLoading(true);
    setError('');
    try {
      const { data } = await knowledgeRecommend({ ...form, district });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load knowledge recommendations.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <section className="knowledge-page">
        <form className="dashboard-panel knowledge-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Knowledge Management</span>
            <h2>Articles, agricultural tips, and expert recommendations</h2>
          </div>

          <div className="grid-2">
            <select className="form-select" value={form.stateName} onChange={(event) => setForm({ ...form, stateName: event.target.value, district: '' })}>
              <option value="">Select state if needed</option>
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
            <select className="form-select" value={form.topic} onChange={(event) => update('topic', event.target.value)}>
              <option value="">Topic</option>
              {topics.map((topic) => <option value={topic} key={topic}>{topic}</option>)}
            </select>
            <select className="form-select" value={form.season} onChange={(event) => update('season', event.target.value)}>
              <option value="">Season</option>
              {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
            </select>
            <select className="form-select" value={form.soilType} onChange={(event) => update('soilType', event.target.value)}>
              <option value="">Soil type</option>
              {soilTypes.map((soil) => <option value={soil} key={soil}>{soil}</option>)}
            </select>
          </div>

          <button className="btn btn-success" disabled={loading}>
            {loading ? 'Loading knowledge...' : 'Refresh Knowledge Repository'}
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel knowledge-result-panel">
          {!result ? (
            <p>Knowledge articles and expert recommendations will appear automatically. Inputs are optional.</p>
          ) : (
            <KnowledgeResult result={result} />
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function KnowledgeResult({ result }) {
  return (
    <div className="knowledge-result">
      <div className="knowledge-hero">
        <span><MapPin size={16} /> {result.location}</span>
        <h2>{result.topic}</h2>
        <small>{result.cropName}</small>
      </div>

      <div className="knowledge-summary">
        <BookOpen size={22} />
        <p>{result.summary}</p>
      </div>

      <div className="knowledge-article-grid">
        {result.articles.map((article) => (
          <article key={article.title}>
            <span><FileText size={15} /> {article.category}</span>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <section>
              <strong>Recommendation</strong>
              <small>{article.recommendation}</small>
            </section>
            <section>
              <strong>Expert tip</strong>
              <small>{article.expertTip}</small>
            </section>
          </article>
        ))}
      </div>

      <div className="knowledge-two-col">
        <section>
          <h3><Lightbulb size={18} /> Agricultural Tips</h3>
          {result.agriculturalTips.map((tip) => <p key={tip}>{tip}</p>)}
        </section>
        <section>
          <h3><UserCheck size={18} /> Expert Recommendations</h3>
          {result.expertRecommendations.map((tip) => <p key={tip}>{tip}</p>)}
        </section>
      </div>

      <div className="knowledge-note"><Search size={18} /> {result.note}</div>
    </div>
  );
}
