import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  // process.cwd() in production = artifacts/api-server
  // website build output    = artifacts/website/dist/public
  const publicPath = path.resolve(process.cwd(), "../website/dist/public");
  app.use(express.static(publicPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}

export default app;
