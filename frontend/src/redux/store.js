import { configureStore, createSlice } from '@reduxjs/toolkit';

const initialAuth = {
  token: localStorage.getItem('farm_token'),
  user: JSON.parse(localStorage.getItem('farm_user') || 'null')
};

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuth,
  reducers: {
    setSession(state, action) {
      state.token = action.payload.token;
      state.user = action.payload;
      localStorage.setItem('farm_token', action.payload.token);
      localStorage.setItem('farm_user', JSON.stringify(action.payload));
    },
    setUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('farm_user', JSON.stringify(state.user));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('farm_token');
      localStorage.removeItem('farm_user');
    }
  }
});

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: localStorage.getItem('farm_theme') || 'light' },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('farm_theme', state.mode);
    }
  }
});

export const { setSession, setUser, logout } = authSlice.actions;
export const { toggleTheme } = themeSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    theme: themeSlice.reducer
  }
});
