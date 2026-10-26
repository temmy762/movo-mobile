import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@movo/ui";
import { API_URL } from "./session";

export const SUPPORT_EMAIL = "support@movoprive.com";

/* movo-web pages opened in an in-app browser (legal, sign-up until it's native) */
export const openWeb = (path: string) =>
  WebBrowser.openBrowserAsync(`${API_URL}${path}`, { controlsColor: colors.navy, toolbarColor: colors.ivory });

export const emailSupport = (subject = "Chauffeur app") =>
  Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`);
