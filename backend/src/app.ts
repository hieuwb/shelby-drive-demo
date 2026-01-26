import express from "express";
import cors from "cors";
import driveRoute from "./routes/drive.route";
import fileRoute from "./routes/file.route";
import shelbyRoute from "./routes/shelby.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ShelbyDrive Backend API - Powered by Shelby Network",
    version: "2.0.0",
    endpoints: {
      drive: "/api/drive",
      file: "/api/file",
      shelby: "/api/shelby",
    },
  });
});

app.use("/api/drive", driveRoute);
app.use("/api/file", fileRoute);
app.use("/api/shelby", shelbyRoute);

export default app;
