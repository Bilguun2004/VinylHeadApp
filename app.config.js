/** @type {import('@expo/config').ExpoConfig} */
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    android: {
      ...appJson.expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      permissions: [
        ...(appJson.expo.android?.permissions ?? []),
        'android.permission.POST_NOTIFICATIONS',
      ],
    },
  },
};
