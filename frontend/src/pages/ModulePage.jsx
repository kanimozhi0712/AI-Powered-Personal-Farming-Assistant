import { useState } from 'react';
import { useParams } from 'react-router-dom';
import DashboardShell from '../components/DashboardShell.jsx';
import { aiChat, cropRecommend, weatherForecast } from '../services/api.js';
import { useRecords } from '../hooks/useRecords.js';
import { useModuleMeta } from '../hooks/useModuleMeta.js';

export default function ModulePage() {
  const { module } = useParams();
  const { records, loading, error, add } = useRecords(module);
  const [form, setForm] = useState({ title: '', content: '', metadataJson: '' });
  const [answer, setAnswer] = useState('');
  const { label: title } = useModuleMeta(module);

  async function submit(event) {
    event.preventDefault();
    if (module === 'ai-chat') {
      const { data } = await aiChat({ message: form.content || form.title, language: 'en' });
      setAnswer(data.answer);
      return;
    }
    if (module === 'crop-recommendations') {
      const { data } = await cropRecommend({ soilType: form.title, district: 'Demo District', stateName: 'Demo State', season: form.content });
      setAnswer(data.recommendation);
      return;
    }
    if (module === 'weather-history') {
      const { data } = await weatherForecast({ district: form.title || 'Demo District', stateName: form.content || 'Demo State' });
      setAnswer(data.forecast);
      return;
    }
    await add(form);
    setForm({ title: '', content: '', metadataJson: '' });
  }

  return (
    <DashboardShell>
      <section className="module-layout">
        <form className="dashboard-panel" onSubmit={submit}>
          <h2>{title}</h2>
          <input className="form-control" placeholder="Title, crop, district, or question" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="form-control" rows="5" placeholder="Details, symptoms, season, price notes, or article body" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <textarea className="form-control" rows="3" placeholder='Optional JSON metadata: {"confidence": 0.91}' value={form.metadataJson} onChange={(e) => setForm({ ...form, metadataJson: e.target.value })} />
          <button className="btn btn-success">Save / Analyze</button>
          {answer && <div className="assistant-answer">{answer}</div>}
        </form>
        <div className="record-list">
          {loading && <div className="dashboard-panel">Loading records...</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          {records.map((record) => (
            <article className="record-card" key={record.id}>
              <h3>{record.title}</h3>
              <p>{record.content}</p>
              <small>{record.module}</small>
            </article>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
