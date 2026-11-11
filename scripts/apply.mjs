import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const displayAttributes = new Set([
  "title", "label", "description", "placeholder", "aria-label", "aria-description",
  "alt", "emptyText", "okText", "cancelText", "searchPlaceholder", "loadingText",
  "emptyMessage", "tooltip", "buttonText", "submitButtonLabel", "backButtonLabel",
]);
const notificationMethods = new Set(["success", "error", "info", "warning", "warn", "loading"]);
const protectedTags = new Set(["code", "pre", "script", "style", "textarea"]);

// 保留占位符、标记和业务值；只对词库中已有的静态显示文案作精确替换。
export function lookup(message, dictionary) {
  const key = message.replace(/\{\{(\w+)\}\}/g, "{$1}");
  const translated = dictionary[key];
  if (typeof translated !== "string") return null;
  const placeholders = (text) => [...text.matchAll(/\{\{?(\w+)\}?\}/g)].map((m) => m[1]).sort();
  if (JSON.stringify(placeholders(key)) !== JSON.stringify(placeholders(translated))) return null;
  return message.includes("{{") ? translated.replace(/\{(\w+)\}/g, "{{$1}}") : translated;
}

function jsxText(text) {
  const lines = text.replace(/\t/g, " ").split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((line, index) => { if (/\S/.test(line)) last = index; });
  return lines.map((line, index) => {
    let value = index === 0 ? line : line.replace(/^ +/, "");
    if (index !== lines.length - 1) value = value.replace(/ +$/, "");
    return value && index !== last ? `${value} ` : value;
  }).join("");
}

function protectedContent(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) {
      const opening = parent.openingElement;
      const tag = opening.tagName.getText();
      if (protectedTags.has(tag)) return true;
      const attributes = opening.attributes.properties;
      const has = (name) => attributes.some((item) => ts.isJsxAttribute(item) && item.name.getText() === name);
      // 原生 option 没有 value 时以文本作提交值，不能把业务值一起汉化。
      if (tag === "option" && !has("value")) return true;
      if (tag === "button" && has("name") && !has("value")) return true;
    }
  }
  return false;
}

function displayExpression(node) {
  let cursor = node;
  while (cursor.parent) {
    const parent = cursor.parent;
    if (ts.isParenthesizedExpression(parent)) cursor = parent;
    else if (ts.isConditionalExpression(parent) && parent.condition !== cursor) cursor = parent;
    else if (ts.isJsxExpression(parent)) {
      return !parent.parent || !ts.isJsxAttribute(parent.parent) || displayAttributes.has(parent.parent.name.getText());
    } else return false;
  }
  return false;
}

