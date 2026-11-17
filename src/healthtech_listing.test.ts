import assert from "node:assert/strict";
import { notificationDecision } from "./healthtech_listing.ts";

assert.equal(notificationDecision({ appointmentConfirmed: false }), "hold_for_review");
assert.equal(notificationDecision({ appointmentConfirmed: true }), "send");
console.log("healthtech notification decision: passed");
