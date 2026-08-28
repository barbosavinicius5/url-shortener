import { createApp } from "./app";

const DEFAULT_PORT = 3000;

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_PORT;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid PORT value "${raw}". Must be an integer between 1 and 65535.`,
    );
  }
  return parsed;
}

async function startServer(): Promise<void> {
  const port = parsePort(process.env.PORT);
  const app = createApp({ port });

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`URL Shortener API running on http://localhost:${port}`);
      resolve();
    });
  });
}

// Only start the server when this module is run directly (not imported)
if (require.main === module) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

export { startServer };