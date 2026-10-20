import { beforeEach, expect, it, vi } from "vitest";
import { getPublicFeaturedReviews } from "./server-reviews";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), range: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/server-image-validation", () => ({ validateUploadedImage: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockReturnValue({ range: mocks.range });
  mocks.range.mockResolvedValue({ data: [], count: 30, error: null });
});
it("disables the legacy total limit and requests only the current page", async () => {
  const result = await getPublicFeaturedReviews(2);
  expect(mocks.rpc).toHaveBeenCalledWith(
    "get_public_featured_reviews",
    { result_limit: null },
    { count: "exact" },
  );
  expect(mocks.range).toHaveBeenCalledWith(12, 23);
  expect(result.totalCount).toBe(30);
});
it("normalizes invalid pages and reports errors instead of silently hiding reviews", async () => {
  await getPublicFeaturedReviews(NaN);
  expect(mocks.range).toHaveBeenCalledWith(0, 11);
  mocks.range.mockResolvedValue({ error: new Error("offline") });
  await expect(getPublicFeaturedReviews()).rejects.toThrow("Featured reviews could not be loaded");
});