function presentationProperty(node) {
  const parent = node.parent;
  if (!ts.isPropertyAssignment(parent) || parent.initializer !== node) return false;
  if (!["label", "header", "title", "description"].includes(parent.name.getText().replace(/["']/g, ""))) return false;
  // 只允许导航、表列、页签等本地显示配置，禁止翻译任意请求对象里的同名字段。
  for (let cursor = parent.parent; cursor; cursor = cursor.parent) {
    if (ts.isCallExpression(cursor)) return false;
    if (ts.isVariableDeclaration(cursor) || ts.isFunctionDeclaration(cursor)) {
      return /(?:nav|menu|column|tab|option|item|field|section)/i.test(cursor.name?.getText() ?? "");
    }
  }
  return false;
}

export function transform(code, filename, dictionary) {
  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error(`上游源码无法解析：${filename}`);
  const edits = new Map();
  const missing = new Set();
  const contractValues = new Set();
  function collectContracts(node) {
    if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) contractValues.add(node.literal.text);
    if (ts.isEnumMember(node) && node.initializer && ts.isStringLiteral(node.initializer)) contractValues.add(node.initializer.text);
    ts.forEachChild(node, collectContracts);
  }
  collectContracts(source);
  function replace(node, value, jsx = false) {
    const key = value.trim();
    // 字符串字面量类型属于组件契约，保留调用参数，不为汉化扩大原有类型。
    if (contractValues.has(key) && !ts.isJsxText(node)) return;
    const translated = lookup(key, dictionary);
    if (translated === null || translated === key) {
      if (/[A-Za-z]{3}/.test(key) && key.length < 400) missing.add(key);
      return;
    }
    const result = value.replace(key, () => translated);
    const start = ts.isJsxText(node) ? node.pos : node.getStart(source);
    edits.set(start, { end: node.end, text: jsx ? `{${JSON.stringify(result)}}` : JSON.stringify(result) });
  }
  function visit(node) {
    if (protectedContent(node)) return;
    if (ts.isJsxText(node) && node.text.trim()) replace(node, jsxText(node.text), true);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && displayAttributes.has(parent.name.getText())) replace(node, node.text, true);
      else if (displayExpression(node) || presentationProperty(node)) replace(node, node.text);
      else if (ts.isCallExpression(parent) && parent.arguments[0] === node && ts.isPropertyAccessExpression(parent.expression)) {
        const receiver = parent.expression.expression.getText();
        if (["toast", "message", "notification"].includes(receiver) && notificationMethods.has(parent.expression.name.text)) replace(node, node.text);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  let result = code;
  for (const [start, edit] of [...edits].sort((a, b) => b[0] - a[0])) result = result.slice(0, start) + edit.text + result.slice(edit.end);
  if (ts.createSourceFile(filename, result, ts.ScriptTarget.Latest, false, filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS).parseDiagnostics.length) {
    throw new Error(`转换后源码无法解析：${filename}`);
  }
  return { code: result, replacements: edits.size, missing: [...missing].sort() };
}

export function localizeTree(value, dictionary, prefix = "", missing = []) {
  if (typeof value === "string") {
    const translated = lookup(value, dictionary);
    if (translated === null) missing.push({ key: prefix, english: value });
    return translated ?? value;
  }
  if (Array.isArray(value)) return value.map((item, index) => localizeTree(item, dictionary, `${prefix}.${index}`, missing));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeTree(item, dictionary, `${prefix}.${key}`, missing)]));
  return value;
}

export function applyOverlay(root, dictionary, minimum = 100) {
  const src = path.join(root, "ui/litellm-dashboard/src");
  const marker = path.join(root, ".litellm-zh.json");
  const fingerprint = hash(JSON.stringify(dictionary) + fs.readFileSync(fileURLToPath(import.meta.url)));
  if (fs.existsSync(marker)) {
    const previous = JSON.parse(fs.readFileSync(marker, "utf8"));
    if (previous.fingerprint !== fingerprint || previous.files.some((item) => hash(fs.readFileSync(path.join(root, item.path))) !== item.sha256)) {
      throw new Error("转换标记或文件已变化，请使用干净的上游版本重新转换，禁止叠加不同汉化层");
    }
    return previous;
  }
  const layoutPath = path.join(src, "app/layout.tsx");
  const layout = fs.readFileSync(layoutPath, "utf8");
  if (!/<html\s[^>]*lang="en"/.test(layout)) throw new Error("上游 HTML 入口结构已变化，停止发布并人工适配");
  const pending = new Map();
  const files = [];
  const missing = [];
  let replacements = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) { if (!/^(?:enterprise|__tests__|__mocks__)$/.test(entry.name)) walk(absolute); continue; }
      if (!/\.(?:ts|tsx)$/.test(entry.name) || /(?:\.d\.ts$|\.(?:test|spec|stories)\.|schema\.d\.ts$)/.test(entry.name)) continue;
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      const original = fs.readFileSync(absolute, "utf8");
      const result = transform(original, relative, dictionary);
      replacements += result.replacements;
      if (result.code !== original) pending.set(absolute, result.code);
      if (result.missing.length) missing.push({ path: relative, messages: result.missing });
    }
  }
  walk(src);
  const nativeLocale = path.join(src, "i18n/locales/en.json");
  const nativeMissing = [];
  if (fs.existsSync(nativeLocale)) {
    // 固定中文版沿用上游词库键和插值协议，不添加第二套运行时框架或依赖。
    const localized = localizeTree(JSON.parse(fs.readFileSync(nativeLocale, "utf8")), dictionary, "", nativeMissing);
    pending.set(nativeLocale, JSON.stringify(localized, null, 2) + "\n");
  }
  if (replacements < minimum) throw new Error(`仅命中 ${replacements} 处文案，低于门槛 ${minimum}，停止发布`);
  pending.set(layoutPath, (pending.get(layoutPath) ?? layout).replace(/(<html\s[^>]*lang=)"en"/, '$1"zh-CN"'));
  // 所有前置检查通过后才写入；构建配方、锁文件、后端和业务目录保持不变。
  for (const [absolute, content] of pending) {
    fs.writeFileSync(absolute, content);
    files.push({ path: path.relative(root, absolute).split(path.sep).join("/"), sha256: hash(content) });
  }
  const report = { language: "zh-CN", fingerprint, replacements, files, missing, nativeMissing };
  fs.writeFileSync(marker, JSON.stringify(report, null, 2) + "\n");
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = path.resolve(process.argv[2] ?? "source");
    const config = JSON.parse(fs.readFileSync(path.join(project, "config.json"), "utf8"));
    const dictionary = JSON.parse(fs.readFileSync(path.join(project, "translations/zh-CN.json"), "utf8"));
    const report = applyOverlay(root, dictionary, config.minimum_replacements);
    console.log(`汉化完成：${report.files.length} 个文件，${report.replacements} 处静态文案；报告：${path.join(root, ".litellm-zh.json")}`);
  } catch (error) {
    console.error(`汉化失败：${error.message}`);
    process.exitCode = 1;
  }
}
