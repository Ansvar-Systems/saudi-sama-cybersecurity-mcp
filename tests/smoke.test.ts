/**
 * Smoke test — verifies the database opens, the schema exists, and the
 * ingested data contains the expected framework/control/circular counts.
 *
 * This is a placeholder until proper contract tests are added.
 */

import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const DB_PATH = process.env["SAMA_DB_PATH"] ?? "data/sama.db";

describe("SAMA database smoke", () => {
  it("database file exists", () => {
    expect(existsSync(DB_PATH)).toBe(true);
  });

  it("schema has frameworks, controls, circulars tables", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('frameworks','controls','circulars')",
      )
      .all() as { name: string }[];
    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual(["circulars", "controls", "frameworks"]);
    db.close();
  });

  it("contains at least the SAMA Cyber Security Framework", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const csf = db
      .prepare("SELECT name FROM frameworks WHERE id = 'sama-csf'")
      .get() as { name: string } | undefined;
    // Real ingestion: "Cyber Security Framework"; seed-sample: "SAMA Cybersecurity Framework".
    expect(csf?.name).toMatch(/Cyber ?[Ss]ecurity Framework/);
    db.close();
  });

  it("contains a reasonable number of controls and circulars", () => {
    const db = new Database(DB_PATH, { readonly: true });
    const controls = (db.prepare("SELECT COUNT(*) AS n FROM controls").get() as {
      n: number;
    }).n;
    const circulars = (db
      .prepare("SELECT COUNT(*) AS n FROM circulars")
      .get() as { n: number }).n;
    // Real ingestion yields 300+ controls and 10+ circulars; sample seed
    // yields smaller counts. Accept either.
    expect(controls).toBeGreaterThanOrEqual(10);
    expect(circulars).toBeGreaterThanOrEqual(1);
    db.close();
  });
});
