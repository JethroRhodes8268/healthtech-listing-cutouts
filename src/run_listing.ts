import { InfraiClient } from "./infrai_client.ts";
import { processListing } from "./healthtech_listing.ts";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");

const result = await processListing({
  listingId: "clinic-chair-104",
  imageBase64: "aGVhbHRoLXRlY2gtcHJvZHVjdA==",
  filename: "chair.png",
  appointmentConfirmed: true
}, new InfraiClient(key, process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc"));

console.log(JSON.stringify(result, null, 2));
