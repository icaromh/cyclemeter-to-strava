import { serve } from "@hono/node-server";
import { env } from "./config/env";
import { app } from "./app";

serve(
  {
    fetch: app.fetch,
    port: env.PORT
  },
  (info) => {
    console.log(`Backend listening on http://localhost:${info.port}`);
  }
);

