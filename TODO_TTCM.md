# TODO - TikTok Business API (TTCM) 하이브리드 구축

## 목표
크롤링 + TTCM API 하이브리드로 크롤링 차단 위험 감소

```
크리에이터 조회 요청 →
  1. TTCM API 먼저 시도 (등록된 크리에이터만 가능)
  2. 없거나 실패하면 → 크롤링 fallback
```

---

## 준비물
- [ ] **사업자등록증** (개인사업자도 가능)
- [ ] **회사 이메일 주소** (가능하면)
- [ ] **TikTok Ads 계정** (없으면 새로 생성, 무료)

---

## 할 일

### 1단계: TikTok For Business 계정 생성
- https://ads.tiktok.com/ 접속
- **Sign Up** → 사업자 정보 입력
- 사업자등록증 업로드 → 비즈니스 인증 신청
- 심사 1~5일 대기

### 2단계: TikTok Ads 광고 계정 생성
- 승인 후 광고 계정 생성
- 국가: `South Korea`
- 업종 선택, 기본 정보 입력
- 광고 집행 안 해도 계정만 있으면 됨

### 3단계: TikTok Creator Marketplace (TTCM) 접근 신청
- https://creatormarketplace.tiktok.com/ 접속
- 비즈니스 계정으로 로그인
- **Get Started** → 브랜드/에이전시 정보 입력
- TTCM 접근 심사 (1~2주)

### 4단계: TTCM API 접근 신청
- TikTok For Developers: https://developers.tiktok.com/
- 앱에 **Marketing API** 제품 추가
- **TTCM API** 권한 신청
- 심사 대기 (1~2주)

### 5단계: API 키 발급 & 연동
- 승인되면 Client Key + Access Token 발급
- 기존 `lib/tiktok.ts`에 TTCM API 클라이언트 추가
- `fetchSingleProfile` 로직에 하이브리드 로직 추가:
  ```
  async function fetchSingleProfile() {
    try {
      const ttcm = await fetchFromTTCM(username);
      if (ttcm) return ttcm;
    } catch { /* ignore */ }
    return fetchFromCrawling(username);
  }
  ```

---

## 예상 타임라인

| 단계 | 소요 시간 |
|------|----------|
| 비즈니스 인증 | 1~5일 |
| 광고 계정 생성 | 즉시 |
| TTCM 접근 심사 | 1~2주 |
| Marketing API 심사 | 1~2주 |
| **총** | **3~5주** |

---

## 리스크 / 주의사항

- **커버리지 제한**: TTCM에 가입한 크리에이터만 조회 가능 (한국 기준 대략 20-30%)
- **나머지는 여전히 크롤링** → 차단 위험 완전히 제거 불가
- **비즈니스 심사 거절 가능성**: 실제 마케팅 활동 계획 없으면 거절될 수 있음
- **유지 비용**: API는 무료지만 TikTok Ads 계정 유지 필요

---

## 대안 (심사 실패 시)
- 프록시 서버 구축 (월 $50~)
- RapidAPI TikTok Scraper (월 $10~25)
- 현재 크롤링 유지 + 재시도 강화


그리고 하고싶은걸로 
이메일 추출 까지 하고싶어 설명에 적혀져있으면 
그리고 큰 용량 배포 도전하기까지 해보기 