# Tournaments Repository

A self-hosted tournament management platform for managing and broadcasting sports tournaments in real-time. Supports multiple sports (football, basketball, volleyball, beach volleyball, tennis, padel) and formats (Round Robin, Single/Double Elimination, Champions League).

## Installation

### Option 1: Docker (Recommended)

Prerequisites: [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.

```bash
# Start the application (PostgreSQL + Next.js)
docker-compose up -d

# The app will be available at http://localhost:3000
```

The database will be accessible on port 5432 (if needed for external tools).

### Option 2: Local Development

Prerequisites: [Node.js](https://nodejs.org/) (v18+), [npm](https://www.npmjs.com/), and [PostgreSQL](https://www.postgresql.org/) (v15+).

1. **Start the database** (or use Docker for this):
   ```bash
   docker run -d --name tournament-db \
     -e POSTGRES_USER=admin \
     -e POSTGRES_PASSWORD=password123 \
     -e POSTGRES_DB=tournament_db \
     -p 5432:5432 \
     postgres:15-alpine
   ```

2. **Install dependencies**:
   ```bash
   cd web
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   # Or manually create .env with:
   # DATABASE_URL=postgresql://admin:password123@localhost:5432/tournament_db?schema=public
   # NEXTAUTH_SECRET=supersecret123
   # NEXTAUTH_URL=http://localhost:3000
   # PORT=3000
   ```

4. **Push the database schema** (Prisma):
   ```bash
   npx prisma db push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000.

## First Login

On first launch, the app auto-creates a default `admin` user. Use any password to log in and start creating tournaments.

## Usage

- **Admin Panel**: Visit `/admin` to manage tournaments, teams, and matches
- **Public View**: Visit `/tournament/[id]` to view a tournament's bracket and live scores
- **Live Scoring**: Use `/admin/matches/[matchId]/live` to input scores in real-time (broadcast via Socket.IO)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Node.js custom server with Socket.IO for real-time updates
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js (credentials provider)
- **Testing**: Vitest
