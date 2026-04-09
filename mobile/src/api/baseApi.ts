import axios from "axios"


import { Platform } from "react-native";

// Android emulator: 10.0.2.2, iOS simulator: localhost, real device: LAN IP
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const baseUrl = `http://${HOST}:3002`;
export const api = axios.create({
baseURL:baseUrl,
headers:{"Content-Type":"application/json"}
})
export const apiv1 = axios.create({
baseURL:`${baseUrl}/api/v1`,
headers:{"Content-Type":"application/json"}
})
api.interceptors.request.use((config)=>{
    const token = ""
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})

