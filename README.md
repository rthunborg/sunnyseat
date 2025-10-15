# SunnySeat

[![Build and Test](https://github.com/your-org/sunnyseat/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/your-org/sunnyseat/actions/workflows/build-and-test.yml)
[![Deploy to Staging](https://github.com/your-org/sunnyseat/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/your-org/sunnyseat/actions/workflows/deploy-staging.yml)

**SunnySeat** is an intelligent venue management and seat selection platform that helps users find optimal seating based on real-time sun exposure, weather conditions, and venue characteristics.

## 🚀 Quick Start

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for local development with PostgreSQL + PostGIS and Redis)
- [Node.js 20+](https://nodejs.org/) (for frontend development)
- [PostgreSQL 15](https://www.postgresql.org/download/) with [PostGIS 3.4](https://postgis.net/) (if not using Docker)

### Running Locally

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/sunnyseat.git
   cd sunnyseat
   ```

2. **Start infrastructure services**

   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Run database migrations**

   ```bash
   dotnet ef database update --project src/backend/SunnySeat.Data --startup-project src/backend/SunnySeat.Api
   ```

4. **Start the API**

   ```bash
   cd src/backend/SunnySeat.Api
   dotnet run
   ```

   API will be available at `http://localhost:5000`

5. **Start the frontend** (optional)
   ```bash
   cd src/frontend/admin
   npm install
   npm run dev
   ```
   Admin portal will be available at `http://localhost:3000`

### Running Tests

```bash
# Run all tests
dotnet test

# Run unit tests only
dotnet test --filter "Category=Unit"

# Run integration tests only
dotnet test --filter "Category=Integration"

# Run with code coverage
dotnet test --collect:"XPlat Code Coverage"
```

## 🏗️ Technology Stack

### Backend

- **.NET 8** - Web API framework
- **ASP.NET Core** - RESTful API
- **Entity Framework Core** - ORM
- **PostgreSQL 15** - Primary database
- **PostGIS 3.4** - Geospatial data extension
- **Redis 7** - Caching layer
- **MediatR** - CQRS pattern implementation
- **FluentValidation** - Request validation

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS framework

### Infrastructure

- **GitHub Actions** - CI/CD pipeline
- **Azure Container Apps** - Application hosting
- **Azure Database for PostgreSQL** - Managed database
- **Azure Cache for Redis** - Managed cache
- **Docker** - Containerization

## 📁 Project Structure

```
SunnySeat/
├── .github/workflows/       # CI/CD pipeline definitions
├── src/
│   ├── backend/
│   │   ├── SunnySeat.Api/          # Web API entry point
│   │   ├── SunnySeat.Core/         # Domain models & business logic
│   │   ├── SunnySeat.Data/         # Data access layer
│   │   └── SunnySeat.Shared/       # Shared utilities
│   └── frontend/
│       └── admin/                   # Admin portal (React)
├── tests/
│   └── SunnySeat.Integration.Tests/ # Integration test suite
├── SunnySeat.Docs/          # Documentation
└── docker-compose.dev.yml   # Local development services
```

## 📚 Documentation

- **[Development Guide](SunnySeat.Docs/README-Development.md)** - Setup and development workflow
- **[Architecture](SunnySeat.Docs/docs/architecture.md)** - System design and architecture decisions
- **[Product Requirements](SunnySeat.Docs/docs/prd.md)** - Product vision and requirements
- **[CI/CD Guide](SunnySeat.Docs/docs/ops/ci-cd-guide.md)** - Pipeline architecture and usage
- **[Troubleshooting](SunnySeat.Docs/docs/ops/ci-cd-troubleshooting.md)** - Common issues and solutions
- **[Quick Start Guide](SunnySeat.Docs/docs/QUICK-START-GUIDE.md)** - Getting started

## 🔄 CI/CD Pipeline

Our automated pipeline runs on every push and pull request:

- **Build & Test** - Compiles solution, runs all tests, validates code quality
- **Security Scan** - Checks for vulnerable dependencies
- **Code Quality** - Enforces code standards with static analysis
- **Deploy to Staging** - Auto-deploys `main` branch to staging environment
- **Deploy to Production** - Manual approval workflow for production releases
- **Lighthouse CI** - Frontend performance monitoring

See [CI/CD Guide](SunnySeat.Docs/docs/ops/ci-cd-guide.md) for detailed pipeline documentation.

## 🧪 Testing Strategy

- **Unit Tests** - Fast, isolated tests with no external dependencies
- **Integration Tests** - Test database interactions, API endpoints, and service integrations
- **Architecture Tests** - Validate project structure and enforce layering rules
- **Code Coverage Target** - Maintain >80% code coverage

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass locally
4. Push your branch and create a pull request
5. Wait for CI/CD pipeline to pass
6. Request code review

## 📝 License

[Add your license information here]

## 👥 Team

- **Product Owner** - [Name]
- **Tech Lead** - [Name]
- **Development Team** - [Names]

## 🔗 Links

- [Production Environment](https://sunnyseat.azurewebsites.net)
- [Staging Environment](https://sunnyseat-staging.azurewebsites.net)
- [API Documentation](https://sunnyseat.azurewebsites.net/swagger)
- [Project Board](https://github.com/your-org/sunnyseat/projects)

---

**Built with ☀️ by the SunnySeat Team**
