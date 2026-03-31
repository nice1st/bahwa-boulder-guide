# 바위 볼더링 가이드

지도 기반 볼더링 루트 가이드 웹앱.
관리자가 스팟/루트를 등록하고, 일반 사용자는 조회 및 댓글을 남긴다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js (App Router), TypeScript |
| 스타일링 | Tailwind CSS |
| 지도 | Kakao Maps SDK |
| 백엔드/DB | Supabase (PostgreSQL + Storage) |
| 인증 | Supabase Auth (Google OAuth) |
| 배포 | Vercel |

## 주요 기능

- 카카오맵 기반 마커 표시 (볼더/주차장/화장실/갈림길)
- 마커 클러스터링 (줌 기반)
- 루트 상세 (사진, 설명, 영상 링크)
- 어프로치 경로 폴리라인 토글
- 이미지 풀스크린 뷰어 + 스와이프
- 댓글 조회/작성 (비로그인)
- 관리자 페이지 (마커/루트/경로/사용자 CRUD)
- EXIF GPS 추출 + 50m 반경 감지

## 데이터 모델

- **Marker** — 지도 마커 (boulder/parking/toilet/junction)
- **Route** — 볼더 루트 (난이도, 패드 수, 사진, 영상)
- **Path** — 어프로치 경로 (좌표 배열)
- **Comment** — 루트별 댓글
- **Profile** — 사용자 역할 관리 (user/admin)

## 배포

- **프로덕션**: https://bahwa-boulder-guide.vercel.app
- **GitHub**: https://github.com/nice1st/bahwa-boulder-guide
- GitHub push 시 Vercel 자동 배포

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KAKAO_MAP_KEY=
```
