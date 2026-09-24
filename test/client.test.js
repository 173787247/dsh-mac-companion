import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { listDevices, resolveDevice } from "../lib/companion_client.js";

describe("mac companion client", () => {
  it("lists", () => {
    assert.equal(
      listDevices([{ id: "mac", baseUrl: "http://127.0.0.1:18765/" }])[0].baseUrl,
      "http://127.0.0.1:18765",
    );
  });
  it("resolves", () => {
    assert.equal(resolveDevice([{ id: "mac", baseUrl: "http://x" }], "mac").id, "mac");
  });
});
