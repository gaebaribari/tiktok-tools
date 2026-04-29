# TikTok Tools 개발 일정

## 프로젝트 개요
TikTok 크리에이터 채널 정보를 일괄 조회하고, 영상 다운로드 및 이메일 추출까지 지원하는 웹 도구. 인플루언서 마케팅/크리에이터 발굴용.

**스택**: Next.js 16 (App Router) · TypeScript · Tailwind · yt-dlp · PM2 · Oracle Cloud

---

## 개발 타임라인

### 4/8
- [x] 크리에이터 조회 속도 개선
  - 동시 처리: 1개 → 3개
  - 차단 방지 대기: 3-5초 → 1-2초
  - 10명 기준 70초 → 25초로 단축
- [x] UI 개선 — 개발 로그 영역 제거, 깔끔한 조회 화면

### 4/9
- [x] 이메일 추출 기능 (bio에서 정규식으로 파싱)
- [x] 프로필 상세 필드 추가 (팔로잉 수, 좋아요 합계, 영상 수, 인증 배지)
- [x] 내보내기 버튼 (닉네임 / 아이디 / 주소 / 이메일 탭 구분 클립보드 복사)

### 4/11
- [x] Oracle Cloud Free Tier VPS 생성 (AMD E2.1.Micro, Ubuntu 22.04)
- [x] 서버 환경 구축 (Node.js 20, yt-dlp, ffmpeg, PM2)
- [x] 방화벽 설정 (iptables 규칙 순서 조정, Oracle VCN Security List)
- [x] Swap 4GB 추가 (1GB RAM 환경 빌드 OOM 해결)

### 4/13
- [x] yt-dlp impersonation 적용 (curl-cffi) → TikTok 차단 감소
- [x] Research API 자격 요건 조사 → 포기 결정

### 4/26
- [x] 영상 썸네일을 TikTok 피드와 일치시킴 (`originCover` → `cover` 우선)
- [x] 크리에이터 카드에 이메일 표시 (`mailto:` 링크, bio에서 자동 추출된 값)
- [x] 비공개 계정 / 컨텐츠 없음 상태 분기 표시
  - `CreatorProfile.privateAccount` 필드 추가 (`user.privateAccount` 또는 `user.secret`)
  - 카드 영상 영역: 비공개 → "🔒 비공개 계정", `videoCount === 0` → "컨텐츠 없음"
- [x] yt-dlp 쿠키 옵션 환경변수 지원
  - `TIKTOK_COOKIES_FILE` (Netscape cookies.txt 경로) 또는 `TIKTOK_COOKIES_BROWSER` (chrome/firefox/safari/edge/brave)
  - 로그인 세션 사용 시 차단율 감소
- [x] Python HTML fetcher 데몬화 (프로세스 풀)
  - 기존: 크리에이터 1명마다 Python 인터프리터 새로 spawn (시동 ~300ms × N)
  - 변경: `scripts/fetch_tiktok_html.py --daemon` 모드 추가, NDJSON 프로토콜로 stdin 요청 → stdout 응답
  - Node 측 `lib/htmlDaemon.ts`에서 풀(기본 3개) 관리, `globalThis` 캐싱으로 hot-reload 안전
  - 풀 크기: `TIKTOK_DAEMON_POOL` 환경변수로 조정 가능

---

## 진행중
- [ ] 배포 서버에 최신 코드 반영 (썸네일 우선순위, 이메일 표시, 비공개/컨텐츠 없음 분기, 쿠키 옵션, HTML fetcher 데몬 풀)

---

## 예정

### TTCM 하이브리드 (3-5주 예상)
크롤링 차단 위험 감소를 위한 TikTok Creator Marketplace API 통합. TTCM 등록 크리에이터는 공식 API로 먼저 조회하고, 없으면 크롤링 fallback.
- [ ] 사업자등록 + TikTok For Business 가입
- [ ] TTCM API 접근 신청 (심사 1-2주)
- [ ] 하이브리드 로직 구현
- 상세: [TODO_TTCM.md](TODO_TTCM.md)

### 장기 고려
- [ ] ARM 인스턴스 전환 (AMD → A1.Flex, 4코어 24GB, 자리 나면)
- [ ] 도메인 연결 + HTTPS (Certbot)
- [ ] yt-dlp 자동 업데이트 크론

---

## 주요 기술 결정

### 1. 배포 플랫폼 전환 (Vercel → Oracle Cloud)
- **문제**: 초기에 Vercel에 배포 → `yt-dlp` 바이너리가 serverless 환경에서 실행 불가 → 영상 썸네일/날짜 수집 실패
- **시도**: TikTok HTML의 `__UNIVERSAL_DATA_FOR_REHYDRATION__` 스크립트에서 `itemList` 추출 시도 → 서버 렌더링 HTML에 영상 목록이 없음을 확인
- **결정**: Oracle Cloud Free Tier VPS로 전환. `yt-dlp` 바이너리 실행 가능한 환경 확보.
- **배움**: serverless의 실행 환경 제약, VPS와의 trade-off (인프라 관리 비용 vs 실행 자유도)

