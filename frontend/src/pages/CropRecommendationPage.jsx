import { useMemo, useState } from 'react';
import DashboardShell from '../components/DashboardShell.jsx';
import { cropRecommend } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const soilTypes = ['Clay soil', 'Black soil', 'Sandy soil', 'Loamy soil', 'Red soil', 'Alluvial soil', 'Laterite soil', 'Other'];
const seasons = ['Kharif / Monsoon', 'Rabi / Winter', 'Zaid / Summer', 'Whole year'];
const climates = ['Humid', 'Dry / Arid', 'Semi-arid', 'Tropical', 'Cool', 'Coastal', 'Hill region'];

export default function CropRecommendationPage() {
  const [form, setForm] = useState({
    stateName: '',
    district: '',
    village: '',
    soilType: '',
    season: '',
    climate: '',
    rainfall: '',
    temperature: '',
    humidity: ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setRecommendation('');
    const payload = {
      ...form,
      district: form.district === 'Other / Not listed' ? customDistrict : form.district,
      soilPh: null,
      rainfall: numberOrNull(form.rainfall),
      temperature: numberOrNull(form.temperature),
      humidity: numberOrNull(form.humidity)
    };
    try {
      const { data } = await cropRecommend(payload);
      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to generate crop recommendation');
    } finally {
      setLoading(false);
    }
  }

  function numberOrNull(value) {
    return value === '' ? null : Number(value);
  }

  function estimateWeather() {
    const estimates = estimateByRegion(form.stateName, form.season);
    setForm((current) => ({ ...current, ...estimates }));
  }

  return (
    <DashboardShell>
      <section className="crop-page">
        <form className="dashboard-panel crop-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Crop Recommendation</span>
            <h2>Find suitable crops for your place</h2>
          </div>

          <div className="grid-2">
            <select className="form-select" value={form.stateName} onChange={(e) => setForm({ ...form, stateName: e.target.value, district: '' })}>
              <option value="">Select state</option>
              {states.map((state) => <option value={state} key={state}>{state}</option>)}
            </select>
            <select className="form-select" value={form.district} disabled={!form.stateName} onChange={(e) => update('district', e.target.value)}>
              <option value="">Select district</option>
              {districts.map((district) => <option value={district} key={district}>{district}</option>)}
            </select>
            {form.district === 'Other / Not listed' && (
              <input className="form-control" placeholder="Enter district" value={customDistrict} onChange={(e) => setCustomDistrict(e.target.value)} />
            )}
            <input className="form-control" placeholder="Village / town / place / block" value={form.village} onChange={(e) => update('village', e.target.value)} />
            <select className="form-select" value={form.soilType} onChange={(e) => update('soilType', e.target.value)}>
              <option value="">Select soil type</option>
              {soilTypes.map((soil) => <option value={soil} key={soil}>{soil}</option>)}
            </select>
            <select className="form-select" value={form.season} onChange={(e) => update('season', e.target.value)}>
              <option value="">Select season</option>
              {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
            </select>
          </div>

          <div className="advanced-toggle">
            <button className="btn btn-outline-success" type="button" onClick={estimateWeather}>Auto-estimate climate</button>
            <button className="btn btn-outline-dark" type="button" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? 'Hide advanced fields' : 'Show advanced fields'}
            </button>
          </div>

          {showAdvanced && (
            <div className="grid-2 advanced-fields">
              <select className="form-select" value={form.climate} onChange={(e) => update('climate', e.target.value)}>
                <option value="">Climate if known</option>
                {climates.map((climate) => <option value={climate} key={climate}>{climate}</option>)}
              </select>
              <input className="form-control" type="number" placeholder="Rainfall mm if known" value={form.rainfall} onChange={(e) => update('rainfall', e.target.value)} />
              <input className="form-control" type="number" placeholder="Temperature C if known" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} />
              <input className="form-control" type="number" placeholder="Humidity % if known" value={form.humidity} onChange={(e) => update('humidity', e.target.value)} />
            </div>
          )}

          <button className="btn btn-success" disabled={loading}>{loading ? 'Generating...' : 'Get Crop Recommendation'}</button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel recommendation-panel">
          <h2>Recommendation Result</h2>
          {recommendation ? (
            <HighlightedRecommendation text={recommendation} />
          ) : (
            <p>Select state, district, village/place, soil type, and season. Climate details are optional.</p>
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function HighlightedRecommendation({ text }) {
  const parsed = parseRecommendation(text);

  return (
    <div className="recommendation-result">
      <div className="result-hero">
        <span className="eyebrow">Best crops</span>
        <h3>{parsed.location}</h3>
      </div>

      <div className="crop-chip-grid">
        {parsed.crops.map((crop) => <span className="crop-chip" key={crop}>{crop}</span>)}
      </div>

      <div className="summary-badges">
        {parsed.summary.map((item) => <span key={item}>{item}</span>)}
      </div>

      <div className="tip-list">
        <h3>Farming Tips</h3>
        {parsed.tips.map((tip) => <p key={tip}>{tip}</p>)}
      </div>

      {parsed.note && <div className="result-note">{parsed.note}</div>}
    </div>
  );
}

function parseRecommendation(text) {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const location = lines.find((line) => line.startsWith('Crop recommendation for'))?.replace('Crop recommendation for', '').trim() || 'Selected place';
  const crops = collectBullets(lines, 'Best suitable crops:', 'Input summary:');
  const tips = collectBullets(lines, 'Farming tips:', 'Note:');
  const summaryLine = lines.find((line) => line.startsWith('Soil:')) || '';
  const summary = summaryLine.split('|').map((item) => item.trim()).filter(Boolean);
  const note = lines.find((line) => line.startsWith('Note:'))?.replace('Note:', '').trim();
  return { location, crops, tips, summary, note };
}

function collectBullets(lines, startLabel, endLabel) {
  const start = lines.indexOf(startLabel);
  const end = lines.indexOf(endLabel);
  if (start === -1) return [];
  return lines.slice(start + 1, end === -1 ? undefined : end)
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace('- ', '').trim());
}

function estimateByRegion(stateName, season) {
  const coastal = ['Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Odisha', 'West Bengal'];
  const dry = ['Rajasthan', 'Gujarat', 'Haryana', 'Punjab'];
  const central = ['Madhya Pradesh', 'Maharashtra', 'Telangana', 'Karnataka'];
  const kharif = season?.toLowerCase().includes('kharif') || season?.toLowerCase().includes('monsoon');
  const rabi = season?.toLowerCase().includes('rabi') || season?.toLowerCase().includes('winter');

  if (coastal.includes(stateName)) {
    return {
      climate: 'Humid',
      rainfall: kharif ? '1100' : '750',
      temperature: rabi ? '25' : '30',
      humidity: '78'
    };
  }
  if (dry.includes(stateName)) {
    return {
      climate: 'Dry / Arid',
      rainfall: kharif ? '520' : '280',
      temperature: rabi ? '20' : '34',
      humidity: '42'
    };
  }
  if (central.includes(stateName)) {
    return {
      climate: 'Semi-arid',
      rainfall: kharif ? '780' : '450',
      temperature: rabi ? '23' : '31',
      humidity: '58'
    };
  }
  return {
    climate: 'Tropical',
    rainfall: kharif ? '850' : '500',
    temperature: rabi ? '22' : '30',
    humidity: '62'
  };
}
