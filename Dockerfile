# Production Dockerfile for SunnySeat API
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution file
COPY SunnySeat.sln .

# Copy project files
COPY src/backend/SunnySeat.Api/SunnySeat.Api.csproj src/backend/SunnySeat.Api/
COPY src/backend/SunnySeat.Core/SunnySeat.Core.csproj src/backend/SunnySeat.Core/
COPY src/backend/SunnySeat.Data/SunnySeat.Data.csproj src/backend/SunnySeat.Data/
COPY src/backend/SunnySeat.Shared/SunnySeat.Shared.csproj src/backend/SunnySeat.Shared/

# Restore packages
RUN dotnet restore src/backend/SunnySeat.Api/SunnySeat.Api.csproj

# Copy source code
COPY src/backend/ src/backend/

# Build and publish
WORKDIR /src/src/backend/SunnySeat.Api
RUN dotnet publish SunnySeat.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# Final stage
FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SunnySeat.Api.dll"]
