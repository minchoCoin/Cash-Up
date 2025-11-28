# AWS EC2 자동 배포 가이드 (GitHub Actions)

이 문서는 Cash-Up 프로젝트를 GitHub Actions를 사용하여 AWS EC2에 자동으로 배포하는 방법을 설명합니다.

## 목차
1. [AWS EC2 인스턴스 설정](#1-aws-ec2-인스턴스-설정)
2. [EC2 서버 환경 구성](#2-ec2-서버-환경-구성)
3. [GitHub Secrets 설정](#3-github-secrets-설정)
4. [배포 스크립트 작성](#4-배포-스크립트-작성)
5. [GitHub Actions Workflow 작성](#5-github-actions-workflow-작성)
6. [배포 실행 및 확인](#6-배포-실행-및-확인)

---

## 1. AWS EC2 인스턴스 설정

### 1.1 EC2 인스턴스 생성
1. AWS 콘솔에 로그인
2. EC2 대시보드로 이동
3. **인스턴스 시작** 클릭
4. 다음 설정 권장:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **인스턴스 타입**: t3.small 또는 t2.micro (Ultralytics HUB API 사용으로 경량화)
   - **스토리지**: 20GB
   - **보안 그룹**:
     - SSH (22) - 내 IP만 허용
     - HTTP (80) - 0.0.0.0/0
     - HTTPS (443) - 0.0.0.0/0
     - Custom TCP (8000) - 0.0.0.0/0 (FastAPI)
     - Custom TCP (3000) - 0.0.0.0/0 (Node.js, 필요시)

### 1.2 키 페어 다운로드
- 인스턴스 생성 시 새 키 페어 생성 또는 기존 키 페어 사용
- `.pem` 파일을 안전한 곳에 보관
- 파일 권한 설정 (로컬에서):
  ```bash
  chmod 400 your-key.pem
  ```

### 1.3 Elastic IP 할당 (선택사항, 권장)
1. EC2 대시보드 → Elastic IP
2. **Elastic IP 주소 할당**
3. 생성된 IP를 EC2 인스턴스에 연결

---

## 2. EC2 서버 환경 구성

### 2.1 SSH 접속
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 2.2 시스템 업데이트 및 기본 패키지 설치
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl wget build-essential
```

### 2.3 Python 3.11 설치
```bash
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
```

### 2.4 Node.js 설치 (LTS 버전)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.5 Nginx 설치 (리버스 프록시)
```bash
sudo apt install -y nginx
```

### 2.6 PM2 설치 (프로세스 관리)
```bash
sudo npm install -g pm2
```

### 2.7 프로젝트 디렉토리 생성
```bash
sudo mkdir -p /var/www/cash-up
sudo chown -R ubuntu:ubuntu /var/www/cash-up
```

### 2.8 배포용 사용자 SSH 키 설정
GitHub Actions에서 접속할 수 있도록 SSH 키를 생성하거나, 기존 키 페어를 사용합니다.

**옵션 A: 기존 키 페어 사용**
- EC2 생성 시 받은 `.pem` 파일을 GitHub Secrets에 등록

**옵션 B: 새로운 SSH 키 생성 (권장)**
```bash
# EC2 서버에서 실행
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
- `~/.ssh/github_deploy` 내용을 GitHub Secrets에 등록

### 2.9 환경 변수 파일 준비
```bash
cd /var/www/cash-up
nano .env.production
```

다음 내용 추가:
```env
# FastAPI Backend
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_TOKEN=your-secure-admin-token
FESTIVAL_ID=default-festival-id
SECRET_KEY=your-very-long-secret-key-here

# Ultralytics HUB API (YOLO 모델 API 사용)
ULTRALYTICS_API_KEY=your-ultralytics-hub-api-key
# HUB에서 모델 생성 후 받은 API 키를 입력하세요
# https://hub.ultralytics.com 에서 API 키 발급

# Database (SQLite는 기본값, PostgreSQL 사용 시 추가)
# DATABASE_URL=postgresql://user:password@localhost:5432/cashup

# CORS (프론트엔드 도메인)
CORS_ORIGINS=http://your-domain.com,https://your-domain.com
```

---

## 3. GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 Secrets 추가:

| Secret 이름 | 설명 | 예시 |
|------------|------|-----|
| `EC2_HOST` | EC2 인스턴스 퍼블릭 IP 또는 도메인 | `54.123.45.67` |
| `EC2_USER` | SSH 사용자 이름 | `ubuntu` |
| `EC2_SSH_KEY` | SSH 프라이빗 키 전체 내용 | `.pem` 파일 내용 |
| `ENV_PRODUCTION` | 프로덕션 환경 변수 파일 내용 | `.env.production` 내용 (ULTRALYTICS_API_KEY 포함) |

### EC2_SSH_KEY 설정 예시
`.pem` 파일의 전체 내용을 복사하여 붙여넣기:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

---

## 4. 배포 스크립트 작성

### 4.1 서버 배포 스크립트 생성
```bash
nano /var/www/cash-up/deploy.sh
```

다음 내용 작성:
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 변수 설정
APP_DIR="/var/www/cash-up"
BACKEND_DIR="$APP_DIR/server"
FRONTEND_DIR="$APP_DIR"

cd $APP_DIR

# Git pull
echo "📥 Pulling latest code..."
git pull origin main

# Backend 배포
echo "🐍 Setting up Python backend..."
cd $BACKEND_DIR

# Python 가상환경 생성 및 활성화
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi
source venv/bin/activate

# Python 의존성 설치
pip install --upgrade pip
pip install -r requirements.txt

# Ultralytics HUB API 사용으로 로컬 YOLO 모델 파일 불필요
# 환경 변수에 ULTRALYTICS_API_KEY 설정 필요

# FastAPI 재시작
echo "🔄 Restarting FastAPI service..."
pm2 delete cashup-backend || true
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name cashup-backend

# Node.js 백엔드 (Prisma) 설정
cd $BACKEND_DIR
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js backend dependencies..."
    npm install
    npx prisma generate
    npm run build || true
    pm2 delete cashup-node || true
    pm2 start npm --name cashup-node -- start || true
fi

# Frontend 빌드 및 배포
echo "⚛️  Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build

# Nginx 설정 (심볼릭 링크가 없을 경우에만)
if [ ! -L /etc/nginx/sites-enabled/cashup ]; then
    echo "🌐 Setting up Nginx..."
    sudo cp /var/www/cash-up/nginx.conf /etc/nginx/sites-available/cashup
    sudo ln -s /etc/nginx/sites-available/cashup /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
fi

# PM2 저장
pm2 save

echo "✅ Deployment completed successfully!"
```

실행 권한 부여:
```bash
chmod +x /var/www/cash-up/deploy.sh
```

### 4.2 Nginx 설정 파일 생성
```bash
nano /var/www/cash-up/nginx.conf
```

다음 내용 작성:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend (React)
    location / {
        root /var/www/cash-up/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API (FastAPI)
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads (Static files)
    location /uploads {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Node.js backend (if needed)
    location /node-api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. GitHub Actions Workflow 작성

프로젝트 루트에 `.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to AWS EC2

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to EC2
        env:
          EC2_HOST: ${{ secrets.EC2_HOST }}
          EC2_USER: ${{ secrets.EC2_USER }}
        run: |
          ssh -i ~/.ssh/deploy_key $EC2_USER@$EC2_HOST << 'EOF'
            set -e

            # 프로젝트 디렉토리로 이동
            cd /var/www/cash-up

            # 환경 변수 업데이트
            echo "${{ secrets.ENV_PRODUCTION }}" > server/.env

            # 배포 스크립트 실행
            bash deploy.sh
          EOF

      - name: Verify deployment
        run: |
          ssh -i ~/.ssh/deploy_key ${{ secrets.EC2_USER }}@${{ secrets.EC2_HOST }} << 'EOF'
            pm2 status
            curl -f http://localhost:8000/api/health || exit 1
          EOF

      - name: Cleanup
        if: always()
        run: rm -f ~/.ssh/deploy_key

      - name: Send notification
        if: success()
        run: echo "✅ Deployment to EC2 completed successfully!"

      - name: Send failure notification
        if: failure()
        run: echo "❌ Deployment to EC2 failed!"
```

---

## 6. 배포 실행 및 확인

### 6.1 초기 배포 (수동)
처음 한 번은 EC2 서버에서 수동으로 설정:

```bash
# EC2에 SSH 접속
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 프로젝트 클론
cd /var/www
sudo chown -R ubuntu:ubuntu cash-up
git clone https://github.com/YOUR_USERNAME/Cash-Up.git cash-up
cd cash-up

# 배포 스크립트 실행
bash deploy.sh
```

### 6.2 자동 배포 테스트
1. 코드 변경 후 커밋
   ```bash
   git add .
   git commit -m "test: trigger deployment"
   git push origin main
   ```

2. GitHub Actions 탭에서 워크플로우 실행 확인
3. 배포 로그 모니터링

### 6.3 배포 확인
```bash
# 서비스 상태 확인
pm2 status

# 로그 확인
pm2 logs cashup-backend
pm2 logs cashup-node

# API 테스트
curl http://YOUR_EC2_IP/api/health

# 프론트엔드 확인
curl http://YOUR_EC2_IP
```

### 6.4 문제 해결

**포트가 이미 사용 중인 경우:**
```bash
# 포트 사용 확인
sudo lsof -i :8000
sudo lsof -i :3000

# 프로세스 종료
pm2 delete all
pm2 start all
```

**Nginx 오류:**
```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

**Python 의존성 오류:**
```bash
cd /var/www/cash-up/server
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

---

## 7. SSL/HTTPS 설정 (선택사항)

### 7.1 Let's Encrypt 인증서 설치
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 7.2 자동 갱신 설정
```bash
sudo certbot renew --dry-run
```

---

## 8. 모니터링 및 유지보수

### 8.1 PM2 모니터링
```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs

# 재시작
pm2 restart all
```

### 8.2 디스크 공간 관리
```bash
# 디스크 사용량 확인
df -h

# 로그 정리
pm2 flush
sudo journalctl --vacuum-time=7d
```

### 8.3 자동 재시작 설정
```bash
# 시스템 부팅 시 PM2 자동 시작
pm2 startup
pm2 save
```

---

## 9. 보안 권장사항

1. **SSH 키 관리**
   - 프라이빗 키는 절대 코드에 포함하지 않기
   - GitHub Secrets에만 저장

2. **방화벽 설정**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

3. **환경 변수 보안**
   - `.env` 파일은 `.gitignore`에 추가
   - 강력한 SECRET_KEY 사용

4. **정기 업데이트**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 10. 추가 최적화

### 10.1 프론트엔드 캐싱
Nginx 설정에 캐싱 추가:
```nginx
location /assets {
    root /var/www/cash-up/dist;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 10.2 Gzip 압축
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

---

## 문제가 발생했을 때

1. **GitHub Actions 로그 확인**: Actions 탭에서 실패한 단계 확인
2. **EC2 서버 로그 확인**: `pm2 logs`, `sudo tail -f /var/log/nginx/error.log`
3. **서비스 상태 확인**: `pm2 status`, `sudo systemctl status nginx`
4. **수동 배포 테스트**: EC2에 직접 접속해서 `bash deploy.sh` 실행

---

## 참고 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)
- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)