# 가계부 인수인계

최종 갱신: 2026-11-02 (v1.3.2, versionCode 6)

## 현재 상태
- 하단 탭 3개: 홈(`/`), 카카오뱅크(`/kakao`), 전체 소비(`/spend`). 설정은 탭 헤더의 톱니(`Header`의 `onSettings`).
- 배포는 PC 스크립트: 웹 `scripts/publish-ota.ps1`, APK `scripts/publish-update.ps1`. GitHub Releases 경로는 더 이상 갱신하지 않음(README "업데이트 게시 방법").
- 에뮬레이터·adb 자동 입력 테스트 금지. 화면 확인은 `npm start` + 브라우저, 네이티브는 사용자의 실제 폰.

## 구조 요점
- 알림: `useNativeSync` → `kakaoIngest`(kakaoTx) + `spendStore.ingestSpendNotifications`(spendTx·spendNoti). 가계부 자동저장 설정과 별개.
- 금융사 목록: `spendParser.js`의 `SOURCES`. 패키지를 바꾸면 `AndroidManifest.xml`의 `<queries>`도 맞출 것.
- 출처 판별(`matchSource`): 체크한 앱 → 문자 → 카카오톡(제목이 금융사일 때만) → 그 밖의 앱(분명한 승인 문구일 때만). 체크 안 한 금융 앱 알림은 무시.
- 탭 역할: ② 자금 관리(입금·이체·잔액 포함) / ③ 지출만. ②는 `kakaoFlow.autoSave`, ③은 `spendSources`로 독립. ③만 켠 카카오 내역은 `spendOnly` 표시로 ②에서 제외. `mergeSpend`가 kakaoTx의 결제·취소를 합쳐 보여 주며 ③에서는 가맹점·카테고리만 수정. ③에서 직접 넣은 카카오 내역은 spendTx에 저장.
- 분류 정리: `spendClassify.js`(1단계 앱 비교, 2단계 Claude, 3단계 동의 시 원문). 사용자가 정한 항목은 `categoryLocked`. 일 1회 실행은 `useDailyTidy`(앱을 켰을 때).
- 비금융 앱 차단: `kakaoParser.js`의 `NON_FINANCIAL_PACKAGES`(Claude·메신저 등)는 `isKakaoBankNotification`·`matchSource` 모두에서 제외. 새로 걸러낼 앱은 여기에 추가.
- 사용자 분류 규칙: localStorage `kakaoMerchantCategory`(가맹점→분류). `SpendPage.saveTx`(수정 저장)·`acceptSuggestion`이 기록하고, `tidyLocal`/`tidyWithClaude`(Claude 호출 전)·`ingestSpendNotifications`가 먼저 적용. 사용자 UI: 전체 소비 탭 "확인이 필요한 분류" → 분류 정리 시트 → 자동 적용 "수정"/읽지 못한 알림 "삭제".
- 분류 정리 시트(`SpendSheets.jsx` `TidySheet`)는 가로 스크롤 금지(`Sheet`에 overflow-x hidden), 긴 원문은 2줄 말줄임+"전체 보기".
- 거래내역 파일: `statementImport.js`. 칸 이름 낱말 목록 `COLUMN_WORDS`를 실제 파일에 맞춰 보강할 것.
- 디자인 토큰: `theme.js`. 공용 카드·금액 카드: `pages/Kakao/KakaoPage.styles.jsx`.
- 자금 분리: `kakaoStats.splitNet(txs, flow, ts)`가 기준 시점(anchorNet·anchorLoan) 이후 거래를 시간순으로 따라감 — 입금은 마이너스 사용액부터 상환, 출금은 잔액부터. 기준 시점 이전은 기준값 그대로.
- 집계: `kakaoStats.js`, `spendStats.js`(순수 함수). `spendOf`: 결제 +, 취소 -, 이체·입금 0.
- 자금 설정: localStorage `kakaoFlow`(기기 전용).
- Claude: `claudeClient.js`(모델·단가·장부·상한·응답 해석) + `BudgetPlugin.claudeMessages`(네이티브 HTTP) + `SecureKeyStore`(Keystore). 키는 JS로 돌아오지 않음. Haiku는 서버 대체 모델 미지원이라 `fallbacks`와 베타 헤더를 뺀다.

## 미확인 — 다음 작업자가 먼저 볼 것
1. 실제 알림으로 파서 확인. 카카오뱅크는 자금 설정 > "알림 인식 기록", 다른 금융사는 "미분류"·내역 수정 화면에서 원문을 볼 수 있음. 받은 문구로 `spendParser`·테스트의 가정 문장을 교체할 것(삼성카드 승인 문자만 실제 형식).
2. 금융 앱 패키지명 확인(폰에서 "설치됨" 표시로 확인 가능).
3. 실제 카카오뱅크·삼성카드 거래내역 파일로 가져오기 확인.
4. 실제 API 키로 모델 목록과 호출 확인(요청 형식 `output_config.format` + `fallbacks` 조합, Haiku의 구조화 출력은 가짜 응답으로만 검증).
5. Firestore 보안 규칙이 `users/{uid}/kakaoTx`, `users/{uid}/spendTx`를 허용하는지 확인(저장소에 규칙 파일 없음). 막혀도 콘솔 경고만 나고 기존 동기화에는 영향 없음.
