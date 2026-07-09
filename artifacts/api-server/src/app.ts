import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  // __dirname in production = artifacts/api-server/dist
  // website build output    = artifacts/website/dist/public
  const publicPath = path.resolve(__dirname, "../../website/dist/public");
  app.use(express.static(publicPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}

export default app;
