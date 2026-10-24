import type { AppConfig } from "@movo/shared";
import { request } from "../client";

export const appConfig = () => request<AppConfig>("/api/app/config");
