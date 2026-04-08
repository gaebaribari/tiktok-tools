# TikTok Tools 개발 일정

## 2026년 4월

### 완료

#### 4/8
- [x] 크리에이터 조회 속도 개선 (동시 3개, 대기 1-2초 → 10명 약 25초)
- [x] UI 개선 - 개발창(로그) 제거, 깔끔한 조회 화면

---

### 진행중

#### 4/9
- [ ] TikTok 공식 API 전환 조사 완료 → [TODO_0409.md](TODO_0409.md)
- [ ] UI 업데이트

---

### 예정

#### 4/15 ~ 5/9
- [ ] TikTok Developer 신청 (Research API)
  - https://developers.tiktok.com/
  - 회사 등록증 준비, API 신청서 작성, 심사 대기

#### 5/10 (승인 후)
- [ ] TikTok API 연동
  - Creator Profile API 통합
  - 기존 크롤링 코드 교체
  - 속도 + 안정성 개선

---

## 메모
- 현재는 크롤링 기반 (yt-dlp, 웹 스크래핑)
- API 승인 후 공식 API로 마이그레이션 예정
- 개발 포트: 3200
