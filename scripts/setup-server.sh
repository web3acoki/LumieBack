#!/bin/bash
set -e

# ============================================================
# LumieClaw Backend - Linux Server Setup Script
# 适用于全新的 Ubuntu/Debian 服务器
# 使用方法: chmod +x setup.sh && sudo ./setup.sh
# ============================================================

echo "=========================================="
echo "  LumieClaw Backend Server Setup"
echo "=========================================="

# ─── 1. 系统更新 & 基础工具 ─────────────────────────────────

echo "[1/7] Updating system packages..."
apt-get update && apt-get upgrade -y
apt-get install -y \
  curl \
  wget \
  git \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  ufw

# ─── 2. 安装 Docker & Docker Compose ────────────────────────

echo "[2/7] Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed successfully."
else
  echo "Docker already installed, skipping."
fi

# Docker Compose is included with modern Docker (docker compose v2)
docker compose version

# ─── 3. 安装 Node.js 22 (用于本地构建和迁移) ────────────────

echo "[3/7] Installing Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  echo "Node.js $(node -v) installed."
else
  echo "Node.js $(node -v) already installed, skipping."
fi

# ─── 4. 安装 PostgreSQL 客户端 (用于调试) ────────────────────

echo "[4/7] Installing PostgreSQL client..."
apt-get install -y postgresql-client

# ─── 5. 防火墙配置 ──────────────────────────────────────────

echo "[5/7] Configuring firewall..."
ufw allow OpenSSH
ufw allow 3000/tcp   # NestJS API
ufw allow 80/tcp     # HTTP (for reverse proxy later)
ufw allow 443/tcp    # HTTPS
ufw --force enable
echo "Firewall configured: SSH, 3000, 80, 443 open."

# ─── 6. 创建项目目录 ────────────────────────────────────────

echo "[6/7] Creating project directory..."
PROJECT_DIR="/opt/lumieclaw"
mkdir -p "$PROJECT_DIR"
echo "Project directory: $PROJECT_DIR"

# ─── 7. 生成 .env 模板 ──────────────────────────────────────

echo "[7/7] Generating .env template..."
ENV_FILE="$PROJECT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  # Generate random secrets
  JWT_SECRET=$(openssl rand -hex 32)
  REFRESH_SECRET=$(openssl rand -hex 32)
  FORGOT_SECRET=$(openssl rand -hex 32)
  CONFIRM_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  cat > "$ENV_FILE" << EOF
# ============================================================
# LumieClaw Backend - Production Environment
# Generated on $(date)
# ============================================================

NODE_ENV=production
APP_PORT=3000
APP_NAME="LumieClaw API"
API_PREFIX=api
APP_FALLBACK_LANGUAGE=en
APP_HEADER_LANGUAGE=x-custom-lang
FRONTEND_DOMAIN=https://your-domain.com
BACKEND_DOMAIN=https://api.your-domain.com

# Database (PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=lumieclaw
DATABASE_PASSWORD=${DB_PASSWORD}
DATABASE_NAME=lumieclaw
DATABASE_SYNCHRONIZE=false
DATABASE_MAX_CONNECTIONS=100
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=false

# File Storage
FILE_DRIVER=local

# Mail (配置你的SMTP)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=false
MAIL_SECURE=false
MAIL_REQUIRE_TLS=true
MAIL_DEFAULT_EMAIL=noreply@your-domain.com
MAIL_DEFAULT_NAME=LumieClaw
MAIL_CLIENT_PORT=1080

# Authentication (auto-generated secrets)
AUTH_JWT_SECRET=${JWT_SECRET}
AUTH_JWT_TOKEN_EXPIRES_IN=15m
AUTH_REFRESH_SECRET=${REFRESH_SECRET}
AUTH_REFRESH_TOKEN_EXPIRES_IN=3650d
AUTH_FORGOT_SECRET=${FORGOT_SECRET}
AUTH_FORGOT_TOKEN_EXPIRES_IN=30m
AUTH_CONFIRM_EMAIL_SECRET=${CONFIRM_SECRET}
AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d

# Social Auth (optional)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_APP_AUDIENCE=[]

# AI Proxy (神马中转站)
AI_PROXY_BASE_URL=https://api.whatai.cc/v1
AI_PROXY_API_KEY=your-shenma-api-key
AI_PROXY_TIMEOUT=60000
EOF

  chmod 600 "$ENV_FILE"
  echo ""
  echo "=========================================="
  echo "  .env file created at: $ENV_FILE"
  echo "  DB Password: ${DB_PASSWORD}"
  echo "  IMPORTANT: Edit this file to fill in:"
  echo "    - FRONTEND_DOMAIN / BACKEND_DOMAIN"
  echo "    - MAIL settings"
  echo "    - AI_PROXY_API_KEY (神马中转站 key)"
  echo "    - Social auth keys (optional)"
  echo "=========================================="
else
  echo ".env already exists, skipping."
fi

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "  1. Clone your project:"
echo "     cd $PROJECT_DIR"
echo "     git clone <your-repo-url> backend"
echo ""
echo "  2. Edit the .env file:"
echo "     nano $PROJECT_DIR/.env"
echo ""
echo "  3. Copy .env to project and start:"
echo "     cp $PROJECT_DIR/.env $PROJECT_DIR/backend/.env"
echo "     cd $PROJECT_DIR/backend"
echo "     docker compose up -d postgres"
echo ""
echo "  4. Install deps & run migrations:"
echo "     npm install"
echo "     npm run build"
echo "     npm run migration:run"
echo "     npm run seed:run"
echo ""
echo "  5. Start the app:"
echo "     npm run start:prod"
echo "     # Or with PM2:"
echo "     npm run pm2:start"
echo ""
echo "=========================================="
