import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(project, "config.json"), "utf8"));
const run = (command, args, options = {}) => execFileSync(command, args, { encoding: "utf8", timeout: 180_000, ...options }).trim();

export function validatePublication(provenance, tag, sha) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag) || !/^[a-f0-9]{40}$/.test(sha)) throw new Error("非法发布标识");
  if (provenance.tag !== tag || provenance.upstream_sha !== sha || provenance.image !== `${config.image}:${tag}-zh`) {
    throw new Error("构建溯源与待发布版本不一致");
  }
}

export function indexDigests(manifest) {
  return (manifest.manifests ?? []).map((item) => item.digest).sort();
}

export function publish() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (repository !== "le-shi/litellm-zh") throw new Error("发布目标必须是 le-shi/litellm-zh");
  const tag = process.env.UPSTREAM_TAG;
  const provenance = JSON.parse(fs.readFileSync("artifacts/provenance.json", "utf8"));
  validatePublication(provenance, tag, process.env.UPSTREAM_SHA);
  const translatedTag = `${tag}-zh`;
  const image = provenance.image;
  const digests = ["amd64", "arm64"].map((arch) => {
    const digest = fs.readFileSync(`digests/${arch}.txt`, "utf8").trim();
    if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error(`非法 ${arch} 镜像摘要`);
    return digest;
  });
  fs.mkdirSync("snapshot");
  run("git", ["clone", "--branch", "zh-source", "artifacts/source.bundle", "snapshot"]);
  const sourceSha = run("git", ["-C", "snapshot", "rev-parse", "HEAD"]);
  run("gh", ["auth", "setup-git"]);
  const remote = `https://github.com/${repository}.git`;
  const branch = `refs/heads/releases/${translatedTag}`;
  const existing = run("git", ["ls-remote", remote, branch]);
  if (existing) {
    run("git", ["-C", "snapshot", "fetch", "--depth=1", remote, branch]);
    const oldTree = run("git", ["-C", "snapshot", "rev-parse", "FETCH_HEAD^{tree}"]);
    const newTree = run("git", ["-C", "snapshot", "rev-parse", "HEAD^{tree}"]);
    if (oldTree !== newTree) throw new Error("版本源码分支已存在且内容不同，禁止强制覆盖");
  } else {
    run("git", ["-C", "snapshot", "push", remote, `HEAD:${branch}`]);
  }
  // 固定版本镜像不可覆盖；中途失败时可以重跑同一发布 job，继续使用已验证的构建产物。
  let publishedIndex = null;
  try {
    publishedIndex = JSON.parse(run("docker", ["buildx", "imagetools", "inspect", "--raw", image], { stdio: ["ignore", "pipe", "pipe"] }));
  } catch (error) {
    const stderr = error.stderr?.toString() ?? "";
    if (!/(?:not found|manifest unknown)/i.test(stderr)) throw new Error("无法确认目标镜像是否存在，拒绝覆盖或误发布");
  }
  if (publishedIndex) {
    const expected = digests.flatMap((digest) => {
      const manifest = JSON.parse(run("docker", ["buildx", "imagetools", "inspect", "--raw", `${config.image}@${digest}`]));
      return manifest.manifests?.length ? indexDigests(manifest) : [digest];
    }).sort();
    if (JSON.stringify(indexDigests(publishedIndex)) !== JSON.stringify(expected)) throw new Error("固定版本镜像已存在且摘要不同，禁止覆盖");
  } else {
    run("docker", ["buildx", "imagetools", "create", "--tag", image, ...digests.map((digest) => `${config.image}@${digest}`)]);
  }
  const finalManifest = JSON.parse(run("docker", ["buildx", "imagetools", "inspect", "--raw", image]));
  const platforms = finalManifest.manifests?.map((item) => `${item.platform?.os}/${item.platform?.architecture}`) ?? [];
  for (const platform of config.platforms) if (!platforms.includes(platform)) throw new Error(`发布镜像缺少 ${platform}`);
  const digestText = run("docker", ["buildx", "imagetools", "inspect", image]);
  fs.writeFileSync("artifacts/image-manifest.txt", digestText + "\n");
  const notes = `# LiteLLM ${translatedTag}\n\n` +
    `- 上游正式版：[${tag}](https://github.com/${config.upstream}/releases/tag/${tag})\n` +
    `- 上游提交：\`${provenance.upstream_sha}\`\n` +
    `- 汉化层提交：\`${provenance.overlay_sha}\`\n` +
    `- 中文源码提交：\`${sourceSha}\`\n` +
    `- 镜像：\`${image}\`\n` +
    `- 架构：linux/amd64、linux/arm64\n` +
    `- 静态文案替换：${provenance.replacements} 处；未覆盖文案见 translation-report.json。\n\n` +
    `固定中文版；不改写用户数据、接口字段、权限或模型调用逻辑。复用上游原始 Dockerfile、锁文件和 UI 构建方式。\n\n` +
    `附件包含原始上游源码、汉化源码、溯源信息和翻译报告。升级与数据库迁移要求仍以对应上游正式版为准。\n`;
  fs.writeFileSync("artifacts/release-notes.md", notes);
  const assets = ["upstream-source.tar.gz", "translated-source.tar.gz", "provenance.json", "translation-report.json", "image-manifest.txt"].map((name) => `artifacts/${name}`);
  const sums = assets.map((file) => `${run("sha256sum", [file]).split(" ")[0]}  ${path.basename(file)}`).join("\n") + "\n";
  fs.writeFileSync("artifacts/SHA256SUMS", sums);
  const gh = ["--repo", repository];
  // 构建成功前不创建正式 Release，上传附件结束后才从草稿转为正式。
  let release = null;
  try {
    release = JSON.parse(run("gh", ["release", "view", translatedTag, ...gh, "--json", "isDraft,targetCommitish"]));
  } catch (error) {
    if (!/release not found/i.test(error.stderr?.toString() ?? "")) throw error;
  }
  if (release && !release.isDraft) throw new Error("正式版本已存在，禁止覆盖");
  if (!release) run("gh", ["release", "create", translatedTag, ...gh, "--target", sourceSha, "--title", `LiteLLM ${translatedTag}`, "--notes-file", "artifacts/release-notes.md", "--draft"]);
  run("gh", ["release", "upload", translatedTag, ...gh, ...assets, "artifacts/SHA256SUMS", "--clobber"]);
  run("gh", ["release", "edit", translatedTag, ...gh, "--draft=false"]);
  console.log(`发布成功：https://github.com/${repository}/releases/tag/${translatedTag}\n镜像：${image}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { publish(); } catch (error) {
    console.error(`发布失败：${error.message}`);
    process.exitCode = 1;
  }
}
