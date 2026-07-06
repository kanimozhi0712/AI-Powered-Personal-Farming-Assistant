import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Droplets, Gauge, Leaf, MapPin, RefreshCw, Waves } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { irrigationPredict } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const soilTypes = ['Clay soil', 'Black soil', 'Sandy soil', 'Loamy soil', 'Red soil', 'Alluvial soil', 'Laterite soil'];
const seasons = ['Kharif / Monsoon', 'Rabi / Winter', 'Zaid / Summer', 'Whole year'];
const methods = ['Drip irrigation', 'Sprinkler irrigation', 'Furrow irrigation', 'Flood irrigation', 'Manual watering'];

export default function IrrigationPredictionPage() {
  const [form, setForm] = useState({
    stateName: '',
    district: '',
    village: '',
    cropName: '',
    soilType: '',
    season: '',
    fieldAreaAcres: '1',
    irrigationMethod: 'Drip irrigation',
    currentMoisture: ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);
  const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
  const canPredict = form.stateName && district && form.cropName && form.soilType;

  useEffect(() => {
    if (!canPredict) return;
    const timer = window.setTimeout(() => {
      loadPrediction();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form.stateName, form.district, customDistrict, form.village, form.cropName, form.soilType, form.season, form.fieldAreaAcres, form.irrigationMethod, form.currentMoisture]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await loadPrediction();
  }

  async function loadPrediction() {
    if (!canPredict) {
      setError('Select state, district, crop, and soil type first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        district,
        fieldAreaAcres: numberOrNull(form.fieldAreaAcres),
        currentMoisture: numberOrNull(form.currentMoisture)
      };
      const { data } = await irrigationPredict(payload);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to generate irrigation prediction.');
    } finally {
      setLoading(false);
    }
  }

  function numberOrNull(value) {
    return value === '' ? null : Number(value);
  }

  return (
    <DashboardShell>
      <section className="irrigation-page">
        <form className="dashboard-panel irrigation-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Irrigation Prediction</span>
            <h2>Automatic soil moisture and water schedule</h2>
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
            <input className="form-control" placeholder="Crop name, example paddy" value={form.cropName} onChange={(event) => update('cropName', event.target.value)} />
            <select className="form-select" value={form.soilType} onChange={(event) => update('soilType', event.target.value)}>
              <option value="">Select soil type</option>
              {soilTypes.map((soil) => <option value={soil} key={soil}>{soil}</option>)}
            </select>
            <select className="form-select" value={form.season} onChange={(event) => update('season', event.target.value)}>
              <option value="">Season if known</option>
              {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
            </select>
            <select className="form-select" value={form.irrigationMethod} onChange={(event) => update('irrigationMethod', event.target.value)}>
              {methods.map((method) => <option value={method} key={method}>{method}</option>)}
            </select>
            <input className="form-control" type="number" min="0.1" step="0.1" placeholder="Field area in acres" value={form.fieldAreaAcres} onChange={(event) => update('fieldAreaAcres', event.target.value)} />
            <input className="form-control" type="number" min="0" max="100" placeholder="Soil moisture % if sensor available" value={form.currentMoisture} onChange={(event) => update('currentMoisture', event.target.value)} />
          </div>

          <button className="btn btn-success" disabled={loading}>
            {loading ? <><RefreshCw size={16} className="spin-icon" /> Predicting...</> : 'Refresh Irrigation Prediction'}
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel irrigation-result-panel">
          {!result ? (
            <p>Select state, district, crop, and soil type. Prediction will appear automatically. Soil moisture sensor value is optional.</p>
          ) : (
            <IrrigationResult result={result} />
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function IrrigationResult({ result }) {
  return (
    <div className="irrigation-result">
      <div className="irrigation-hero">
        <span><MapPin size={16} /> {result.location}</span>
        <h2>{result.moistureStatus}</h2>
        <small>{result.weatherSource}</small>
      </div>

      <div className="irrigation-stats">
        <IrrigationStat icon={Gauge} label="Soil moisture" value={`${result.estimatedMoisturePercent}%`} />
        <IrrigationStat icon={Droplets} label="Water need" value={`${result.waterRequirementMm} mm`} />
        <IrrigationStat icon={Waves} label="Water volume" value={`${result.waterRequirementLiters} L`} />
        <IrrigationStat icon={Leaf} label="Crop" value={result.cropName} />
      </div>

      <section className="irrigation-advice">
        <h3>Irrigation Recommendation</h3>
        <p>{result.recommendation}</p>
      </section>
      <section className="irrigation-advice">
        <h3>Water Optimization</h3>
        <p>{result.optimization}</p>
      </section>
      <section className="irrigation-next">
        <CalendarDays size={18} />
        <strong>{result.nextIrrigation}</strong>
      </section>

      <div className="irrigation-schedule">
        {result.schedule.map((day) => (
          <article key={day.date}>
            <strong>{day.date}</strong>
            <span>{day.action}</span>
            <small>{day.waterMm} mm / {day.waterLiters} L</small>
            <p>{day.reason}</p>
          </article>
        ))}
      </div>

      <p className="result-note">{result.note}</p>
    </div>
  );
}

function IrrigationStat({ icon: Icon, label, value }) {
  return (
    <div className="irrigation-stat">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
