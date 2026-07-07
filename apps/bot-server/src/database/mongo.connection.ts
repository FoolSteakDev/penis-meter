import dns from "node:dns";
import mongoose from "mongoose";
import { envConfig } from "../config/env.config";

// Windows + деякі домашні роутери не вміють резолвити SRV/TXT-записи, які
// потрібні для mongodb+srv:// URI (Node отримує ECONNREFUSED на querySrv,
// хоча системний nslookup їх бачить). Явно задаємо публічні DNS-сервери,
// щоб резолвер Node (c-ares) не залежав від роутера.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(envConfig.mongoUri);
  console.log("[mongo] connected");
}
