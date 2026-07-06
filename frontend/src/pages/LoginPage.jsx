import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { forgotPassword, googleLogin, login, resetPassword, verifyOtp } from '../services/api.js';
import { setSession } from '../redux/store.js';
import { useAppContext } from '../context/AppContext.jsx';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '', rememberMe: true });
  const [otpForm, setOtpForm] = useState({ email: '', otp: '', newPassword: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notify } = useAppContext();

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const { data } = await login(form);
      dispatch(setSession(data));
      notify('Login successful');
      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Login failed';
      setError(`${message}. Make sure backend and MySQL are running.`);
    }
  }

  async function continueWithGoogle() {
    const email = window.prompt('Enter Google account email for development login');
    if (!email) return;
    const { data } = await googleLogin({ idToken: 'development-token', email, fullName: email.split('@')[0] });
    dispatch(setSession(data));
    navigate('/dashboard');
  }

  async function sendOtp() {
    const { data } = await forgotPassword({ email: otpForm.email });
    setNotice(`OTP generated. Development OTP: ${data.devOtp}`);
  }

  async function checkOtp() {
    await verifyOtp({ email: otpForm.email, otp: otpForm.otp });
    setNotice('OTP verified. Enter a new password.');
  }

  async function changePassword() {
    await resetPassword(otpForm);
    setNotice('Password reset complete. You can login now.');
    setShowOtp(false);
  }

  return (
    <main className="auth-page">
      <form className="auth-panel" onSubmit={submit}>
        <h1>Login</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        <input className="form-control" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="form-control" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <label className="form-check">
          <input className="form-check-input" type="checkbox" checked={form.rememberMe} onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })} />
          <span className="form-check-label">Remember me</span>
        </label>
        <button className="btn btn-success w-100">Login</button>
        <button className="btn btn-outline-dark w-100" type="button" onClick={continueWithGoogle}>Continue with Google</button>
        {notice && <div className="alert alert-success">{notice}</div>}
        {showOtp && (
          <div className="otp-panel">
            <input className="form-control" placeholder="Email for OTP" value={otpForm.email} onChange={(e) => setOtpForm({ ...otpForm, email: e.target.value })} />
            <div className="d-flex gap-2">
              <button className="btn btn-outline-success flex-fill" type="button" onClick={sendOtp}>Send OTP</button>
              <button className="btn btn-outline-success flex-fill" type="button" onClick={checkOtp}>Verify OTP</button>
            </div>
            <input className="form-control" placeholder="OTP" value={otpForm.otp} onChange={(e) => setOtpForm({ ...otpForm, otp: e.target.value })} />
            <input className="form-control" type="password" placeholder="New password" value={otpForm.newPassword} onChange={(e) => setOtpForm({ ...otpForm, newPassword: e.target.value })} />
            <button className="btn btn-success w-100" type="button" onClick={changePassword}>Reset Password</button>
          </div>
        )}
        <div className="auth-links">
          <Link to="/register">Create account</Link>
          <button className="link-button" type="button" onClick={() => setShowOtp(!showOtp)}>Forgot password?</button>
        </div>
      </form>
    </main>
  );
}
