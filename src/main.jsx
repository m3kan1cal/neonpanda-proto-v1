import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Amplify } from "aws-amplify";
import "./index.css";
import App from "./App.jsx";
import { logger } from "./utils/logger";

// Handle missing amplify_outputs.json during initial build
let outputs = null;
try {
  outputs = await import("../amplify_outputs.json");
  if (outputs?.default && Object.keys(outputs.default).length > 0) {
    Amplify.configure(outputs.default);
  } else {
    logger.warn("Amplify outputs empty - running without auth");
  }
} catch (error) {
  logger.warn("Amplify outputs not found - running without auth");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
