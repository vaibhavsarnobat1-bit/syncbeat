import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import router from "./routes";

const app: Express = express();

app.use(cors({ origin: "*", credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  // Support running from root repo (node artifacts/api-server/dist/index.cjs) or from artifacts/api-server
  const candidatePaths = [
    path.resolve(process.cwd(), "artifacts/website/dist/public"),
    path.resolve(process.cwd(), "../website/dist/public"),
    path.resolve(process.cwd(), "website/dist/public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "../../website/dist/public"),
  ];

  let publicPath = candidatePaths[0];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      publicPath = p;
      break;
    }
  }

  console.log(`[Server] Serving frontend static assets from: ${publicPath}`);
  app.use(express.static(publicPath));

  app.use((_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}

export default app;
