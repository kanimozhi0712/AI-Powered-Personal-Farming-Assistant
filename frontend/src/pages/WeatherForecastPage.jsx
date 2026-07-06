import { useEffect, useMemo, useState } from 'react';
import { CloudRain, Droplets, MapPin, Thermometer, Wind } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { weatherForecast } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

export default function WeatherForecastPage() {
  const [form, setForm] = useState({ stateName: '', district: '', village: '' });
  const [customDistrict, setCustomDistrict] = useState('');
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);

  useEffect(() => {
    const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
    if (!form.stateName || !district) return;
    const timer = window.setTimeout(() => {
      loadForecast();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form.stateName, form.district, form.village, customDistrict]);

  async function submit(event) {
    event.preventDefault();
    await loadForecast();
  }

  async function loadForecast() {
    const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
    if (!form.stateName || !district) {
      setError('Select state and district first.');
      return;
    }
    setLoading(true);
    setError('');
    setForecast(null);
    try {
      const payload = { ...form, district };
      const { data } = await weatherForecast(payload);
      setForecast(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load weather prediction.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <section className="weather-page">
        <form className="dashboard-panel weather-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Weather Prediction</span>
            <h2>Forecast for any city, district, village, or place</h2>
          </div>
          <select className="form-select" value={form.stateName} onChange={(e) => setForm({ ...form, stateName: e.target.value, district: '' })}>
            <option value="">Select state</option>
            {states.map((state) => <option key={state}>{state}</option>)}
          </select>
          <select className="form-select" value={form.district} disabled={!form.stateName} onChange={(e) => setForm({ ...form, district: e.target.value })}>
            <option value="">Select district</option>
            {districts.map((district) => <option value={district} key={district}>{district}</option>)}
          </select>
          {form.district === 'Other / Not listed' && <input className="form-control" placeholder="Enter district" value={customDistrict} onChange={(e) => setCustomDistrict(e.target.value)} />}
          <input className="form-control" placeholder="Village / city / place name" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
          <button className="btn btn-success" disabled={loading}>{loading ? 'Predicting...' : 'Refresh Weather Prediction'}</button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <div className="dashboard-panel weather-result-panel">
          {!forecast ? (
            <p>Select state and district. Weather prediction will appear automatically. Village/place is optional for more local results.</p>
          ) : (
            <WeatherResult forecast={forecast} />
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

function WeatherResult({ forecast }) {
  return (
    <div className="weather-result">
      <div className="weather-hero">
        <span><MapPin size={16} /> {forecast.location}</span>
        <h2>{forecast.currentCondition}</h2>
        <small>{forecast.source}</small>
      </div>
      <div className="weather-stats">
        <WeatherStat icon={Thermometer} label="Temperature" value={`${forecast.temperature} C`} />
        <WeatherStat icon={Droplets} label="Humidity" value={`${forecast.humidity}%`} />
        <WeatherStat icon={Wind} label="Wind" value={`${forecast.windKph} km/h`} />
        <WeatherStat icon={CloudRain} label="Rain" value={`${forecast.rainMm} mm`} />
      </div>
      <div className="weather-advisory">{forecast.farmerAdvisory}</div>
      <div className="daily-weather-grid">
        {forecast.daily.map((day) => (
          <article key={day.date}>
            <strong>{day.date}</strong>
            <span>{day.condition}</span>
            <small>{day.minTemp} - {day.maxTemp} C</small>
            <small>Rain: {day.rainMm} mm {day.rainChance != null ? `(${day.rainChance}%)` : ''}</small>
            <small>Wind: {day.windKph} km/h</small>
            <small>ET0: {day.evapotranspiration} mm</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function WeatherStat({ icon: Icon, label, value }) {
  return (
    <div className="weather-stat">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
