import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, MapPin, RefreshCw, Store, TrendingUp } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { marketPrices } from '../services/api.js';
import { stateDistricts, states } from '../utils/locations.js';

const commonCrops = ['Paddy', 'Rice', 'Wheat', 'Maize', 'Cotton', 'Groundnut', 'Turmeric', 'Chilli', 'Tomato', 'Onion', 'Banana', 'Sugarcane', 'Potato'];

export default function MarketPricePage() {
  const [form, setForm] = useState({ stateName: '', district: '', village: '', commodity: '' });
  const [customDistrict, setCustomDistrict] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const districts = useMemo(() => form.stateName ? stateDistricts[form.stateName] || [] : [], [form.stateName]);
  const district = form.district === 'Other / Not listed' ? customDistrict : form.district;
  const canSearch = form.stateName && district && form.commodity;

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => {
      loadPrices();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [form.stateName, form.district, customDistrict, form.village, form.commodity]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    await loadPrices();
  }

  async function loadPrices() {
    if (!canSearch) {
      setError('Select state, district, and crop first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await marketPrices({ ...form, district });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load market prices.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardShell>
      <section className="market-page">
        <form className="dashboard-panel market-form" onSubmit={submit}>
          <div>
            <span className="eyebrow">Market Price</span>
            <h2>Live crop price by district and market</h2>
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
            <input className="form-control" list="crop-price-list" placeholder="Crop name, example tomato" value={form.commodity} onChange={(event) => update('commodity', event.target.value)} />
            <datalist id="crop-price-list">
              {commonCrops.map((crop) => <option value={crop} key={crop} />)}
            </datalist>
          </div>

          <button className="btn btn-success" disabled={loading}>
            {loading ? <><RefreshCw size={16} className="spin-icon" /> Loading...</> : 'Refresh Market Price'}
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </form>

        <article className="dashboard-panel market-result-panel">
          {!result ? (
            <p>Select state, district, and crop. The current mandi price will appear automatically when live data is available.</p>
          ) : (
            <MarketResult result={result} />
          )}
        </article>
      </section>
    </DashboardShell>
  );
}

function MarketResult({ result }) {
  return (
    <div className="market-result">
      <div className="market-hero">
        <span><MapPin size={16} /> {result.location}</span>
        <h2>{result.commodity}</h2>
        <small>{result.source}</small>
      </div>

      <div className="market-stats">
        <MarketStat icon={IndianRupee} label="Average modal price" value={`Rs ${result.averageModalPrice}/quintal`} />
        <MarketStat icon={TrendingUp} label="Price signal" value={result.priceTrend} />
        <MarketStat icon={Store} label="Markets found" value={result.prices.length} />
      </div>

      <div className="market-advice">{result.sellingAdvice}</div>

      <div className="market-table-wrap">
        <table className="market-table">
          <thead>
            <tr>
              <th>Market</th>
              <th>Variety</th>
              <th>Date</th>
              <th>Min</th>
              <th>Modal</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {result.prices.map((price) => (
              <tr key={`${price.market}-${price.variety}-${price.arrivalDate}`}>
                <td>{price.market}</td>
                <td>{price.variety}</td>
                <td>{price.arrivalDate}</td>
                <td>Rs {price.minPrice}</td>
                <td><strong>Rs {price.modalPrice}</strong></td>
                <td>Rs {price.maxPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="result-note">{result.note}</p>
    </div>
  );
}

function MarketStat({ icon: Icon, label, value }) {
  return (
    <div className="market-stat">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
