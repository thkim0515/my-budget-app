# 가계부 (mybudgetapp)

> 카드·계좌 알림을 자동으로 읽어 수입/지출을 기록해주는 개인용 가계부 Android 앱.

---

## 최근 업데이트 (2026-09-12)

- 🆕 **카드 한도 설정에 저장 버튼 추가** — 한도 금액 입력 시 숫자를 바꾸는 즉시 반영되던 것을, "저장" 버튼을 눌러야 확정되도록 변경. 값이 실제로 바뀐 경우에만 버튼이 활성화되고, 누르면 확인(confirm) 창을 거쳐야 저장됨
- 🆕 **카드 한도 표시 기능 추가** — 설정 페이지에서 카드사·한도 금액을 지정하면 메인 화면에 이번 달 남은 한도를 표시. 한도 리셋 / 남은 한도 직접 입력 기능 포함
- 🆕 **카드 한도 표시, 문자 "누적" 금액 기반으로 계산** — 카드 승인 문자에 함께 오는 "누적OOO원"(당월 누적 사용액)을 직접 읽어와 한도에서 빼는 방식으로 변경. 기존에는 로컬에 저장된 지출 내역 합계로 계산해 부정확할 수 있었음
- 🔧 **카드 한도 표시, 지출 자동저장 On/Off와 무관하게 상시 동작** — 지금까지는 "지출 자동저장"이 꺼져 있으면 카드 한도도 함께 갱신되지 않았는데, 알림 파싱 단계에서 누적 금액을 먼저 반영하도록 순서를 바꿔 자동저장 설정과 관계없이 항상 최신 상태를 유지하도록 수정
- 🔧 **한도 리셋 · 직접 입력 기능, 문자 기반 누적값과 호환** — 문자로 받은 누적값을 사용 중일 때는 리셋/직접 입력이 그 누적값 자체를 조정하도록 하여, 기존 방식(로컬 계산 + 보정값)과 새 방식 모두에서 정상 동작하도록 처리
- 🆕 **상세 페이지 선택삭제 기능 추가** — 헤더에 "선택 삭제" 버튼 신설. 체크박스로 여러 항목을 골라 한 번에 삭제 가능
- 🆕 **선택삭제, 드래그로 여러 항목 한번에 선택** — "선택 삭제" 모드에서 손가락으로 항목들을 쓸어넘기면(드래그) 지나가는 항목들이 한 번에 선택/해제되도록 개선. 처음 누른 항목의 선택 여부를 기준으로 선택/해제 모드가 정해짐
- 🔧 **금액 입력창, 입력 중 실시간 천 단위 콤마 포맷** — 숫자를 입력하는 동안에도 바로 콤마가 붙어 보이도록 수정하고, 재포맷 후에도 커서가 입력하던 자리에 그대로 유지되도록 처리
- 🔧 **알림 리스너(Android), 카카오톡류 대화형 알림 수신 보강** — `EXTRA_TEXT`가 비어있고 `EXTRA_MESSAGES`(MessagingStyle)에만 내용이 담기는 알림도 읽어오도록 추가
- 🔧 **알림 리스너(Android), 알림 중복 판단 로직 수정** — 기존에는 시스템 알림 키(key)만으로 중복을 판단해, 같은 대화방 알림을 업데이트하는 방식의 알림(카카오톡 등)에서 내용이 완전히 바뀐 새 알림(카드 결제 알림톡 등)까지 "이미 처리한 알림"으로 오인해 영구히 무시하던 문제 수정. 이제 키 + 내용 해시를 함께 확인
- 🔧 **레코드 저장 시 id 충돌 버그 수정** — 같은 챕터에 속한 레코드를 저장할 때 챕터 id를 레코드 id로 잘못 재사용해, 두 번째 레코드부터 저장이 실패하던 문제 수정 (`useBudgetDB.js`)
- 🔧 **숨겨진 알림 파싱 디버그 메뉴 추가** — 개인정보처리방침 화면 하단 빈 영역을 5초 안에 5번 누르면 30분간 "최근 캡처된 알림 원문 보기" 메뉴가 열려, 알림 파싱 성공/실패 여부를 직접 확인 가능

## 최근 업데이트 (2026-07-02)

