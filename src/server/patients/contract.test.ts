import { describe, expect, it } from "vitest";
import { patientApiPaths } from "@/server/patients/contract";

/**
 * The paths the browser reads patients by. These are the contract a screen is
 * written against, so they are observed rather than derived: a path that stops
 * naming a filter, or that sends an untouched search box as one, is a change no
 * screen test would notice.
 */
describe("patient read paths", () => {
  it("names the page and page size a list read is asked for", () => {
    expect(patientApiPaths.list({ page: 3, limit: 25 })).toBe(
      "/api/patients?page=3&limit=25"
    );
  });

  it("falls back to the first page and the default size", () => {
    expect(patientApiPaths.list()).toBe("/api/patients?page=1&limit=10");
  });

  it("carries a search as a filter on the same paged read", () => {
    expect(patientApiPaths.list({ search: "ada", page: 2, limit: 25 })).toBe(
      "/api/patients?page=2&limit=25&search=ada"
    );
  });

  it("sends no search at all for an untouched box, so it cannot match nothing", () => {
    expect(patientApiPaths.list({ search: "" })).toBe(
      "/api/patients?page=1&limit=10"
    );
  });

  it("escapes a search term rather than concatenating it raw", () => {
    expect(patientApiPaths.list({ search: "a b&c=d" })).toBe(
      "/api/patients?page=1&limit=10&search=a+b%26c%3Dd"
    );
  });

  it("escapes a patient id in the detail path", () => {
    expect(patientApiPaths.detail("a/b")).toBe("/api/patients/a%2Fb");
  });
});