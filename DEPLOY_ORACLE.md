# Oracle Cloud Free Tier 배포 가이드

## 1단계: Oracle Cloud 계정 생성

1. https://cloud.oracle.com/ 접속
2. **Sign Up** 클릭
3. 입력 정보:
   - 이메일, 이름
   - **Home Region**: `South Korea Central (Seoul)` 선택 (가장 빠름)
   - 카드 등록 (무료 티어는 과금 안 됨, 인증용)
4. 계정 활성화 이메일 확인 (몇 분 소요)

---

## 2단계: 무료 인스턴스 생성

1. Oracle Cloud 콘솔 로그인: https://cloud.oracle.com/
2. 왼쪽 메뉴 → **Compute** → **Instances** → **Create instance**
3. 설정:
   - **Name**: `tiktok-tools`
   - **Image**: `Ubuntu 22.04` (Canonical Ubuntu)
   - **Shape**: `VM.Standard.A1.Flex` (ARM) → **무료 티어**
     - OCPU: `2` (최대 4까지 무료)
     - Memory: `12GB` (최대 24GB까지 무료)
   - **Networking**: 기본 VCN 자동 생성
   - **SSH Key**: `Generate a key pair` → **Private key 다운로드 (꼭 저장!)**
4. **Create** 클릭

> 인스턴스 생성 시 "Out of capacity" 에러가 나면 리전/Shape을 바꾸거나 시간대를 바꿔서 재시도

---

## 3단계: 서버 접속 및 환경 설정

```bash
# SSH 접속 (다운받은 키 사용)
chmod 400 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<서버 공인 IP>
```

### 서버에서 실행:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# yt-dlp 설치
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# ffmpeg 설치 (영상 다운로드용)
sudo apt install -y ffmpeg

# git 설치
sudo apt install -y git
```

---

## 4단계: 프로젝트 배포

```bash
# 프로젝트 클론
git clone https://github.com/gaebaribari/tiktok-tools.git
cd tiktok-tools

# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 서버 실행 (백그라운드 + 자동 재시작)
sudo npm install -g pm2
pm2 start npm --name "tiktok-tools" -- start -- -p 3200
pm2 save
pm2 startup  # 서버 재부팅 시 자동 실행
```

---

## 5단계: 포트 열기

### Oracle Cloud 콘솔에서:
1. **Networking** → **Virtual Cloud Networks** → 기본 VCN 클릭
2. **Security Lists** → 기본 Security List 클릭
3. **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port Range: `3200`
   - Description: `TikTok Tools`

### 서버 방화벽에서:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3200 -j ACCEPT
sudo netfilter-persistent save
```

---

## 6단계: 접속 확인

```
http://<서버 공인 IP>:3200
```

---

## (선택) 도메인 연결 + HTTPS

무료 도메인 + SSL이 필요하면:
```bash
# Nginx 설치
sudo apt install -y nginx

# Certbot (무료 SSL)
sudo apt install -y certbot python3-certbot-nginx
```

Nginx 리버스 프록시 설정 후 `certbot`으로 HTTPS 적용 가능.

---

## 업데이트 방법

```bash
cd ~/tiktok-tools
git pull
npm install
npm run build
pm2 restart tiktok-tools
```

---

## 요약

| 항목 | 내용 |
|------|------|
| 서비스 | Oracle Cloud Free Tier |
| 비용 | 무료 |
| 리전 | Seoul |
| OS | Ubuntu 22.04 (ARM) |
| Node.js | 20.x |
| 프로세스 관리 | PM2 |
| 포트 | 3200 |
