# RepoSwarm UI

RepoSwarm UI is a Next.js dashboard for managing and monitoring the AI-powered multi-repo architecture discovery platform.

## Features

- **Dashboard**: Real-time overview of system status, active workflows, and recent activity
- **Workflows**: Monitor and manage Temporal workflow executions
- **Repositories**: Configure and manage tracked repositories
- **Triggers**: Manually trigger investigations on single or multiple repositories
- **Settings**: View and configure system settings

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with dark theme
- **State Management**: React Query (TanStack Query)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend Integration**: Temporal HTTP API & AWS DynamoDB

## Development

### Prerequisites

- Node.js 22+
- npm or yarn
- Access to Temporal server
- AWS credentials configured

### Environment Variables

Create a `.env.local` file with:

```bash
TEMPORAL_SERVER_URL=http://temporal-alb-internal:8233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=investigate-task-queue
AWS_REGION=us-east-1
DYNAMODB_CACHE_TABLE=reposwarm-cache
CODECOMMIT_ENABLED=true
```

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Docker

Pre-built images are published on every push to `main`:

```bash
docker pull ghcr.io/reposwarm/ui:latest
```

Or build locally:

```bash
docker build -t reposwarm-ui .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e TEMPORAL_SERVER_URL=http://temporal:8233 \
  -e AWS_REGION=us-east-1 \
  -e DYNAMODB_CACHE_TABLE=reposwarm-cache \
  ghcr.io/reposwarm/ui:latest
```

Multi-arch images available: `linux/amd64` and `linux/arm64`.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/workflows` | GET | List workflow executions |
| `/api/workflows/[id]` | GET | Get workflow details |
| `/api/workflows/[id]/terminate` | POST | Terminate workflow |
| `/api/trigger/single` | POST | Trigger single repo investigation |
| `/api/trigger/daily` | POST | Trigger daily investigation |
| `/api/repos` | GET/POST | List/add repositories |
| `/api/repos/[name]` | PATCH/DELETE | Update/delete repository |
| `/api/health` | GET | Health check |
| `/api/config` | GET | Get configuration |

## Project Structure

```
src/
├── app/                  # Next.js app router pages
│   ├── api/             # API routes
│   ├── workflows/       # Workflow pages
│   ├── repos/           # Repository management
│   ├── triggers/        # Manual triggers
│   └── settings/        # Settings page
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   └── ...             # Feature components
├── lib/                # Utilities and clients
│   ├── temporal.ts     # Temporal HTTP client
│   ├── dynamodb.ts     # DynamoDB client
│   └── types.ts        # TypeScript types
└── hooks/              # Custom React hooks
```

## Architecture

The UI communicates with:

1. **Temporal Server HTTP API** (port 8233) - for workflow management
2. **AWS DynamoDB** - for repository configuration and caching
3. **RepoSwarm Workers** - indirectly through Temporal workflows

## License

MIT

## Ecosystem

| Project | Docker Image |
|---------|-------------|
| [reposwarm](https://github.com/reposwarm/reposwarm) (worker) | `ghcr.io/reposwarm/worker:latest` |
| [reposwarm-api](https://github.com/reposwarm/reposwarm-api) | `ghcr.io/reposwarm/api:latest` |
| **reposwarm-ui** (this repo) | `ghcr.io/reposwarm/ui:latest` |
| [reposwarm-cli](https://github.com/reposwarm/reposwarm-cli) | — (binary install) |
| [reposwarm-askbox](https://github.com/reposwarm/reposwarm-askbox) | `ghcr.io/reposwarm/askbox:latest` |

All Docker images are multi-arch (`linux/amd64` + `linux/arm64`), published automatically on every push to `main`.
