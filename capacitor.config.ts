import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.ghanahouse.agent",
  appName: "Ghana House Agent",
  webDir:  "out",
  server: {
    url:       "https://ghana-house-agent.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor:   "#0c3b2e",
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style:           "DARK",
      backgroundColor: "#00000000",   // fully transparent
    },
    LocalNotifications: {
      smallIcon:   "ic_stat_icon_config_sample",
      iconColor:   "#0c3b2e",
      sound:       "beep.wav",
    },
    Geolocation: {
      // No extra config needed
    },
  },
};

export default config;