import assert from "node:assert/strict";
import test from "node:test";
import { indexDigests, sourceCommitForRelease, validatePublication } from "../scripts/publish.mjs";

test("发布前核对版本、镜像地址和精确上游提交", () => {
  const sha = "a".repeat(40);
  const provenance = { tag: "v1.109.0", upstream_sha: sha, image: "ghcr.io/le-shi/litellm:v1.109.0-zh" };
  assert.doesNotThrow(() => validatePublication(provenance, "v1.109.0", sha));
  assert.throws(() => validatePublication(provenance, "v1.108.4", sha), /不一致/);
  assert.throws(() => validatePublication(provenance, "v1.109.0", "b".repeat(40)), /不一致/);
  assert.throws(() => validatePublication({ ...provenance, image: "ghcr.io/berriai/litellm:v1.109.0" }, "v1.109.0", sha), /不一致/);
  assert.deepEqual(indexDigests({ manifests: [{ digest: "b" }, { digest: "a" }] }), ["a", "b"]);
});

test("同内容源码分支已存在时复用远端提交，避免 Release 指向未推送的重建提交", () => {
  assert.equal(sourceCommitForRelease("new", null, "tree", "tree"), "new");
  assert.equal(sourceCommitForRelease("new", "published", "tree", "tree"), "published");
  assert.throws(() => sourceCommitForRelease("new", "published", "old", "changed"), /内容不同/);
});
