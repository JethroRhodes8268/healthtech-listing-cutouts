import { InfraiClient } from "./infrai_client.ts";
import { randomUUID } from "node:crypto";

export type ListingRequest = {
  listingId: string;
  imageBase64: string;
  filename: string;
  appointmentConfirmed: boolean;
};

export type NotificationDecision = "send" | "hold_for_review";

export function notificationDecision(input: Pick<ListingRequest, "appointmentConfirmed">): NotificationDecision {
  return input.appointmentConfirmed ? "send" : "hold_for_review";
}

export function validateListingRequest(input: unknown): ListingRequest {
  if (!input || typeof input !== "object") throw new Error("Request body must be an object");
  const value = input as Record<string, unknown>;
  if (typeof value.listingId !== "string" || value.listingId.length === 0) throw new Error("listingId is required");
  if (typeof value.imageBase64 !== "string" || value.imageBase64.length === 0) throw new Error("imageBase64 is required");
  if (typeof value.filename !== "string" || value.filename.length === 0) throw new Error("filename is required");
  if (typeof value.appointmentConfirmed !== "boolean") throw new Error("appointmentConfirmed is required");
  return value as unknown as ListingRequest;
}

export async function processListing(input: unknown, client: InfraiClient) {
  const request = validateListingRequest(input);
  const bucket = process.env.INFRAI_STORAGE_BUCKET;
  if (!bucket) throw new Error("INFRAI_STORAGE_BUCKET is required");
  const capability = "image.background_remove";
  const cutout = await client.request<{ data_base64?: string }>("/v1/" + capability.replace(".", "/"), "POST", {
    image: request.imageBase64,
    format: "png"
  });
  const objectKey = `${request.listingId}/${randomUUID()}-${request.filename}`;
  await client.request("/v1/storage/object/put/" + encodeURIComponent(bucket) + "/" + encodeURIComponent(objectKey), "PUT", {
    data_base64: cutout.data_base64 ?? request.imageBase64,
    content_type: "image/png"
  });
  return { listingId: request.listingId, objectKey, notification: notificationDecision(request) };
}
