import { Route, Routes } from 'react-router-dom';
import AdminDashboardPage from '../pages/AdminDashboardPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import AiChatPage from '../pages/AiChatPage.jsx';
import CropRecommendationPage from '../pages/CropRecommendationPage.jsx';
import DiseaseDetectionPage from '../pages/DiseaseDetectionPage.jsx';
import FertilizerRecommendationPage from '../pages/FertilizerRecommendationPage.jsx';
import GovernmentSchemesPage from '../pages/GovernmentSchemesPage.jsx';
import IrrigationPredictionPage from '../pages/IrrigationPredictionPage.jsx';
import KnowledgeBasePage from '../pages/KnowledgeBasePage.jsx';
import LandingPage from '../pages/LandingPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import MarketPricePage from '../pages/MarketPricePage.jsx';
import ModulePage from '../pages/ModulePage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import RegisterPage from '../pages/RegisterPage.jsx';
import WeatherForecastPage from '../pages/WeatherForecastPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
      <Route path="/module/ai-chat" element={<ProtectedRoute><AiChatPage /></ProtectedRoute>} />
      <Route path="/module/crop-recommendations" element={<ProtectedRoute><CropRecommendationPage /></ProtectedRoute>} />
      <Route path="/module/disease-reports" element={<ProtectedRoute><DiseaseDetectionPage /></ProtectedRoute>} />
      <Route path="/module/weather-history" element={<ProtectedRoute><WeatherForecastPage /></ProtectedRoute>} />
      <Route path="/module/irrigation-records" element={<ProtectedRoute><IrrigationPredictionPage /></ProtectedRoute>} />
      <Route path="/module/fertilizer-recommendations" element={<ProtectedRoute><FertilizerRecommendationPage /></ProtectedRoute>} />
      <Route path="/module/market-prices" element={<ProtectedRoute><MarketPricePage /></ProtectedRoute>} />
      <Route path="/module/government-schemes" element={<ProtectedRoute><GovernmentSchemesPage /></ProtectedRoute>} />
      <Route path="/module/knowledge-base" element={<ProtectedRoute><KnowledgeBasePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/module/:module" element={<ProtectedRoute><ModulePage /></ProtectedRoute>} />
    </Routes>
  );
}
