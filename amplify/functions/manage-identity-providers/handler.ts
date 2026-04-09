import { createOkResponse, createErrorResponse } from "../libs/api-helpers";
import { withAuth, AuthenticatedHandler } from "../libs/auth/middleware";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  AdminDisableProviderForUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { logger } from "../libs/logger";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const USER_POOL_ID = process.env.USER_POOL_ID;

type Action = "list" | "set-password" | "disconnect";

interface RequestBody {
  action: Action;
  provider?: string;
  password?: string;
}

const baseHandler: AuthenticatedHandler = async (event) => {
  logger.info("manage-identity-providers event:", {
    userId: event.user.userId,
    path: event.rawPath,
  });

  let body: RequestBody;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return createErrorResponse(400, "Invalid JSON in request body");
  }

  if (!body.action) {
    return createErrorResponse(400, "action is required");
  }

  if (!USER_POOL_ID) {
    logger.error("USER_POOL_ID environment variable not set");
    return createErrorResponse(500, "Server configuration error");
  }

  // Get the Cognito username (sub) from the JWT authorizer claims
  const cognitoSub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!cognitoSub) {
    return createErrorResponse(401, "Could not determine Cognito identity");
  }
  const cognitoUsername = String(cognitoSub);

  switch (body.action) {
    case "list": {
      const cognitoUser = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: cognitoUsername,
        }),
      );

      const identitiesAttr = cognitoUser.UserAttributes?.find(
        (a) => a.Name === "identities",
      );

      let linkedProviders: Array<{
        providerName: string;
        providerType: string;
      }> = [];

      if (identitiesAttr?.Value) {
        try {
          const identities = JSON.parse(identitiesAttr.Value);
          linkedProviders = identities.map((id: any) => ({
            providerName: id.providerName,
            providerType: id.providerType,
          }));
        } catch {
          // ignore parse errors — return empty
        }
      }

      // EXTERNAL_PROVIDER status means the user was created via federated sign-in
      // and has never had a native Cognito password set
      const hasPassword = cognitoUser.UserStatus !== "EXTERNAL_PROVIDER";
      const isGoogleLinked = linkedProviders.some(
        (p) => p.providerName === "Google",
      );

      return createOkResponse({
        linkedProviders,
        hasPassword,
        isGoogleLinked,
        email: cognitoUser.UserAttributes?.find((a) => a.Name === "email")
          ?.Value,
        userStatus: cognitoUser.UserStatus,
      });
    }

    case "set-password": {
      if (!body.password || body.password.length < 8) {
        return createErrorResponse(
          400,
          "Password must be at least 8 characters",
        );
      }

      // Password complexity: uppercase, lowercase, number, special char
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
      if (!passwordRegex.test(body.password)) {
        return createErrorResponse(
          400,
          "Password must contain uppercase, lowercase, number, and special character",
        );
      }

      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: cognitoUsername,
          Password: body.password,
          Permanent: true,
        }),
      );

      logger.info(`Password set for user: ${event.user.userId}`);
      return createOkResponse({
        success: true,
        message: "Password set successfully",
      });
    }

    case "disconnect": {
      if (!body.provider) {
        return createErrorResponse(
          400,
          "provider is required for disconnect action",
        );
      }

      // Fetch current state to enforce safety constraint
      const checkUser = await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: cognitoUsername,
        }),
      );

      const hasUsablePassword = checkUser.UserStatus !== "EXTERNAL_PROVIDER";
      const identitiesStr = checkUser.UserAttributes?.find(
        (a) => a.Name === "identities",
      )?.Value;

      let providerCount = 0;
      if (identitiesStr) {
        try {
          providerCount = JSON.parse(identitiesStr).length;
        } catch {
          /* ignore */
        }
      }

      // Safety: never leave a user with no sign-in method
      if (!hasUsablePassword && providerCount <= 1) {
        return createErrorResponse(
          400,
          "Cannot disconnect your only sign-in method. Set a password first.",
        );
      }

      let providerSubjectId: string | undefined;
      if (identitiesStr) {
        try {
          const identities = JSON.parse(identitiesStr);
          const providerIdentity = identities.find(
            (id: any) => id.providerName === body.provider,
          );
          providerSubjectId = providerIdentity?.userId;
        } catch {
          /* ignore */
        }
      }

      if (!providerSubjectId) {
        return createErrorResponse(
          400,
          "Provider not found or unable to disconnect",
        );
      }

      await cognitoClient.send(
        new AdminDisableProviderForUserCommand({
          UserPoolId: USER_POOL_ID,
          User: {
            ProviderName: body.provider,
            ProviderAttributeName: "Cognito_Subject",
            ProviderAttributeValue: providerSubjectId,
          },
        }),
      );

      logger.info(
        `Disconnected provider ${body.provider} for user: ${event.user.userId}`,
      );
      return createOkResponse({ success: true });
    }

    default:
      return createErrorResponse(400, `Unknown action: ${body.action}`);
  }
};

export const handler = withAuth(baseHandler);
