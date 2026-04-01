#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Receipts Storage production deployment
# Usage:
#   First deploy:  ./deploy.sh setup
#   Updates:       ./deploy.sh update
#   Logs:          ./deploy.sh logs [service]
#   Status:        ./deploy.sh status
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}▶${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*"; }
error() { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── Checks ───────────────────────────────────────────────────────────────────
check_env() {
  [[ -f .env ]] || error ".env not found. Copy .env.example → .env and fill it in."
  source .env
  [[ -z "${DB_PASSWORD:-}"  ]] && error "DB_PASSWORD is empty in .env"
  [[ -z "${JWT_SECRET:-}"   ]] && error "JWT_SECRET is empty in .env"
  [[ "${JWT_SECRET}" == *"change"* ]] && error "JWT_SECRET still has default value — generate a real one"
  [[ "${DB_PASSWORD}" == *"change"* ]] && error "DB_PASSWORD still has default value — set a strong password"
  info "Environment OK"
}

# ── Setup (first deploy) ─────────────────────────────────────────────────────
cmd_setup() {
  check_env

  # Create upload directory
  info "Creating upload directory..."
  sudo mkdir -p /var/receipts/uploads
  sudo chown -R 1000:1000 /var/receipts/uploads

  # Ensure the shared Traefik network exists
  docker network inspect web >/dev/null 2>&1 || docker network create web

  info "Building images (no cache)..."
  $COMPOSE build --no-cache

  info "Starting services..."
  $COMPOSE up -d

  info "Waiting for services to be healthy..."
  sleep 10
  $COMPOSE ps

  info "Setup complete!"
  info "App available at: http://<server-ip>/receipts-app/"
  info "Check status: ./deploy.sh status"
  info "View logs:    ./deploy.sh logs"
}

# ── Update (subsequent deploys) ──────────────────────────────────────────────
cmd_update() {
  check_env

  info "Pulling latest code..."
  git pull --ff-only

  info "Building updated images..."
  $COMPOSE build

  info "Restarting services..."
  $COMPOSE up -d --no-deps receipts-api receipts-frontend

  info "Waiting for services..."
  sleep 5
  $COMPOSE ps

  info "Update complete!"
}

# ── Logs ─────────────────────────────────────────────────────────────────────
cmd_logs() {
  $COMPOSE logs -f --tail=100 "${1:-}"
}

# ── Status ───────────────────────────────────────────────────────────────────
cmd_status() {
  $COMPOSE ps
}

# ── Stop / Down ──────────────────────────────────────────────────────────────
cmd_stop() { $COMPOSE stop; }
cmd_down() {
  warn "This will remove containers (volumes preserved)."
  read -rp "Continue? [y/N] " confirm
  [[ "${confirm:-n}" =~ ^[Yy]$ ]] && $COMPOSE down || info "Aborted."
}

# ── Backup database ─────────────────────────────────────────────────────────
cmd_backup() {
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="backup_receipts_${timestamp}.sql"

  info "Backing up database to ${backup_file}..."
  $COMPOSE exec -T receipts-db pg_dump -U receipts_user receipts > "${backup_file}"
  info "Backup saved: ${backup_file}"
}

# ── Dispatch ─────────────────────────────────────────────────────────────────
case "${1:-help}" in
  setup)  cmd_setup  ;;
  update) cmd_update ;;
  logs)   cmd_logs   "${2:-}" ;;
  status) cmd_status ;;
  stop)   cmd_stop   ;;
  down)   cmd_down   ;;
  backup) cmd_backup ;;
  *)
    echo "Receipts Storage — Deploy Script"
    echo ""
    echo "Usage: ./deploy.sh <command>"
    echo ""
    echo "Commands:"
    echo "  setup     First-time deploy: build, start, configure"
    echo "  update    Pull latest code, rebuild, and restart"
    echo "  logs      Tail logs (optional: service name)"
    echo "  status    Show container status"
    echo "  stop      Stop all containers (data preserved)"
    echo "  down      Remove containers (data preserved)"
    echo "  backup    Dump PostgreSQL database to file"
    ;;
esac
