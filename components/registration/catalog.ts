"use client";
import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export function useCourses() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.registration.courses,
    {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (status === "CanLoadMore") {
      loadMore(50);
    }
  }, [status, loadMore]);
  return status === "Exhausted" ? results : undefined;
}
export function useSessions() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.registration.sessions,
    {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (status === "CanLoadMore") {
      loadMore(50);
    }
  }, [status, loadMore]);
  return status === "Exhausted" ? results : undefined;
}
export function useCoupons() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.registration.coupons,
    {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (status === "CanLoadMore") {
      loadMore(50);
    }
  }, [status, loadMore]);
  return status === "Exhausted" ? results : undefined;
}
