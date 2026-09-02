import axios from "axios";
import { getServerUrl } from "./config";

let api = null;

export function initializeApi() {
  api = axios.create({
    baseURL: `${getServerUrl()}/api`,
  });

  return api;
}
export function getApi() {
    if (!api) {
        throw new Error(
            "API is not initialized. Call initializeApi() first."
        );
    }

    return api;
}