import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import { publicFeatures } from '../assets/index.js';

export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <section id="home" className="hero">
        <div className="container hero-content">
          <p className="eyebrow">AI Powered Personal Farming Assistant</p>
          <h1>Smarter decisions for every field, season, and market day.</h1>
          <p className="hero-copy">A modern agriculture platform for farmers, experts, and administrators with AI chat, recommendations, forecasts, reports, and knowledge management.</p>
          <div className="d-flex gap-3 flex-wrap">
            <Link className="btn btn-success btn-lg" to="/login">Get Started</Link>
            <a className="btn btn-light btn-lg" href="#features">Learn More</a>
          </div>
        </div>
      </section>

      <section id="about" className="section-band">
        <div className="container two-col">
          <div>
            <span className="eyebrow">About Project</span>
            <h2>One command center for farming support.</h2>
          </div>
          <p>FarmAI connects authentication, AI advisory, disease reporting, weather, irrigation, fertilizer planning, market prices, government schemes, and expert knowledge into a role-based platform.</p>
        </div>
      </section>

      <section id="features" className="container py-5">
        <div className="section-title">
          <span className="eyebrow">Features</span>
          <h2>Built for real agricultural workflows</h2>
        </div>
        <div className="feature-grid">
          {publicFeatures.map(([title, Icon, text]) => (
            <article className="feature-card" key={title}>
              <Icon size={28} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="section-band">
        <div className="container service-strip">
          <strong>AI Assistant</strong>
          <strong>Weather Services</strong>
          <strong>Crop Recommendation</strong>
          <strong>Disease Detection</strong>
          <strong>Testimonials</strong>
        </div>
      </section>

      <section id="contact" className="container contact-section">
        <form className="contact-form">
          <span className="eyebrow">Contact</span>
          <h2>Talk to an agricultural expert</h2>
          <input className="form-control" placeholder="Full name" />
          <input className="form-control" placeholder="Email address" />
          <textarea className="form-control" rows="4" placeholder="How can we help?" />
          <button className="btn btn-success" type="button">Send Message</button>
        </form>
      </section>

      <footer className="footer">FarmAI © 2026. Built for farmers, experts, and administrators.</footer>
    </div>
  );
}
