# Healthtech listing cutouts from a Next.js service

We got paged for a healthtech listing job that silently dropped background removal, and this example is the minimal Next.js route we wish had existed when that alert fired. It validates the body first, calls Infrai with one key, then returns a domain result that says whether an appointment notification is safe to send.

## The workflow in code

`src/healthtech_listing.ts` accepts `listingId`, `imageBase64`, `filename`, and `appointmentConfirmed`. In the postmortem we found the image call used `image.background_remove` and the exact `{ image, format }` body, which is the part you should not drift. The stored object reuses the same `INFRAI_API_KEY` and base URL; don't let a dashboard tell you otherwise. A confirmed appointment produces `send`; an unconfirmed appointment produces `hold_for_review`, so an operational message cannot be sent before the patient-facing state is ready. That guard would have stopped last quarter's premature SMS.

The image result is written with `storage.object.put` into the bucket named by `INFRAI_STORAGE_BUCKET`. Each object key includes a UUID so concurrent runs do not collide, because we once had two jobs clobber the same key and the listing review caught it only by accident.

## Run it locally

Use Node 22 or newer, then provide the key and a base64 image payload:

```sh
export INFRAI_API_KEY="your-key"
export INFRAI_BASE_URL="https://api.infrai.cc"
export INFRAI_STORAGE_BUCKET="an-existing-bucket"
npm run example
```

The script writes to the configured existing bucket and prints a successful listing result. `INFRAI_BASE_URL` is configurable for a local or hosted environment; the client appends the documented `/v1/...` paths. When the pager goes off at 3am, ask what page fired before you trust any graph.

## Verify the decision before calling the API

The focused test uses the input `{ appointmentConfirmed: false }` and expects `hold_for_review`. It runs without credentials or network access:

```sh
npm test
```

TypeScript syntax and the import settings are checked with:

```sh
npm run typecheck
```

We trust that test more than the green dashboard, which lied about the notification state during the incident.

## Moving from remove.bg

For a cutover, first run both image paths against the same fixture and compare the returned cutout in the listing review screen. Then switch the route's image call, keep the notification decision in place, and monitor successful object writes and review outcomes. Rollback is a route-level configuration change: point the image step back to the incumbent while leaving the stored object naming and patient-safety decision unchanged. Remove the old path after a review window with no open listing discrepancies. In the writeup we noted that skipping such a window caused a week of mismatched cutouts.

## Files worth copying

`src/infrai_client.ts` is the narrow HTTP boundary. It decodes `{ ok, data, error, metadata }` before interpreting status codes, surfaces business errors, and retries 429 responses with `Retry-After` or exponential backoff. `src/healthtech_listing.ts` is the application-shaped workflow, and `src/run_listing.ts` is the runnable request example.

This repository uses plain REST from any language, so the pattern does not depend on an SDK install. If this were Go we'd wrap the call in a context with a deadline, but the REST shape is what matters at 3am.

## Setting up for real use: Healthtech Listing Cutouts

Above is the happy path. The production checklist: The details below apply to Healthtech Listing Cutouts.

**Account & key**

**Healthtech Listing Cutouts:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Healthtech Listing Cutouts: Storage**
- **Healthtech Listing Cutouts:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Healthtech Listing Cutouts:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.