const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const StoreConnection = require("../core/storeConnection.model");

function extractRawReviewId(platform, appId, reviewId) {
  const idStr = String(reviewId || "");
  const prefix = `${platform}-${appId}-`;
  if (idStr.startsWith(prefix)) {
    return idStr.slice(prefix.length);
  }
  const simplePrefix = `${platform}-`;
  if (idStr.startsWith(simplePrefix)) {
    return idStr.slice(simplePrefix.length);
  }
  return idStr;
}

async function publishToGooglePlay(review, replyText, credentials) {
  const rawJson = credentials.serviceAccountJson || credentials.apiKey;
  if (!rawJson) {
    return { published: false, reason: "Google Play Service Account JSON not configured" };
  }

  const parsed = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
  if (!parsed?.client_email || !parsed?.private_key) {
    throw new Error("Invalid Google Service Account JSON (missing client_email or private_key)");
  }

  const auth = new google.auth.JWT({
    email: parsed.client_email,
    key: parsed.private_key,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const androidpublisher = google.androidpublisher({ version: "v3", auth });
  const rawReviewId = extractRawReviewId("google", review.appId, review.reviewId);

  await androidpublisher.reviews.reply({
    packageName: review.appId,
    reviewId: rawReviewId,
    requestBody: { replyText },
  });

  return { published: true };
}

async function publishToAppStore(review, replyText, credentials) {
  const { keyId, issuerId, privateKey } = credentials || {};
  if (!keyId || !issuerId || !privateKey) {
    return { published: false, reason: "App Store Connect Key ID, Issuer ID, or .p8 Private Key not configured" };
  }

  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      iss: issuerId,
      iat: now,
      exp: now + 15 * 60,
      aud: "appstoreconnect-v1",
    },
    privateKey,
    {
      algorithm: "ES256",
      header: { alg: "ES256", kid: keyId, typ: "JWT" },
    }
  );

  const rawReviewId = extractRawReviewId("apple", review.appId, review.reviewId);
  const resp = await fetch("https://api.appstoreconnect.apple.com/v1/customerReviewResponses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "customerReviewResponses",
        attributes: { responseBody: replyText },
        relationships: {
          review: {
            data: { type: "customerReviews", id: rawReviewId },
          },
        },
      },
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`App Store Connect API error (${resp.status}): ${errBody.slice(0, 200)}`);
  }

  return { published: true };
}

/**
 * Attempts to publish an approved review reply to the connected store API.
 * Falls back cleanly to "Approved" when no store credentials are configured.
 */
async function publishStoreReply(review, replyText, userId) {
  const platform = String(review.platform || "").toLowerCase();
  const query = { platform, status: "Active" };
  if (userId) {
    query.user = userId;
  }
  const connection = await StoreConnection.findOne(query);

  if (!connection) {
    return {
      published: false,
      status: "Approved",
      message: "Reply approved & saved. Connect store credentials in Integrations to publish live.",
    };
  }

  try {
    if (platform === "google") {
      const res = await publishToGooglePlay(review, replyText, connection.credentials || {});
      if (res.published) {
        return { published: true, status: "Published", message: "Reply published live to Google Play!" };
      }
      return { published: false, status: "Approved", message: res.reason };
    }

    if (platform === "apple") {
      const res = await publishToAppStore(review, replyText, connection.credentials || {});
      if (res.published) {
        return { published: true, status: "Published", message: "Reply published live to App Store Connect!" };
      }
      return { published: false, status: "Approved", message: res.reason };
    }

    return {
      published: false,
      status: "Approved",
      message: `Reply approved & saved (${platform} does not expose a public reply API).`,
    };
  } catch (err) {
    return {
      published: false,
      status: "Approved",
      error: err.message,
      message: `Reply saved as Approved, but store publish failed: ${err.message}`,
    };
  }
}

module.exports = { publishStoreReply };
