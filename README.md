# AI Powered Personal Farming Assistant

AI Powered Personal Farming Assistant is a full-stack smart agriculture platform built using React, Spring Boot, and MySQL. The system provides farmers with AI-driven crop recommendations, weather-based guidance, market price insights, and agricultural advisory support. It is designed to assist decision-making in farming through data-driven intelligence and does not replace agricultural experts.

## TECH Stack

- frontend/ is a React + Vite app that runs in the browser and connects to backend APIs to display chatbot responses
- backend/ is a Spring Boot API that handles authentication, AI chat, and database operations, and connects to MySQL using configuration from .env or application.properties.
- MySQL is the database used by the backend to store users, chat history, and application data.
- README.md is the main documentation file that explains project setup, backend connection, and usage steps.
- AI and integrations: Groq LLaMA 3.3, Weather API, Market Price API, Google OAuth, Email OTP placeholders

## Project Structure
```
AI_POWERED_PERSONAL_FARMING_ASSISTANT/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   └── App.js
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── src/main/java/com/farm/assistant/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dto/
│   │   ├── entity/
│   │   ├── repository/
│   │   ├── service/
│   │   └── FarmAssistantApplication.java
│   │
│   ├── src/main/resources/
│   │   └── application.properties
│   │
│   ├── pom.xml
│   └── README.md
│
├── database/
│   └── schema.sql
│
├── docs/
│   ├── er-diagram.md
│   ├── use-case-diagram.md
│   └── activity-diagram.md
│
├── postman/
│   └── farm-assistant.postman_collection.json
│
└── README.md
```

## Port
Frontend:http://localhost:5173

Backend:http://localhost:8080

MySQL:3306 (default)

## Run Backend

```bash
cd backend
mvn spring-boot:run
```

Demo accounts are created automatically when the backend starts:

```text
farmer@example.com / password123
expert@example.com / password123
admin@example.com / password123
```

## AI Chat API Keys

The AI chat works best with a real LLM key. Groq is the easiest option for this project:

```powershell
$env:GROQ_API_KEY="your_groq_key_here"
cd backend
mvn spring-boot:run
```

Optional model override:

```powershell
$env:GROQ_MODEL="llama-3.3-70b-versatile"
```

By default the backend uses an H2 development database so login works immediately. To run with MySQL, start the backend with the `mysql` profile and set environment variables as needed:

```bash
SPRING_PROFILES_ACTIVE=mysql
DB_URL=jdbc:mysql://localhost:3306/farm_assistant
DB_USERNAME=root
DB_PASSWORD=password
JWT_SECRET=change-this-development-secret-change-this-development-secret
GROQ_API_KEY="your-groq-key"
DISEASE_API_KEY="your-openai-key"
MARKET_API_KEY="your-market-key"
```

Swagger UI runs at:

```text
http://localhost:8080/swagger-ui.html
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to:

```text
http://localhost:5173
```

## Database

Run:

```sql
SOURCE database/schema.sql;
```

The schema includes the required tables: users, roles, otp_verification, password_reset, chat_history, crop_recommendations, disease_reports, weather_history, irrigation_records, fertilizer_recommendations, market_prices, government_schemes, knowledge_base, notifications, activity_logs, and managed_records.

## Demo work Flow

1.Start MySQL, backend, and frontend.

2.Open the app in browser (localhost:5173).

3.User login or register.

4.Dashboard page opens.

5.User sees farming modules like crop, weather, market, AI chat.

6.User asks question in AI chat and gets response.

7.System shows crop and weather suggestions.
8.Data is saved in database and user can logout.

## Note:
This project is developed for informational purposes only. It provides general farming guidance using AI and external data sources, but it does not guarantee accuracy or real-world farming results. Users are advised to consult agricultural experts for critical decisions.
