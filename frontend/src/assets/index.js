import { Bot, CloudSun, Droplets, FileText, Leaf, ShieldCheck, Store, Wheat } from 'lucide-react';

export const farmImages = {
  hero: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80',
  field: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=1800&q=80'
};

export const publicFeatures = [
  ['AI Assistant', Bot, 'Ask crop, pest, irrigation, and market questions in a chat-first workspace.'],
  ['Crop Recommendation', Wheat, 'Plan crops with soil, rainfall, season, pH, humidity, and district inputs.'],
  ['Disease Detection', Leaf, 'Upload crop or leaf images and store treatment reports with confidence notes.'],
  ['Weather Services', CloudSun, 'Track weather history, rainfall alerts, humidity, temperature, and wind.'],
  ['Market Analysis', Store, 'Compare daily crop prices, trends, and selling recommendations.'],
  ['Government Schemes', ShieldCheck, 'Browse subsidies, eligibility, benefits, and official apply links.']
];

export const moduleMeta = {
  'ai-chat': { label: 'AI Chat Assistant', icon: Bot },
  'crop-recommendations': { label: 'Crop Recommendations', icon: Wheat },
  'disease-reports': { label: 'Disease Detection Reports', icon: Leaf },
  'weather-history': { label: 'Weather Forecast', icon: CloudSun },
  'irrigation-records': { label: 'Irrigation Management', icon: Droplets },
  'fertilizer-recommendations': { label: 'Fertilizer Recommendations', icon: Wheat },
  'market-prices': { label: 'Market Price Analysis', icon: Store },
  'government-schemes': { label: 'Government Schemes', icon: ShieldCheck },
  'knowledge-base': { label: 'Knowledge Management', icon: FileText }
};
