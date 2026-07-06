CREATE DATABASE IF NOT EXISTS farm_assistant;
USE farm_assistant;

CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'FARMER',
  phone VARCHAR(40),
  state_name VARCHAR(120),
  district VARCHAR(120),
  profile_image_url VARCHAR(500),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE otp_verification (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(180) NOT NULL,
  otp VARCHAR(12) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE
);

CREATE TABLE password_reset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(180) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

CREATE TABLE chat_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  message TEXT NOT NULL,
  response TEXT,
  provider VARCHAR(80),
  language VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE crop_recommendations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  soil_type VARCHAR(120),
  soil_ph DECIMAL(4,2),
  district VARCHAR(120),
  state_name VARCHAR(120),
  rainfall DECIMAL(8,2),
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  season VARCHAR(80),
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE disease_reports (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  crop_name VARCHAR(120),
  image_url VARCHAR(500),
  disease_name VARCHAR(160),
  confidence_score DECIMAL(5,2),
  treatment TEXT,
  prevention TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE weather_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  district VARCHAR(120),
  state_name VARCHAR(120),
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(6,2),
  rainfall DECIMAL(8,2),
  alert TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE irrigation_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  crop_name VARCHAR(120),
  soil_moisture DECIMAL(5,2),
  water_requirement_liters DECIMAL(10,2),
  recommendation TEXT,
  schedule_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE fertilizer_recommendations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  crop_name VARCHAR(120),
  nitrogen DECIMAL(8,2),
  phosphorus DECIMAL(8,2),
  potassium DECIMAL(8,2),
  dosage TEXT,
  instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE market_prices (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crop_name VARCHAR(120) NOT NULL,
  market_name VARCHAR(160),
  district VARCHAR(120),
  state_name VARCHAR(120),
  price_per_quintal DECIMAL(10,2),
  trend VARCHAR(40),
  selling_recommendation TEXT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE government_schemes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  eligibility TEXT,
  subsidy_information TEXT,
  benefits TEXT,
  official_url VARCHAR(500),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE knowledge_base (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  author_id BIGINT,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(120),
  content TEXT,
  video_url VARCHAR(500),
  pdf_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE activity_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT,
  action VARCHAR(160) NOT NULL,
  details TEXT,
  ip_address VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE managed_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata_json JSON,
  owner_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (name) VALUES ('FARMER'), ('EXPERT'), ('ADMIN');
