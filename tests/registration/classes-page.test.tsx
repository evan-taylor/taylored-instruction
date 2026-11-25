import { expect, it, vi } from "vitest";
import Page from "../../app/(app)/classes/page";

const mocks = vi.hoisted(() => ({ fetchQuery: vi.fn() }));
vi.mock("convex/nextjs", () => ({ fetchQuery: mocks.fetchQuery }));
vi.mock("../../components/registration/public", () => ({
  ClassDiscovery: () => null,
}));

it("renders the first page for the first of repeated q parameters, as the client reads it", async () => {
  mocks.fetchQuery.mockResolvedValue({ page: [] });
  const element = await Page({
    searchParams: Promise.resolve({ q: [" BLS ", "cpr"] }),
  });
  expect(mocks.fetchQuery).toHaveBeenCalledWith(expect.anything(), {
    paginationOpts: { numItems: 20, cursor: null },
    search: "bls",
  });
  const discovery = element.props.children.at(-1);
  expect(discovery.props.initial).toEqual({ search: "bls", page: [] });
});
