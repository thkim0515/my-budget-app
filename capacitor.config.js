const dotenv = require('dotenv');
dotenv.config(); 

const config = {
  appId: 'com.user.budgetapp',
  appName: '가계부',
  webDir: 'build',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: process.env.GOOGLE_AUTH_SERVER_CLIENT_ID, 
      forceCodeForRefreshToken: true,
    },
  },
};

module.exports = config; //