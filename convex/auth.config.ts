import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: "https://clerk.cqtdev.cc/",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
