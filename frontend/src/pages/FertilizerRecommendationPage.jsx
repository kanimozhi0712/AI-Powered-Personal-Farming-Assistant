import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Leaf, MapPin, Sprout, TestTube2 } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { fertilizerRecommend } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const soilTypes = ['Clay soil', 'Black soil', 'Sandy soil', 'Loamy soil', 'Red soil', 'Alluvial soil', 'Laterite soil'];
const seasons = ['Kharif / Monsoon', 'Rabi / Winter', 'Zaid / Summer', 'Whole year'];
const stages = ['Before sowing / basal', 'Seedling / establishment', 'Vegetative growth', 'Flowering', 'Fruiting / grain filling'];
const nutrientLevels = ['Low', 'Medium', 'High', 'Unknown'];

export default function FertilizerRecommendationPage() {
  const [form, setForm] = useState({
    stateName: '',
    district: '',
    village: '',
    cropName: '',
    soilType: '',
    season: '',
    cropStage: '',
    nitrogenLevel: 'Unknown',
    phosphorusLevel: 'Unknown',
    potassiumLevel: 'Unknown',
    organicMatterLevel: 'Unknown',
    soilPh: ''
  });
  const [customDistrict, setCustomDistrict] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);
  const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
  const canRecommend = form.stateName && district && form.cropName && form.soilType;

  useEffect(() => {
    if (!canRecommend) return;
    const timer = window.setTimeout(() => {
      loadRecommendation();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form, customDistrict]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await loadRecommendation();
  }

  async function loadRecommendation() {
    if (!canRecommend) {
      setError('Select state, district, crop, and soil type first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        district,
        nitrogenLevel: cleanUnknown(form.nitrogenLevel),
        phosphorusLevel: cleanUnknown(form.phosphorusLevel),
        potassiumLevel: cleanUnknown(form.potassiumLevel),
        organicMatterLevel: cleanUnknown(form.organicMatterLevel),
        soilPh: form.soilPh === '' ? null : Number(form.soilPh)
      };
      const { data } = await fertilizerRecommend(payload);
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to generate fertilizer recommendation.');
    } finally {
      setLoading(false);
    }
  }

  function cleanUnknown(value) {
    return value === 'Unknown' ? '' : value;
  }

  return (
    <DashboardShell>
      <section className="fertilizer-page">
        <form className="dashboard-panel fertilizer-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Fertilizer Recommendation</span>
            <h2>Correct fertilizer based on soil, crop, nutrients, and season</h2>
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
            <input className="form-control" placeholder="Crop or plant, example paddy" value={form.cropName} onChange={(event) => update('cropName', event.target.value)} />
            <select className="form-select" value={form.soilType} onChange={(event) => update('soilType', event.target.value)}>
              <option value="">Select soil type</option>
              {soilTypes.map((soil) => <option value={soil} key={soil}>{soil}</option>)}
            </select>
            <select className="form-select" value={form.season} onChange={(event) => update('season', event.target.value)}>
              <option value="">Season if known</option>
              {seasons.map((season) => <option value={season} key={season}>{season}</option>)}
            </select>
            <select className="form-select" value={form.cropStage} onChange={(event) => update('cropStage', event.target.value)}>
              <option value="">Crop stage if known</option>
              {stages.map((stage) => <option value={stage} key={stage}>{stage}</option>)}
            </select>
          </div>

          <div className="nutrient-panel">
            <span className="eyebrow">Soil nutrients if known</span>
            <div className="grid-2">
              <NutrientSelect label="Nitrogen" value={form.nitrogenLevel} onChange={(value) => update('nitrogenLevel', value)} />
              <NutrientSelect label="Phosphorus" value={form.phosphorusLevel} onChange={(value) => update('phosphorusLevel', value)} />
              <NutrientSelect label="Potassium" value={form.potassiumLevel} onChange={(value) => update('potassiumLevel', value)} />
              <NutrientSelect label="Organic matter" value={form.organicMatterLevel} onChange={(value) => update('organicMatterLevel', value)} />
              <input className="form-control" type="number" step="0.1" min="3" max="10" placeholder="pH if known" value={form.soilPh} onChange={(event) => update('soilPh', event.target.value)} />
            </div>
          </div>

          <button className="btn btn-success" disabled={loading}>{loading ? 'Generating...' : 'Refresh Fertilizer Recommendation'}</button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel fertilizer-result-panel">
          {!result ? (
            <p>Select state, district, crop, and soil type. NPK and pH are optional; if the farmer does not know them, the system estimates from crop and soil.</p>
          ) : (
            <FertilizerResult result={result} />
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function NutrientSelect({ label, value, onChange }) {
  return (
    <label className="nutrient-select">
      <span>{label}</span>
      <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {nutrientLevels.map((level) => <option value={level} key={level}>{level}</option>)}
      </select>
    </label>
  );
}

function FertilizerResult({ result }) {
  return (
    <div className="fertilizer-result">
      <div className="fertilizer-hero">
        <span><MapPin size={16} /> {result.location}</span>
        <h2>{result.cropName}</h2>
        <small>{result.soilType} | {result.season}</small>
      </div>

      <div className="fertilizer-summary">
        <FertilizerCard icon={TestTube2} label="Soil analysis" value={result.soilAnalysis} />
        <FertilizerCard icon={FlaskConical} label="Main plan" value={result.primaryRecommendation} />
        <FertilizerCard icon={Leaf} label="Organic plan" value={result.organicPlan} />
        <FertilizerCard icon={Sprout} label="Schedule" value={result.applicationSchedule} />
      </div>

      <div className="fertilizer-dose-grid">
        {result.doses.map((dose) => (
          <article key={dose.nutrient}>
            <strong>{dose.nutrient}</strong>
            <span>{dose.status}</span>
            <p>{dose.recommendation}</p>
            <small>{dose.timing}</small>
          </article>
        ))}
      </div>

      <div className="fertilizer-caution">{result.caution}</div>
      <p className="result-note">{result.note}</p>
    </div>
  );
}

function FertilizerCard({ icon: Icon, label, value }) {
  return (
    <section>
      <Icon size={22} />
      <h3>{label}</h3>
      <p>{value}</p>
    </section>
  );
}
