# Deploy Configuration

## Platform
- **Type:** custom (Google Compute Engine)
- **Provider:** GCE
- **Runtime:** Docker Compose
- **Future:** Cloud Run (zero scale) + CI/CD

## Production
- **URL:** https://nextlevelmock.com
- **Health check:** /api/health
- **Port mapping:** 80 (host) → 3000 (container)

## Deploy Command
```bash
# SSH into GCE instance (replace YOUR_INSTANCE_NAME and YOUR_ZONE)
gcloud compute ssh YOUR_INSTANCE_NAME --zone=YOUR_ZONE -- 'cd /path/to/mock-interview-assist && git pull && docker compose up --build -d'
```

## Deploy Steps
1. SSH into GCE via `gcloud compute ssh`
2. `git pull` to fetch latest changes
3. `docker compose up --build -d` to rebuild and restart

## Health Check
```bash
curl -sf https://nextlevelmock.com/api/health
```

## Verify Command
```bash
curl -sf -o /dev/null -w "%{http_code}" https://nextlevelmock.com/api/health
```

## Rollback
```bash
# SSH into GCE instance
gcloud compute ssh YOUR_INSTANCE_NAME --zone=YOUR_ZONE -- 'cd /path/to/mock-interview-assist && git checkout HEAD~1 && docker compose up --build -d'
```

## Notes
- Secrets managed via `.env.docker` on the GCE instance (not in repo)
- Data directory (`./data`) is bind-mounted for persistence
- Container healthcheck: wget to localhost:3000/api/health (30s interval, 15s start period)
- Docker uses multi-stage build with node:22-alpine
- Standalone Next.js output for minimal image size
- **TODO:** Replace `YOUR_INSTANCE_NAME`, `YOUR_ZONE`, and `/path/to/mock-interview-assist` with actual GCE values
