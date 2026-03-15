import app from "./app";
import "dotenv/config";

const port = Number(process.env.PORT);

if (!Number.isFinite(port) || port <= 0) {
  throw new Error("PORT must be provided as a positive number");
}

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
