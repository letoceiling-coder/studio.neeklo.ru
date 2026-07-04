import { getUserByUsername, createApiKey, createUser } from "/opt/neeklo-platform/src/services/users.js";
import { getDb } from "/opt/neeklo-platform/src/db.js";

const MODEL_KEY = "nk_f663da26789f775f51d5372ada1353b9fee0099b2d3f2c55";

let u = getUserByUsername("studio");
if (!u) {
  u = createUser(
    {
      username: "studio",
      email: "studio@neeklo.ru",
      password: "StudioNeeklo2026!",
      displayName: "Studio Service",
    },
    "127.0.0.1",
  );
  console.log("Created platform user: studio");
}

getDb()
  .prepare("UPDATE users SET model_api_key = ? WHERE id = ?")
  .run(MODEL_KEY, u.id);

const r = createApiKey(
  u.id,
  { name: "studio-backend", scopes: "read,write,chat", apiVersion: "v1" },
  "127.0.0.1",
);

console.log("NEEKLO_PLATFORM_API_KEY=" + r.key);
console.log("NEEKLO_PLATFORM_USER=studio");