- **계산기 입력창 UX** — 새 항목 입력 후 "수입/지출" 선택 시 포커스를 해제해 키보드가 닫히며 입력 시트가 자연스럽게 아래로 내려가도록 수정
- **항목 계산 제외 · 복사 버튼 재배치** — "이 항목 계산에서 제외" 버튼을 "이 항목 삭제" 버튼 바로 위로 이동하고 너비를 50%로 축소, 남은 50%에 "이 항목 복사하기" 버튼 신설(같은 수입/지출 영역에 즉시 복제)
- **월별 납부완료 제외 토글** — 상세 페이지 헤더 우측에 토글 추가. 켜면 개별 계산 제외 설정과 별개로 그 달의 납부완료 항목 전체를 합계에서 제외(목록 표시는 그대로 유지)
- **완료 항목 숨기기** — 메인 페이지 정렬 버튼 옆에 토글 추가, 완료 처리된 챕터를 목록에서 숨김
- **알림 자동저장 버그 수정** — 무시 키워드("적립"·"포인트" 등)가 하나라도 포함되면 실제 카드 승인 알림까지 통째로 버려지던 버그, 정규식 `g` 플래그로 인한 상태 오염 버그, UTC 기준 날짜 계산 버그를 수정

---

## 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [데이터 모델](#데이터-모델)
- [주요 기능 상세](#주요-기능-상세)
  - [잠금 화면](#1-잠금-화면)
  - [메인 페이지](#2-메인-페이지)
  - [상세 페이지](#3-상세-페이지)
  - [알림 자동저장](#4-알림-자동저장)
  - [통계 페이지](#5-통계-페이지)
  - [캘린더 통계](#6-캘린더-통계)
  - [출처별 통계](#7-출처별-통계)
  - [설정 페이지](#8-설정-페이지)
- [알림 시스템 (네이티브 Android)](#알림-시스템-네이티브-android)
- [클라우드 동기화 · 백업/복원](#클라우드-동기화--백업복원)
- [보안 / 잠금](#보안--잠금)
- [테마](#테마)
- [뒤로가기 처리 (Android)](#뒤로가기-처리-android)
- [환경 변수](#환경-변수)
- [로컬 실행 방법](#로컬-실행-방법)
- [Android 빌드 방법](#android-빌드-방법)

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 19 |
| 빌드 도구 | react-scripts 5 (Create React App) |
| 라우팅 | react-router-dom 7 (HashRouter 기반) |
| 스타일링 | styled-components 6 (테마 토큰 기반) |
| 로컬 저장소 | IndexedDB (`idb` 8) |
| 백엔드 | Firebase 11 (Firestore · Auth · Functions) |
| 네이티브 앱 | Capacitor 7 (Android) |
| 알림 | @capacitor/local-notifications, 커스텀 `NotificationListenerService`(자체 네이티브 코드) |
| 인증 | @capacitor-firebase/authentication (Google 로그인), Google Play Services Auth |
| 생체인증 | @capgo/capacitor-native-biometric |
| 드래그 정렬 | @hello-pangea/dnd |
| 차트 | chart.js 4 + react-chartjs-2 (Bar · Pie) |
| 달력 UI | react-calendar 6 |
| 공휴일 | date-holidays 3 |
| 스와이프 | react-swipeable 7 |
| 아이콘 | react-icons 5 |
| 백업 암호화 | crypto-js(AES) + lz-string(압축) |
| App ID | `com.user.budgetapp` |
| Android SDK | minSdk 23 · targetSdk 35 · compileSdk 35 |

---

## 프로젝트 구조

```
src/
├── App.js                        # 라우팅(해시 라우터), 잠금 화면 분기, 테마 적용, 로그인/로컬변경 감지 → Firestore 동기화 트리거
├── theme.js                      # 라이트/다크 테마 토큰 (컬러, radius, space, shadow, gradient)
├── appImports.js                 # 페이지/훅 재수출 배럴 파일
├── pages/
│   ├── Main/
│   │   ├── MainPage.jsx           # 챕터(월별 묶음) 목록 — 정렬/완료 숨기기/완료 처리/이름변경/월 복사/삭제
│   │   └── DetailPage.jsx         # 수입/예산/자동지출 3섹션 — 드래그 정렬, 편집 시트, 계산 제외, 납부완료, 복사
│   ├── Stats/
│   │   ├── StatsPage.jsx          # 기간별(1/3/6/12개월) 잔액 막대그래프 + 카테고리별 지출 파이차트
│   │   └── StatsBySourcePage.jsx  # 결제 수단(카드/은행)별 지출 랭킹
│   ├── CalendarStats/
│   │   └── CalendarStatsPage.jsx  # 달력에 날짜별 수입/지출 타일 표시, 공휴일 강조
│   └── Settings/
│       ├── SettingsPage.jsx           # 설정 허브(잠금·테마·알림·동기화·백업·초기화)
│       ├── CurrencySettingsPage.jsx   # 통화 기호 선택
│       ├── CategorySettingsPage.jsx   # 카테고리 추가/삭제
│       └── TextColorSettingsPage.jsx  # 라이트/다크 모드별 글자 색상
├── components/
│   ├── Auth/
│   │   ├── LockScreen.jsx         # PIN 패드 + 지문 잠금 화면
│   │   └── GoogleAuth.jsx         # Google 로그인/로그아웃 (Firestore 동기화용)
│   ├── UI/
│   │   ├── Header.jsx             # 공용 페이지 헤더 (title + 우측 버튼 슬롯)
│   │   └── BottomTabBar.jsx       # 하단 5탭 네비게이션 (홈·통계·캘린더·출처·설정)
│   ├── DataList/
│   │   ├── DataList.jsx           # 수입/예산/지출 리스트, 드래그 정렬, 모아보기, 당겨서 새로고침
│   │   └── DataForm.jsx           # 항목 입력/수정 바텀시트 (날짜·카테고리·항목명·금액, 만원 단위 버튼)
│   ├── Data/
│   │   ├── SyncAction.jsx         # Firestore 수동 동기화 버튼/상태
│   │   └── BackupAction.jsx       # 비밀번호 암호화 백업/복원 (비로그인 사용자용)
│   └── Info/
│       ├── NotificationSettings.jsx  # 알림 접근 권한 안내 + 자동저장(입금/지출) 토글
│       └── PrivacyPolicyPage.jsx     # 개인정보 처리방침
├── hooks/
│   ├── useBudgetDB.js             # IndexedDB CRUD 래퍼 (add/put/getAll/getAllRaw/deleteItem/clear)
│   ├── useSync.js                 # Firestore 증분 동기화 + 수동 백업/복원
│   ├── useNativeSync.js           # 대기 중인 알림을 읽어 parseAndCreateRecord로 자동 저장
│   ├── useBiometricLock.js        # 생체인증/PIN 잠금 상태 관리, 포그라운드 복귀 시 재인증
│   ├── useAndroidBackHandler.js   # 하드웨어 뒤로가기 → 탭 전환/앱 종료 처리
│   └── useCurrencyUnit.js         # 통화 기호 설정 접근 훅
├── context/
│   └── SettingsContext.jsx        # 전역 설정(테마·통화·잠금·자동저장·모아보기 등) Provider, localStorage 영속화
├── db/
│   ├── indexedDB.js                # IndexedDB 스키마 정의 (chapters/records/categories, v5)
│   └── firebase.js                 # Firebase 초기화 (Firestore/Auth/Functions)
├── plugins/
│   └── BudgetPlugin.js             # 커스텀 네이티브 플러그인 JS 브릿지 (registerPlugin)
├── services/
│   └── biometricService.js         # NativeBiometric 래퍼 (isAvailable/verifyIdentity)
├── constants/
│   └── categories.js               # 기본 카테고리 8종
└── utils/
    ├── notiParser.js                # 알림 텍스트 → 거래 레코드 파싱, 카테고리/은행 자동 매핑
    ├── backHandlerStack.js          # 바텀시트/모달 우선 뒤로가기 스택
    └── numberFormat.js              # 숫자 콤마/축약 포맷 유틸

android/app/src/main/java/com/user/budgetapp/
├── MainActivity.java               # BudgetPlugin 등록
├── BudgetPlugin.java               # 알림 접근 권한 확인/설정 이동, 대기 알림 조회/삭제
└── NotificationListener.java       # 시스템 알림 인터셉트, 중복 방지, SharedPreferences 저장
```

> 참고: `src/components/UI/InputForm.jsx`, `RecordList.jsx`, `ChapterList.jsx`, `src/main.jsx`는 현재 어디서도 import되지 않는 레거시 파일입니다(실사용 화면은 `DataForm`/`DataList`/`MainPage`).

---

## 데이터 모델

### 로컬 저장소 — IndexedDB (`budgetDB`, 버전 5)

| 스토어 | 키 | 인덱스 | 주요 필드 |
|---|---|---|---|
| **chapters** | `chapterId` | – | `title`(예: "2026년 7월"), `createdAt`, `order`, `isTemporary`, `isCompleted`, `updatedAt`, `isDeleted` |
| **records** | `id` | `chapterId` | `title`, `amount`, `type`("income"\|"expense"), `category`, `date`, `chapterId`, `isPaid`, `excludedFromCalc`, `inputMode`("manual"\|"auto"), `order`, `source`, `createdAt`, `updatedAt`, `isDeleted` |
| **categories** | `id` | – | `name`, `updatedAt`, `isDeleted` (앱 최초 실행 시 기본 8종 자동 주입) |

**필드 의미:**
- `isTemporary` — "새 내역 추가"로 만든 챕터가 제목 미확정 상태일 때 true, 첫 저장 시 자동으로 해제
- `isCompleted` — 메인 페이지에서 "완료 처리"한 챕터 (완료 항목 숨기기 토글의 기준)
- `inputMode: "auto"` — 알림에서 자동 저장된 지출/입금 (상세 페이지의 "지출 목록(자동 기록)" 섹션)
- `excludedFromCalc` — 개별 항목을 그 달 합계에서 제외 (목록에는 그대로 표시)
- `isPaid` — 납부완료 표시. 상세 페이지 헤더의 "납부완료 제외" 토글을 켜면 이 값이 true인 항목도 그 달 합계에서 함께 제외
- 삭제는 모두 소프트 딜리트(`isDeleted: true`) — `getAll()` 계열 조회 시 자동으로 걸러짐

### 클라우드 저장소 — Firestore (`useSync.js`)

```
users/{uid}/chapters/{chapterId}
users/{uid}/records/{id}
users/{uid}/categories/{id}
```

- **증분 동기화**(`USE_INCREMENTAL_SYNC = true`): 마지막 동기화 시각(`localStorage: lastSyncTime_{uid}`) 이후 `updatedAt`이 갱신된 문서만 주고받음
- **트리거**: Google 로그인 성공 시, 로컬 DB 변경(`budget-db-updated` 이벤트) 시, 설정 페이지의 수동 동기화 버튼
- **충돌 해결**: `updatedAt`이 더 최신인 쪽이 우선(last-write-wins)

### 인증

- Google 로그인(`@capacitor-firebase/authentication` → Firebase Auth `signInWithCredential`)
- 로그인은 Firestore 동기화를 위한 것으로, 잠금 화면의 PIN/생체인증과는 완전히 별개 시스템

---

## 주요 기능 상세

### 1. 잠금 화면

`LockScreen.jsx` + `useBiometricLock.js`

- 설정에서 "지문 생체 잠금"을 켜면 앱 시작/포그라운드 복귀 시 잠금 화면 노출
- 생체인증 우선 시도 → 기기 미지원/인증 실패 시 PIN 입력으로 자동 폴백
- PIN은 4자리 숫자, 설정 페이지에서 별도로 등록(생체인증과 무관하게 폴백 용도로 항상 설정 가능)
- 인증 성공 후 1초 이내 재진입은 재인증을 건너뜀(잠깐의 화면 전환에서 반복 인증 방지)

### 2. 메인 페이지

`MainPage.jsx` — 월별 묶음(챕터) 목록

- **정렬**: 기본순 / 최신순 / 오래된순
- **완료 항목 숨기기**: 정렬 버튼 왼쪽 토글. 챕터별 "완료 처리" 상태(`isCompleted`)를 기준으로 숨김/표시 (localStorage에 기억)
- **완료 처리**: 챕터 카드의 "완료"/"해제" 버튼으로 토글
- **이름 변경**: 챕터 제목 인라인 수정(중복 제목 방지)
- **월 복사**: 챕터의 수입 + 수동입력 예산 항목만(자동 저장된 지출 제외) 대상 연/월로 날짜를 이동시켜 새 챕터로 복제. 이미 같은 제목의 챕터가 있으면 차단
- **삭제**: 챕터와 소속 레코드를 함께 소프트 삭제
- 카드에는 수입/예산/잔액 요약이 함께 표시(계산 제외 항목은 집계에서 빠짐)

### 3. 상세 페이지

`DetailPage.jsx` — 하나의 챕터(월) 내부

**3개 섹션 (각각 접기/펼치기 가능):**
1. **수입 내역** — `type: "income"`
2. **예산 목록 (직접 입력)** — `type: "expense"` + `inputMode: "manual"`
3. **지출 목록 (자동 기록)** — `type: "expense"` + `inputMode: "auto"` (알림에서 자동 저장된 항목)

**항목 조작:**
- 섹션 내 드래그 앤 드롭 정렬(`@hello-pangea/dnd`), 다른 섹션으로 드래그하면 수입/지출 타입까지 함께 변경
- **모아보기**: 수입/지출 섹션을 항목명 기준으로 합산해서 보여주는 토글 (합산된 항목은 개별 수정/드래그 불가)
- **당겨서 새로고침**: 50px 이상 아래로 당기면 로컬 DB 재조회

**항목 편집 바텀시트(`DataForm.jsx`):**
- 날짜 · 카테고리 · 항목명 · 금액 입력, 금액 옆 +만/+십만/+백만 버튼으로 자릿수 빠르게 입력(예: 5 입력 후 "+만" → 50,000)
- 새 항목: "＋ 수입"/"－ 지출" 버튼으로 저장(선택 시 키보드 닫힘, 시트는 열린 채로 연속 입력 가능)
- 기존 항목 편집 시 추가 노출: **납부 완료/취소**(닫힘), **이 항목 계산에서 제외**(50% 폭, 토글형), **이 항목 복사하기**(나머지 50%, 같은 수입/지출 영역에 즉시 복제), **이 항목 삭제**(맨 아래, 확인 후 소프트 삭제)

**헤더 토글 — 납부완료 제외:**
- 년월 제목 우측의 토글. 켜면 그 달의 납부완료(`isPaid`) 항목 전체가 합계 계산에서 제외됨(목록 노출은 유지). 개별 항목의 "계산에서 제외"와는 독립적으로 함께 작동하며, 챕터별로 localStorage에 저장

### 4. 알림 자동저장

`src/utils/notiParser.js` · `src/hooks/useNativeSync.js` · 네이티브 `NotificationListener.java`/`BudgetPlugin.java`

앱을 열지 않아도 은행/카드 알림만으로 지출·입금이 자동 기록되는 핵심 기능.

**네이티브 레이어 (`NotificationListener.java`):**
- `NotificationListenerService`로 시스템 알림을 실시간 인터셉트, 제목·본문·패키지명·수신시각을 SharedPreferences(`BudgetData`)에 큐잉
- 3중 중복 방지: ① 시스템 알림 키로 물리적 재게시 차단 ② 내용 해시 + 3초 윈도우로 타 앱발 교차 중복(카뱅↔카톡 등) 차단 ③ 같은 앱·같은 금액의 연속 결제는 정상 허용

**JS 파싱 (`notiParser.js`):**
1. "광고/할인/적립/포인트" 등 무시 키워드가 있어도 "승인/결제/입금/출금" 같은 실거래 신호가 함께 있으면 정상 처리(무시 키워드만으로 실거래를 통째로 버리지 않음)
2. 정규식으로 금액(`\d+원`) 추출
3. 취소("취소"), 이체("이체/송금"), 입금("입금/환급/보낸분") 등 키워드로 거래 유형 판별
4. Firestore(`config/parserRules`)에서 실시간 동기화되는 규칙으로 카테고리 자동 분류(편의점/구독/배달/쇼핑/교통/식비/의료/생활/이체 등) 및 은행/카드사 이름 매핑
5. 상호명은 금액·잡음(시간, 카드번호 마스킹, 승인/결제 등 정형 문구)을 제거해 추출

**동기화 훅 (`useNativeSync.js`):**
- 앱 시작 및 포그라운드 복귀 시 실행, 알림 접근 권한 없으면 조기 종료
- 설정의 `autoSaveIncome`/`autoSaveExpense` 토글로 저장 여부 필터링
- 취소 알림은 최근 동일 금액/상호 레코드를 찾아 삭제 처리
- 1초 이내 동일 금액·유사 제목은 중복으로 간주해 스킵
- 저장 시 `inputMode: "auto"`로 마킹되어 상세 페이지의 "지출 목록(자동 기록)" 섹션에 표시되고, 해당 월 챕터가 없으면 자동 생성

### 5. 통계 페이지

`StatsPage.jsx`

- 1/3/6/12개월 기간 선택 + 좌우 스와이프로 기간 이동
- 상단 요약: 기간 합계 수입/지출/잔액
- 막대그래프: 챕터(월)별 잔액(적자는 빨강, 흑자는 파랑)
- 파이차트: 카테고리별 지출 비중
- 하단 표: 챕터별 수입/지출/잔액 목록
- 계산 제외(`excludedFromCalc`) 항목은 전 구간에서 집계 제외

### 6. 캘린더 통계

`CalendarStatsPage.jsx`

- `react-calendar` 기반 월간 달력, 날짜 타일마다 그날의 수입(초록)/지출(빨강) 금액 표시
- `date-holidays`로 한국 공휴일 강조
- 날짜 탭 시 해당 날짜 상세로 이동, 좌우 스와이프로 월 이동

### 7. 출처별 통계

`StatsBySourcePage.jsx`

- 그 달 지출을 결제 수단(`source` — 알림 자동저장 시 매핑된 은행/카드사명)별로 합산해 랭킹으로 표시
- 정렬: 기본 / 금액 큰 순 / 금액 작은 순, 월 스와이프 이동

### 8. 설정 페이지

`SettingsPage.jsx` + 하위 페이지

| 설정 | 저장 위치 | 비고 |
|---|---|---|
| 지문 생체 잠금 | `settings.useBiometric` (localStorage) | 기기 미지원 시 자동 차단 + 안내 |
| PIN 잠금 | `settings.lockPin` | 생체인증 실패 시 폴백, 독립적으로 설정 가능 |
| 통화 기호 | `settings.currencyUnit` | 원/₩/$/€/¥ 등 |
| 글자 색상 | `settings.lightTextColor`/`darkTextColor` | 라이트/다크 모드 각각 |
| 카테고리 관리 | IndexedDB `categories` | 기본 8종 + 사용자 추가/삭제 |
| 테마 (라이트/다크) | `settings.mode` | 버튼 클릭으로 즉시 전환 |
| 알림 자동저장 (입금/지출) | `settings.autoSaveIncome`/`autoSaveExpense` | [알림 시스템](#알림-시스템-네이티브-android) 참고 |
| Google 로그인/동기화 | Firebase Auth + Firestore | [클라우드 동기화](#클라우드-동기화--백업복원) 참고 |
| 전체 데이터 초기화 | 로컬 + (로그인 시)서버 | 확인 후 카테고리만 기본값으로 재생성 |

---

## 알림 시스템 (네이티브 Android)

| 파일 | 역할 |
|---|---|
| `NotificationListener.java` | `NotificationListenerService` 구현, 알림 인터셉트·중복 방지·큐잉 |
| `BudgetPlugin.java` | Capacitor 커스텀 플러그인 — JS ↔ 네이티브 브릿지 |
| `notiParser.js` | 알림 텍스트를 파싱해 레코드 초안 생성 |
| `useNativeSync.js` | 큐를 읽어 실제 IndexedDB 레코드로 저장 |

**BudgetPlugin이 노출하는 메서드:**
- `hasNotificationAccess()` — `enabled_notification_listeners` 시스템 설정으로 권한 여부 확인
- `getPendingNotifications()` — SharedPreferences에 쌓인 알림 JSON 반환
- `clearNotifications()` — 처리 완료 후 큐 비우기
- `openNotificationAccessSettings()` — Android 알림 접근 설정 화면으로 이동(권한 부여는 사용자가 직접)

**필요 권한 (`AndroidManifest.xml`):**
- `POST_NOTIFICATIONS`(Android 13+), `BIND_NOTIFICATION_LISTENER_SERVICE`, `INTERNET`, `USE_BIOMETRIC`

> 알림 접근 권한은 OS 설정에서 사용자가 직접 켜야 하며, `NotificationSettings.jsx`가 권한 상태를 감지해 미허용 시 자동저장 토글을 비활성화하고 안내 문구를 표시합니다.

---

## 클라우드 동기화 · 백업/복원

- **로그인 사용자**: Google 로그인 시 Firestore와 증분 동기화(위 [데이터 모델](#데이터-모델) 참고). 설정 페이지의 `SyncAction`에서 수동 동기화도 가능
- **비로그인 사용자**: `BackupAction`에서 비밀번호 기반 수동 백업/복원 제공
  - 로컬 데이터를 JSON → `lz-string` 압축 → `crypto-js` AES 암호화 후 `REACT_APP_UPLOAD_URL`로 업로드해 코드 발급
  - 복원 시 `REACT_APP_DOWNLOAD_URL`에서 암호화 데이터를 받아 복호화 후 `updatedAt` 기준으로 로컬과 병합
  - 업로드 URL이 설정되지 않은 환경에서는 테스트 코드(`TEST12`)를 반환

---

## 보안 / 잠금

- **PIN**: 4자리 숫자, 설정 페이지에서 등록/변경(기존 PIN 확인 → 새 PIN 2회 입력)
- **생체인증**: `@capgo/capacitor-native-biometric` — 지문/얼굴, 기기 미지원 시 자동으로 꺼짐 + 안내
- **잠금 우회 방지**: 앱이 백그라운드로 갔다 1초 이상 지나 복귀하면 재인증 요구(그보다 짧으면 화면 전환 등으로 판단해 생략)
- PIN·생체인증 설정 값은 `localStorage`에 저장되며 기기 간 동기화되지 않음(Firestore 동기화 대상 아님)

---

## 테마

`theme.js` — "모던 핀테크" 톤의 라이트/다크 테마.

| 토큰 | 라이트 | 다크 |
|---|---|---|
| `primary` | `#4C6FFF` | (다크 전용 밝은 톤) |
| `bg` | `#F4F6FB` | `#0E1014` |
| `card` | `#FFFFFF` | `#1A1D25` |
| 수입/지출 그라디언트 | `gradientIncome`/`gradientExpense` | 공용 |
| `radius` | xs 8px ~ xl 28px, pill 999px | 공용 |
| `space` | xs 4px ~ xxl 32px | 공용 |
| 폰트 | Pretendard 우선 시스템 폰트 스택 | 공용 |

- 라이트/다크 모드별로 글자 색상을 사용자가 직접 지정 가능(`lightTextColor`/`darkTextColor`)
- `styled-components`의 `ThemeProvider`로 전체 앱에 주입, 각 컴포넌트는 `theme.xxx`로 토큰 참조

---

## 뒤로가기 처리 (Android)

`useAndroidBackHandler.js` + `backHandlerStack.js`

- 바텀시트/모달이 열려 있으면 해당 화면이 `pushBackHandler`로 "닫기" 함수를 스택에 등록
- 하드웨어 뒤로가기 → `consumeBack()`이 스택 최상단 핸들러를 우선 실행(시트 닫기), 없으면 일반 탭 이동/앱 종료 로직으로 위임
- 여러 시트가 중첩돼도 가장 최근 것부터 순서대로 닫힘

---

## 환경 변수

`src/db/firebase.js`에 Firebase 웹 설정(apiKey/authDomain/projectId/appId)이 하드코딩되어 있어 별도 `.env` 없이 바로 실행됩니다. 백업/복원 기능만 아래 값이 필요합니다(.env, `REACT_APP_` 접두사 필수):

```env
REACT_APP_UPLOAD_URL=https://your-backup-upload-endpoint
REACT_APP_DOWNLOAD_URL=https://your-backup-download-endpoint
```

값이 없으면 백업은 테스트 코드(`TEST12`)만 반환하고 실제 업로드는 되지 않습니다.

---

## 로컬 실행 방법

```bash
npm install
npm start
```

브라우저에서 `http://localhost:3000` 접속. 알림 자동저장·생체인증 등 네이티브 기능은 Android 앱에서만 동작합니다.

---

## Android 빌드 방법

```bash
# 1. 웹 빌드
npm run build

# 2. Capacitor 동기화
npx cap sync android

# 3-A. Android Studio에서 열기
npx cap open android

# 3-B. 또는 커맨드라인으로 바로 디버그 APK 빌드
cd android && ./gradlew assembleDebug
```

APK 경로: `android/app/build/outputs/apk/debug/app-debug.apk`

```bash
# 연결된 기기에 설치
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
