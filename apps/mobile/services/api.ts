// mobile/services/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

const envBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

const fallbackBase =
  Platform.select({
    android: 'http://10.0.2.2:8080/api', // emulador Android
    ios: 'http://localhost:8080/api',    // iOS simulator
    default: 'http://localhost:8080/api',
  })!;

export const api = axios.create({
  baseURL: envBase || fallbackBase,
  timeout: 15000,
});
