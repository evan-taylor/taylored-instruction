"use client";
import { usePaginatedQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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

export function useOrganizations() {
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.registrationGroups.organizations,
    {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (pageStatus === "CanLoadMore") {
      loadMore(50);
    }
  }, [pageStatus, loadMore]);
  return pageStatus === "Exhausted" ? results : undefined;
}

export function useGroupRequests(
  status?: "new" | "contacted" | "quoted" | "scheduled" | "closed"
) {
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.registrationGroups.groupRequests,
    status ? { status } : {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (pageStatus === "CanLoadMore") {
      loadMore(50);
    }
  }, [pageStatus, loadMore]);
  return pageStatus === "Exhausted" ? results : undefined;
}

export function useOrganizationOrders(id: Id<"registrationOrganizations">) {
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.registrationGroups.organizationOrders,
    { id },
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (pageStatus === "CanLoadMore") {
      loadMore(50);
    }
  }, [pageStatus, loadMore]);
  return pageStatus === "Exhausted" ? results : undefined;
}

export function useAssignedSessions() {
  const {
    results,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.registrationOperations.assignedSessions,
    {},
    { initialNumItems: 50 }
  );
  useEffect(() => {
    if (pageStatus === "CanLoadMore") {
      loadMore(50);
    }
  }, [pageStatus, loadMore]);
  return pageStatus === "Exhausted" ? results : undefined;
}
