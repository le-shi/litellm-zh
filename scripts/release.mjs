import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { applyOverlay } from "./apply.mjs";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(project, "config.json"), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const git = (root, ...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", timeout: 180_000 }).trim();

export function version(tag) {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  const parts = match?.slice(1).map(Number);
  return parts?.every(Number.isSafeInteger) ? parts : null;
}

export function compareVersions(left, right) {
  const a = version(left), b = version(right);
  if (!a || !b) throw new Error("版本号不是正式语义版本");
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
}

export function eligible(release) {
  return release?.draft === false && release?.prerelease === false &&
    /^v\d+\.\d+\.\d+$/.test(release.tag_name) &&
    version(release.tag_name) !== null && compareVersions(release.tag_name, config.minimum_version) >= 0;
}

export function selectRelease(releases) {
  return releases.filter(eligible).sort((a, b) => compareVersions(b.tag_name, a.tag_name))[0] ?? null;
}

// 网络错误有限重试；404 是“尚未发布”，不能把权限或服务故障当成成功。
export async function github(endpoint, { missing = false } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`https://api.github.com/${endpoint}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
        },
        signal: AbortSignal.timeout(25_000),
      });
      if (missing && response.status === 404) return null;
      if (response.ok) return await response.json();
      if (response.status < 500 && response.status !== 429) throw new Error(`GitHub HTTP ${response.status}：${endpoint}`);
      if (attempt === 2) throw new Error(`GitHub 服务暂不可用：HTTP ${response.status}`);
    } catch (error) {
      if (attempt === 2 || /^GitHub HTTP/.test(error.message)) throw error;
    }
    await sleep(Math.min(4_000, 500 * 2 ** attempt + Math.random() * 500));
  }
}

async function resolveTag(tag) {
  const ref = await github(`repos/${config.upstream}/git/ref/tags/${encodeURIComponent(tag)}`);
  let object = ref.object;
  for (let depth = 0; object.type === "tag" && depth < 4; depth++) {
    object = (await github(`repos/${config.upstream}/git/tags/${object.sha}`)).object;
  }
  if (object.type !== "commit" || !/^[a-f0-9]{40}$/.test(object.sha)) throw new Error("上游 Tag 未指向有效提交");
  return object.sha;
}

export async function discover(tag = "") {
  const repository = process.env.GITHUB_REPOSITORY ?? "le-shi/litellm-zh";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("非法目标仓库");
  let release;
  if (tag) {
    if (!/^v\d+\.\d+\.\d+$/.test(tag) || !version(tag)) throw new Error("手动版本只能使用 vX.Y.Z，禁止 RC、分支和任意 Git 引用");
    release = await github(`repos/${config.upstream}/releases/tags/${tag}`);
  } else {
    // 合并官方 latest 与最近列表，避免旧维护分支晚发补丁导致版本倒退。
    const [latest, recent] = await Promise.all([
      github(`repos/${config.upstream}/releases/latest`),
      github(`repos/${config.upstream}/releases?per_page=100`),
    ]);
    release = selectRelease([latest, ...recent]);
  }
  if (!release || !eligible(release)) throw new Error(`没有 >= ${config.minimum_version} 的正式 Release`);
  const translatedTag = `${release.tag_name}-zh`;
  const existing = await github(`repos/${repository}/releases/tags/${translatedTag}`, { missing: true });
  const upstreamSha = await resolveTag(release.tag_name);
  if (existing && !existing.draft && !existing.body?.includes(upstreamSha)) {
    throw new Error("正式版本已存在但上游 SHA 不一致，禁止静默覆盖或忽略上游 Tag 变更");
  }
  const result = {
    tag: release.tag_name,
    translated_tag: translatedTag,
    upstream_sha: upstreamSha,
    release_url: release.html_url,
    image: `${config.image}:${translatedTag}`,
    publish: existing === null || existing.draft === true,
  };
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(""));
  }
  return result;
}

export function prepare(root, tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag) || !version(tag) || compareVersions(tag, config.minimum_version) < 0) throw new Error("拒绝不支持的版本");
  if (git(root, "status", "--porcelain")) throw new Error("只允许转换干净的上游 checkout");
  const upstreamSha = git(root, "rev-parse", "HEAD");
  if (process.env.UPSTREAM_SHA && upstreamSha !== process.env.UPSTREAM_SHA) throw new Error("上游源码 SHA 与发现阶段不一致");
  const dockerfile = fs.readFileSync(path.join(root, "Dockerfile"));
  if (!/AS ui-builder/i.test(dockerfile.toString()) || !dockerfile.includes(Buffer.from("RUN npm run build"))) {
    throw new Error("上游 Dockerfile 不再包含既定 UI 构建阶段，需要人工适配");
  }
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/test-merge-smoke.yml"));
  if (!workflow.toString().includes("docker build --target ui-builder -f Dockerfile .")) {
    throw new Error("上游公开构建流程已变化，停止复用并人工复核");
  }
  const dictionaryBytes = fs.readFileSync(path.join(project, "translations/zh-CN.json"));
  const report = applyOverlay(root, JSON.parse(dictionaryBytes), config.minimum_replacements);
  const provenance = {
    upstream: config.upstream, tag, upstream_sha: upstreamSha,
    overlay_sha: process.env.GITHUB_SHA ?? git(project, "rev-parse", "HEAD"),
    dockerfile_sha256: sha256(dockerfile),
    reused_workflow: ".github/workflows/test-merge-smoke.yml",
    reused_workflow_sha256: sha256(workflow),
    reused_ui_command: "docker build --target ui-builder -f Dockerfile .",
    build_recipe: "Dockerfile", dictionary_sha256: sha256(dictionaryBytes),
    image: `${config.image}:${tag}-zh`, language: config.language,
    replacements: report.replacements, changed_files: report.files.length,
  };
  fs.mkdirSync(path.join(root, ".zh"));
  fs.writeFileSync(path.join(root, ".zh/provenance.json"), JSON.stringify(provenance, null, 2) + "\n");
  // 保留上游自动化作为审计材料，但不在发布分支执行其全部 CI 和管理任务。
  fs.renameSync(path.join(root, ".github/workflows"), path.join(root, ".zh/upstream-workflows"));
  if (sha256(fs.readFileSync(path.join(root, "Dockerfile"))) !== provenance.dockerfile_sha256) throw new Error("禁止改写上游 Dockerfile");
  return provenance;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const command = process.argv[2];
    const result = command === "discover" ? await discover(process.env.REQUESTED_TAG ?? "") :
      command === "prepare" ? prepare(path.resolve(process.argv[3] ?? "source"), process.env.UPSTREAM_TAG ?? "") :
      (() => { throw new Error("命令必须为 discover 或 prepare"); })();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`发布准备失败：${error.message}`);
    process.exitCode = 1;
  }
}
