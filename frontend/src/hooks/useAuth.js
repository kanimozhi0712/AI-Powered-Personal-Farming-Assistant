import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest, register as registerRequest } from '../services/api.js';
import { logout, setSession } from '../redux/store.js';

export function useAuth() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function login(payload) {
    const { data } = await loginRequest(payload);
    dispatch(setSession(data));
    navigate('/dashboard');
    return data;
  }

  async function register(payload) {
    const { data } = await registerRequest(payload);
    navigate('/login');
    return data;
  }

  function signOut() {
    dispatch(logout());
    navigate('/');
  }

  return {
    ...auth,
    isAuthenticated: Boolean(auth.token),
    login,
    register,
    signOut
  };
}
