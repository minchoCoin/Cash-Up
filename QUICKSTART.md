# AWS EC2 배포 빠른 시작 가이드

이 가이드는 Cash-Up을 AWS EC2에 배포하기 위한 핵심 단계만 요약한 문서입니다.
자세한 내용은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참고하세요.

## 📋 체크리스트

### 0단계: Ultralytics HUB API 준비 ✅

- [ ] [Ultralytics HUB](https://hub.ultralytics.com) 계정 생성
- [ ] API 키 발급
- [ ] 자세한 내용은 [ULTRALYTICS_HUB_SETUP.md](./ULTRALYTICS_HUB_SETUP.md) 참고

### 1단계: AWS EC2 준비 ✅

- [ ] EC2 인스턴스 생성 (Ubuntu 22.04, **t3.small** 또는 **t2.micro**면 충분)
- [ ] 보안 그룹 설정 (22, 80, 443, 8000 포트 오픈)
- [ ] SSH 키 페어 다운로드
- [ ] Elastic IP 할당 (선택사항)

### 2단계: EC2 서버 초기 설정 ✅

SSH로 EC2 접속:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

아래 스크립트 한 번에 실행:
```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y git curl wget build-essential software-properties-common

# Python 3.11 설치
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx 설치
sudo apt install -y nginx

# PM2 설치
sudo npm install -g pm2

# 프로젝트 디렉토리 생성
sudo mkdir -p /var/www/cash-up
sudo chown -R ubuntu:ubuntu /var/www/cash-up

# 프로젝트 클론
cd /var/www
git clone https://github.com/YOUR_USERNAME/Cash-Up.git cash-up
cd cash-up
```

### 3단계: 환경 변수 설정 ✅

```bash
cd /var/www/cash-up
cp .env.example server/.env
nano server/.env
```

필수 환경 변수 설정:
```env
ADMIN_PASSWORD=your-secure-password
ADMIN_TOKEN=your-secure-token
SECRET_KEY=your-very-long-secret-key-here
FESTIVAL_ID=default-festival-id

# Ultralytics HUB API 설정 (필수!)
ULTRALYTICS_API_KEY=api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
YOLO_MODEL_ID=yolov8n
```

### 4단계: Nginx 설정 ✅

```bash
# nginx.conf 파일에서 도메인/IP 수정
nano /var/www/cash-up/nginx.conf
# YOUR_DOMAIN_OR_IP를 실제 값으로 변경

# Nginx 설정 적용
sudo cp /var/www/cash-up/nginx.conf /etc/nginx/sites-available/cashup
sudo ln -s /etc/nginx/sites-available/cashup /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5단계: 초기 배포 ✅

```bash
cd /var/www/cash-up
chmod +x deploy.sh
bash deploy.sh
```

배포 확인:
```bash
# 서비스 상태 확인
pm2 status

# API 테스트
curl http://localhost:8000/api/health

# 프론트엔드 접속
# 브라우저에서 http://YOUR_EC2_IP 접속
```

### 6단계: GitHub Secrets 설정 ✅

GitHub 저장소 → Settings → Secrets and variables → Actions

| Secret 이름 | 값 |
|------------|---|
| `EC2_HOST` | EC2 퍼블릭 IP (예: 54.123.45.67) |
| `EC2_USER` | ubuntu |
| `EC2_SSH_KEY` | .pem 파일 전체 내용 복사 |
| `ENV_PRODUCTION` | server/.env 파일 전체 내용 복사 |

### 7단계: 자동 배포 테스트 ✅

```bash
# 로컬에서 실행
git add .
git commit -m "test: trigger auto deployment"
git push origin main
```

GitHub Actions 탭에서 배포 진행 상황 확인

---

## 🔧 자주 사용하는 명령어

### 서비스 관리
```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 서비스 재시작
pm2 restart all

# 서비스 중지
pm2 stop all
```

### Nginx 관리
```bash
# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl restart nginx

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 배포
```bash
# 수동 배포
cd /var/www/cash-up
bash deploy.sh

# Git 업데이트만
cd /var/www/cash-up
git pull origin main
```

---

## 🚨 문제 해결

### 포트가 이미 사용 중
```bash
sudo lsof -i :8000
pm2 delete all
pm2 start all
```

### 권한 오류
```bash
sudo chown -R ubuntu:ubuntu /var/www/cash-up
chmod +x /var/www/cash-up/deploy.sh
```

### Python 의존성 오류
```bash
cd /var/www/cash-up/server
source venv/bin/activate
pip install --upgrade -r requirements.txt
```

### Nginx 502 Bad Gateway
```bash
# 백엔드 서비스 확인
pm2 status
pm2 logs cashup-backend

# 포트 확인
curl http://localhost:8000/api/health
```

---

## 📊 시스템 요구사항

| 항목 | 최소 | 권장 |
|-----|------|------|
| 인스턴스 타입 | t2.micro | t3.small |
| vCPU | 1 | 2 |
| 메모리 | 1GB | 2GB |
| 스토리지 | 15GB | 20GB |

**참고**: Ultralytics HUB API 사용으로 GPU나 고성능 CPU가 필요하지 않습니다.

---

## 🔐 보안 설정

```bash
# 방화벽 설정
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 시스템 자동 업데이트
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 📚 다음 단계

1. **SSL 인증서 설정** (HTTPS)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. **모니터링 설정**
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

3. **자동 재시작 설정**
   ```bash
   pm2 startup
   pm2 save
   ```

---

## 📞 도움이 필요하신가요?

- 📖 [전체 배포 가이드](./DEPLOYMENT.md)
- 🐛 문제 발생 시 GitHub Issues에 등록해주세요

---

## ✅ 배포 완료 확인

- [ ] http://YOUR_EC2_IP 접속 시 프론트엔드 표시
- [ ] http://YOUR_EC2_IP/api/health 접속 시 `{"ok": true}` 응답
- [ ] GitHub push 시 자동 배포 작동
- [ ] PM2 프로세스 정상 실행 (`pm2 status`)
- [ ] Nginx 정상 작동 (`sudo systemctl status nginx`)

모든 항목이 체크되었다면 배포 완료입니다! 🎉