### 2. yt-dlp 차단 회피 (HTTP Impersonation)
- **문제**: 일부 프로필에서 `yt-dlp`가 썸네일/영상 목록을 가져오지 못함 (약 30~40% 실패율)
- **원인 분석**: `yt-dlp --verbose` 로그에서 `curl_cffi-0.15.0 (unsupported)` 메시지 확인. yt-dlp가 브라우저 impersonation을 사용하지 못해 TikTok이 요청을 봇으로 탐지 후 차단.
- **해결**:
  - `curl-cffi` 호환 버전(`<0.13`) 설치
  - `yt-dlp --impersonate chrome` 옵션 추가
  - 재시도 로직 + 랜덤 대기 추가
- **배움**: TLS/HTTP2 핑거프린팅 기반 봇 탐지 메커니즘. User-Agent 로테이션만으로는 불충분하며 TLS 레벨에서도 실제 브라우저처럼 동작해야 함.

### 3. Next.js 빌드 OOM 해결 (Swap)
- **문제**: 1GB RAM인 AMD E2.1.Micro에서 `next build` 실행 시 프로세스 강제 종료 + SSH 접속 불가 상태로 서버 hang
- **해결**: Oracle 콘솔에서 force reboot 후 `/swapfile` 4GB 생성, `/etc/fstab`에 등록
- **배움**: 저사양 VPS에서 Next.js SWC 빌드의 메모리 요구량, swap이 OOM killer 대신 디스크 I/O 성능 저하로 완화되는 원리

### 4. TikTok 공식 API 포기 결정
- **조사**: Research API는 학술/비영리 목적 한정 (한국 지역 + 상업 목적 = 자격 미달). Login Kit은 본인 계정만 조회 가능. Business API는 사업자 인증 + TTCM 등록 크리에이터만 커버.
- **결정**: 단기는 크롤링 안정화에 집중, 중장기는 TTCM 하이브리드 검토
- **배움**: API 공급자의 정책 분석과 trade-off 판단 (개발 자유도 vs 안정성 vs 비용 vs 심사 기간)

### 5. 크롤링 vs 유료 API vs 자체 프록시 분석
- **선택지 비교**:
  - 크롤링 (무료, 막힐 위험)
  - RapidAPI TikTok Scraper (월 $10~25, 안정적)
  - 자체 프록시 풀 구축 (월 $50~, 개발 비용)
- **결론**: 현재 규모에서는 무료 크롤링 + 차단 완화 패치로 충분. 월 요청 10만 건 이상으로 커지면 재평가.
- **배움**: build vs buy 의사결정 — 기술적으로 가능한 것과 경제적으로 합리적인 것의 구분

### 6. Python HTML fetcher 데몬 풀 전환
- **문제**: 크리에이터 한 명마다 `execAsync`로 Python 인터프리터를 새로 spawn → 시동 비용 ~300ms × N. 10명 조회 시 누적 3초 + 동시 처리 시 인터프리터 N개 동시 시작으로 메모리 스파이크.
- **선택지**: (1) 단일 데몬 + 직렬 처리 — 시동 비용은 사라지지만 동시성 손실, (2) 데몬 풀(N개) — 동시성 유지하면서 시동 비용 제거.
- **결정**: 풀 사이즈 3 (기존 `Promise.all` 동시성과 동일). NDJSON over stdin/stdout 프로토콜로 단순화. `globalThis` 캐싱으로 Next.js dev hot-reload에도 풀이 살아남음.
- **배움**: "외부 프로세스 호출 = 호출 빈도 × 시동 비용" 관점에서 코드를 보면 자연스럽게 풀/데몬 패턴이 떠오름. 아키텍처 결정은 단발 비용이 아니라 누적 비용으로 판단.

### 7. 로그인 쿠키로 차단 완화
- **문제**: yt-dlp `--impersonate chrome`만으로는 TikTok의 게스트 요청 제약을 못 우회. 일부 프로필은 빈 영상 목록을 받음.
- **결정**: 환경변수로 쿠키 주입 옵션 추가 — `TIKTOK_COOKIES_FILE`(Netscape 포맷) 또는 `TIKTOK_COOKIES_BROWSER`(브라우저에서 직접 읽기). 코드 변경 없이 운영 환경에서 켜고 끌 수 있음.
- **배움**: 봇 탐지 회피의 다층 구조 — TLS 핑거프린팅(impersonate) → 세션/쿠키(로그인 상태) → IP 평판(프록시). 단계별로 비용/효과가 다르므로 가장 가성비 높은 단계부터 적용.

---

## 메모
- 현재 배포 서버: `http://168.107.54.238:3200` (Oracle Cloud ap-chuncheon-1)
- 개발 포트: 3200
- 크롤링 전략: Python HTML 데몬 풀 (프로필) + yt-dlp --impersonate chrome (영상)
- 환경변수
  - `TIKTOK_PYTHON` — curl-cffi 설치된 Python 경로 (기본: `/opt/homebrew/opt/yt-dlp/libexec/bin/python3`)
  - `TIKTOK_DAEMON_POOL` — HTML fetcher 풀 크기 (기본 3)
  - `TIKTOK_DAEMON_DEBUG` — 데몬 stderr 출력 활성화
  - `TIKTOK_COOKIES_FILE` — yt-dlp용 Netscape cookies.txt 경로
  - `TIKTOK_COOKIES_BROWSER` — yt-dlp용 브라우저 직접 읽기 (chrome/firefox/safari/edge/brave)
- GitHub: https://github.com/gaebaribari/tiktok-tools
