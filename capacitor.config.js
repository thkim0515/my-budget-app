// capacitor.config.js
require('dotenv').config();

const config = {
  appId: 'com.user.budgetapp',
  appName: '가계부',
  webDir: 'build',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      googleId: process.env.GOOGLE_AUTH_SERVER_CLIENT_ID, 
    },
    // OTA 웹 번들 업데이트(자체 호스팅) — 확인·다운로드는 src/services/ota.js 가 직접 한다.
    // Capgo 클라우드는 쓰지 않으므로 자동 업데이트·통계 전송 주소를 모두 끈다.
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: '',
      statsUrl: '',
      channelUrl: '',
      // 새 번들이 10초 안에 notifyAppReady() 를 못 부르면(시작 중 크래시 등) 이전 번들로 자동 롤백
      appReadyTimeout: 10000,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      // 새 APK 를 설치하면 받아둔 번들을 버리고 APK 에 들어있는 번들부터 다시 시작
      resetWhenUpdate: true,
    },
  },
};

module.exports = config;