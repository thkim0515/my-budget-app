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
  },
};

module.exports = config;