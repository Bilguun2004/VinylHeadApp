/** @type {import('@expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'Пянз толгойт',
    slug: 'VinylHeadApp',
    scheme: 'vinylhead',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.vinylhead.app',
      usesAppleSignIn: true,
      infoPlist: {
        NSFaceIDUsageDescription: 'Нэвтрэхийн тулд Face ID ашиглана.',
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDisplayName: 'Пянз толгойт',
      },
    },
    android: {
      softwareKeyboardLayoutMode: 'resize',
      package: 'com.vinylhead.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.USE_BIOMETRIC',
        'android.permission.POST_NOTIFICATIONS',
      ],
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-secure-store',
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Нэвтрэхийн тулд Face ID ашиглана.',
        },
      ],
      'expo-router',
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Бүтээгдэхүүний зураг сонгохын тулд зургийн сан руу хандахыг зөвшөөрнө үү.',
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#0A0A0A',
          defaultChannel: 'default',
        },
      ],
      'expo-apple-authentication',
      'expo-font',
    ],
    extra: {
      router: {},
      eas: {
        projectId: 'dc0a2988-a9c4-4aca-96b0-76997bac9adc',
      },
    },
    updates: {
      url: 'https://u.expo.dev/dc0a2988-a9c4-4aca-96b0-76997bac9adc',
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
  },
};
