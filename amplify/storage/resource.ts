import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "amplifyTodoDrive",
  access: (allow: any) => ({
    "media/{entity_id}/*": [allow.entity("identity").to(["read", "write", "delete"])],
  }),
});