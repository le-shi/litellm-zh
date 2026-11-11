import assert from "node:assert/strict";
import test from "node:test";
import { compareVersions, eligible, selectRelease, version } from "../scripts/release.mjs";

const release = (tag_name, extra = {}) => ({ tag_name, draft: false, prerelease: false, ...extra });

test("仅接纳 >= 1.108.0 的正式发行版，版本号按数字比较", () => {
  assert.equal(eligible(release("v1.108.0")), true);
  assert.equal(eligible(release("v1.109.0")), true);
  for (const item of [release("v1.107.99"), release("v1.104.9"), release("v1.110.0-rc.1"), release("v1.110.0", { prerelease: true }), release("v1.110.0", { draft: true }), release("v01.108.0")]) assert.equal(eligible(item), false);
  assert.equal(version("v1.108.0; echo secret"), null);
  assert.equal(version("v999999999999999999999.108.0"), null);
  assert.ok(compareVersions("v1.109.0", "v1.108.99") > 0);
  assert.ok(compareVersions("v1.108.10", "v1.108.9") > 0);
  assert.equal(selectRelease([release("v1.104.9"), release("v1.109.0"), release("v1.108.5"), release("v1.110.0-rc.1")]).tag_name, "v1.109.0");
  assert.equal(selectRelease([release("v1.107.9")]), null);
});
