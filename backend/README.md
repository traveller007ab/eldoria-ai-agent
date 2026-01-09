# Eldoria AI Platform - Backend

Production-grade backend for the Eldoria AI Platform.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- `GEMINI_API_KEY` - For Google Gemini AI
- `GROQ_API_KEY` - For Groq Llama models

### 3. Setup Database

Make sure PostgreSQL is running, then run migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3001`

### 5. Test the API

```bash
# Register a new user
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Create a project (use the token from login)
curl -X POST http://localhost:3001/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "My First Project", "type": "code"}'
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### AI Chat
- `POST /api/v1/ai/chat` - Send message to AI
- `POST /api/v1/ai/stream` - Stream AI response

### Chat Sessions
- `GET /api/v1/chat` - List chat sessions
- `POST /api/v1/chat` - Create chat session
- `GET /api/v1/chat/:id` - Get chat with messages

### User
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for JWT tokens | Yes |
| GEMINI_API_KEY | Google Gemini API key | No |
| GROQ_API_KEY | Groq API key for Llama models | No |
| REDIS_URL | Redis connection string | No |
| PORT | Server port (default: 3001) | No |

## Features Implemented

✅ JWT Authentication with refresh tokens
✅ Project CRUD operations
✅ AI Chat with Gemini and Groq support
✅ Chat session management
✅ User profile management
✅ Real-time WebSocket support
✅ Prometheus metrics
✅ Winston logging
✅ Error handling middleware
✅ Rate limiting
✅ CORS configuration

## Project Structure

```
backend/
├── src/
│   ├── api/v1/routes/     # API route handlers
│   ├── controllers/       # Business logic
│   ├── middleware/        # Express middleware
│   ├── services/ai/       # AI services
│   ├── utils/             # Utilities
│   ├── monitoring/        # Metrics
│   ├── websocket/         # WebSocket handlers
│   └── config/            # Configuration
├── prisma/
│   └── schema.prisma      # Database schema
└── tests/                 # Test files
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Run linter
npm run lint
```

## Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

## License

MIT