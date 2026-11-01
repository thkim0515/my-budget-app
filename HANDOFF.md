# 가계부 인수인계

최종 갱신: 2026-11-01 (v1.2.0, versionCode 4)

## 현재 상태
- 카카오뱅크 탭(`/kakao`, `src/pages/Kakao/`) 신설: 결제·자금 흐름·소비 분석.
- 배포는 PC 스크립트: 웹 `scripts/publish-ota.ps1`, APK `scripts/publish-update.ps1`. GitHub Releases 경로는 더 이상 갱신하지 않음(README "업데이트 게시 방법").
- 에뮬레이터·adb 자동 입력 테스트 금지. 화면 확인은 `npm start` + 브라우저, 네이티브는 사용자의 실제 폰.

## 구조 요점
- 알림: `useNativeSync` → `kakaoIngest.ingestKakaoNotifications` → `kakaoParser` → IndexedDB `kakaoTx`. 가계부 자동저장 설정과 별개.
- 집계: `kakaoStats.js`(순수 함수). 순자금 = 기준 시점 값(`anchorNet`, `anchorAt`) ± 이후 거래. `anchorLoan`은 잔액과 별도로 남은 대출.
- 자금 설정: localStorage `kakaoFlow`(기기 전용, 동기화 안 함).
- Claude: `kakaoAnalysis.js`(집계·상한·응답 해석) + `BudgetPlugin.claudeMessages`(네이티브 HTTP) + `SecureKeyStore`(Keystore). 키는 JS로 돌아오지 않음.

## 미확인 — 다음 작업자가 먼저 볼 것
1. 실제 카카오뱅크 알림으로 파서 확인. 탭 > 자금 흐름 > 자금 설정 > "알림 인식 기록"의 원문을 받아 `kakaoParser.test.js`의 가정 문장을 실제 문장으로 교체하고 파서를 맞출 것.
2. 실제 API 키로 Claude 호출 확인(요청 형식 `output_config.format` + `fallbacks: "default"` 조합은 실호출 전).
3. Firestore 보안 규칙이 `users/{uid}/kakaoTx`를 허용하는지 확인(저장소에 규칙 파일 없음). 막혀도 콘솔 경고만 나고 기존 동기화에는 영향 없음.
