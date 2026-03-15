import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

const readRepoFile = (relativePath: string) =>
  readFileSync(path.join(repoRoot, relativePath), "utf8");

describe("GitHub Pages SPA routing support", () => {
  it("includes a dedicated 404 redirect page that preserves subpaths and query strings", () => {
    const html = readRepoFile("public/404.html");

    expect(html).toContain("var pathSegmentsToKeep = 1;");
    expect(html).toContain('"/?/"');
    expect(html).toContain('l.search ? "&" + l.search.slice(1).replace(/&/g, "~and~") : ""');
  });

  it("restores redirected deep links before the app router initialises", () => {
    const html = readRepoFile("index.html");

    expect(html).toContain("if (l.search[1] === '/')");
    expect(html).toContain("window.history.replaceState");
    expect(html).toContain("return s.replace(/~and~/g, '&');");
  });
});
