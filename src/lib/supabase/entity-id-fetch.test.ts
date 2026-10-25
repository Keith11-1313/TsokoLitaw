import { afterEach, describe, expect, it, vi } from "vitest";
import { entityIdFetch, stringifyEntityIds } from "./entity-id-fetch";
afterEach(() => vi.unstubAllGlobals());
describe("sequential entity ID transport", () => {
  it("keeps IDs as decimal strings while counts, prices and Auth UUIDs retain their types", () => {
    expect(
      stringifyEntityIds({
        id: 1,
        order_id: 27,
        quantity: 2,
        amount: 15,
        auth_user_id: "auth-uuid",
        location_ids: [1, 2],
      }),
    ).toEqual({
      id: "1",
      order_id: "27",
      quantity: 2,
      amount: 15,
      auth_user_id: "auth-uuid",
      location_ids: ["1", "2"],
    });
  });
  it("rejects unsafe or nonpositive numeric IDs", () => {
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() => stringifyEntityIds({ id })).toThrow();
  });
  it("transforms only REST responses and preserves PostgREST count headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('[{"id":1,"total":55}]', {
            headers: {
              "content-type": "application/json",
              "content-range": "0-0/1",
              "content-length": "20",
            },
          }),
      ),
    );
    const response = await entityIdFetch("https://example.test/rest/v1/orders");
    expect(await response.json()).toEqual([{ id: "1", total: 55 }]);
    expect(response.headers.get("content-range")).toBe("0-0/1");
    expect(response.headers.has("content-length")).toBe(false);
  });
  it("does not rewrite Auth, Storage or numeric count RPC responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("3", { headers: { "content-type": "application/json" } })),
    );
    expect(
      await (await entityIdFetch("https://example.test/rest/v1/rpc/count_admin_customers")).json(),
    ).toBe(3);
    expect(await (await entityIdFetch("https://example.test/auth/v1/user")).json()).toBe(3);
  });
  it("converts scalar entity-creation results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("3", { headers: { "content-type": "application/json" } })),
    );
    expect(
      await (await entityIdFetch("https://example.test/rest/v1/rpc/upsert_catalog_addon")).json(),
    ).toBe("3");
  });
  it("preserves REST errors and private Storage payloads", async () => {
    const error = { code: "42501", message: "permission denied" };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify(error), {
            status: 403,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const response = await entityIdFetch("https://example.test/rest/v1/rpc/upsert_catalog_addon");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(error);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"id":7}', {
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    expect(
      await (
        await entityIdFetch("https://example.test/storage/v1/object/info/private/file")
      ).json(),
    ).toEqual({ id: 7 });
  });
});
