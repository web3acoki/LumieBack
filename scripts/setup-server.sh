#!/bin/bash
set -e

# ============================================================
# LumieClaw Backend - 一键服务器部署脚本
# 适用于全新的 Ubuntu/Debian 服务器
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/web3acoki/LumieBack/main/scripts/setup-server.sh | sudo bash
#   或: chmod +x setup-server.sh && sudo ./setup-server.sh
# ============================================================

REPO_URL="https://github.com/web3acoki/LumieBack.git"
PROJECT_DIR="/opt/lumieclaw"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "=========================================="
echo "  LumieClaw Backend - 一键部署"
echo "=========================================="
echo ""

# ─── 1. 系统更新 & 基础工具 ─────────────────────────────────

echo "[1/9] 更新系统并安装基础工具..."
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

echo "[2/9] 安装 Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker $(docker --version) 安装完成"
else
  echo "Docker 已安装: $(docker --version)"
fi

docker compose version

# ─── 3. 安装 Node.js 22 ─────────────────────────────────────

echo "[3/9] 安装 Node.js 22..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  echo "Node.js $(node -v) 安装完成"
else
  echo "Node.js $(node -v) 已安装"
fi

# ─── 4. 安装 PostgreSQL 客户端 ───────────────────────────────

echo "[4/9] 安装 PostgreSQL 客户端..."
apt-get install -y postgresql-client

# ─── 5. 防火墙配置 ──────────────────────────────────────────

echo "[5/9] 配置防火墙..."
ufw allow OpenSSH
ufw allow 3000/tcp   # NestJS API
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable
echo "防火墙已开放: SSH, 3000, 80, 443"

# ─── 6. 拉取代码 ────────────────────────────────────────────

echo "[6/9] 拉取代码..."
mkdir -p "$PROJECT_DIR"

if [ -d "$BACKEND_DIR" ]; then
  echo "项目目录已存在，拉取最新代码..."
  cd "$BACKEND_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$BACKEND_DIR"
  cd "$BACKEND_DIR"
fi

# ─── 7. 生成 .env 配置 ──────────────────────────────────────

echo "[7/9] 生成环境配置..."

if [ ! -f "$BACKEND_DIR/.env" ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  REFRESH_SECRET=$(openssl rand -hex 32)
  FORGOT_SECRET=$(openssl rand -hex 32)
  CONFIRM_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  cat > "$BACKEND_DIR/.env" << ENVEOF
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

# Mail
MAIL_HOST=localhost
MAIL_PORT=1025
MAIL_USER=
MAIL_PASSWORD=
MAIL_IGNORE_TLS=true
MAIL_SECURE=false
MAIL_REQUIRE_TLS=false
MAIL_DEFAULT_EMAIL=noreply@lumieclaw.com
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
AI_PROXY_API_KEY=your-shenma-api-key-here
AI_PROXY_TIMEOUT=60000
ENVEOF

  chmod 600 "$BACKEND_DIR/.env"
  echo ".env 已生成 (密码: ${DB_PASSWORD})"
else
  echo ".env 已存在，跳过生成"
  # Source existing DB credentials for migration
  DB_PASSWORD=$(grep DATABASE_PASSWORD "$BACKEND_DIR/.env" | cut -d= -f2)
fi

# ─── 8. Docker 构建 & 启动 ──────────────────────────────────

echo "[8/9] 构建并启动 Docker 容器..."
cd "$BACKEND_DIR"

# Start PostgreSQL first
docker compose -f docker-compose.prod.yaml up -d postgres
echo "等待 PostgreSQL 启动..."
sleep 8

# Check PostgreSQL is ready
until docker compose -f docker-compose.prod.yaml exec -T postgres pg_isready -U lumieclaw 2>/dev/null; do
  echo "等待 PostgreSQL..."
  sleep 2
done
echo "PostgreSQL 已就绪"

# ─── 9. 安装依赖 & 迁移 & 启动 API ─────────────────────────

echo "[9/9] 安装依赖、运行迁移、启动 API..."

# Install dependencies for running migrations locally
npm install --legacy-peer-deps

# For migrations, DATABASE_HOST needs to be localhost since we're running from host
export DATABASE_HOST=localhost
npm run build
npm run migration:run
npm run seed:run
unset DATABASE_HOST

# Now build and start the API container
docker compose -f docker-compose.prod.yaml up -d --build

# Wait and verify
sleep 5
API_URL="http://localhost:3000/api"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" 2>/dev/null || echo "000")

echo ""
echo "=========================================="
if [ "$HTTP_CODE" = "200" ]; then
  echo "  部署成功!"
else
  echo "  容器已启动 (API 状态: HTTP $HTTP_CODE)"
  echo "  可能还在初始化中，请稍等片刻"
fi
echo "=========================================="
echo ""
echo "  API 地址:      http://$(hostname -I | awk '{print $1}'):3000/api"
echo "  Swagger 文档:  http://$(hostname -I | awk '{print $1}'):3000/docs"
echo ""
echo "  默认管理员账号:"
echo "    邮箱:   admin@example.com"
echo "    密码:   secret"
echo "    ⚠️  请立即修改默认密码!"
echo ""
echo "  常用命令:"
echo "    查看日志:  cd $BACKEND_DIR && docker compose -f docker-compose.prod.yaml logs -f api"
echo "    重启服务:  cd $BACKEND_DIR && docker compose -f docker-compose.prod.yaml restart api"
echo "    停止服务:  cd $BACKEND_DIR && docker compose -f docker-compose.prod.yaml down"
echo ""
echo "  ⚠️  部署后请编辑 .env 填入你的神马中转站 API Key:"
echo "    nano $BACKEND_DIR/.env"
echo "    然后重启: docker compose -f docker-compose.prod.yaml restart api"
echo ""
echo "=========================================="
