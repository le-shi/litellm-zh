import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyOverlay, localizeTree, lookup, transform } from "../scripts/apply.mjs";

const dictionary = { Home: "首页", Models: "模型", Save: "保存", Name: "名称", "Select a model": "选择模型", "Saved {count} items": "已保存 {count} 项" };

test("翻译 JSX 文案、显示属性和通知，保留接口值与代码示例", () => {
  const original = `const columns = [{ header: "Name", accessorKey: "Name" }];
    function Page() { toast.success("Save"); fetch("/Models", {body: JSON.stringify({name:"Home",description:"Save"})});
    return <><h1>Models</h1><input placeholder="Select a model" name="Name" value="Home"/>
    <button>{true ? "Save" : "Home"}</button><pre><code>Home</code></pre><span>{model.name}</span></>; }`;
  const { code, replacements } = transform(original, "page.tsx", dictionary);
  assert.equal(replacements, 6);
  assert.ok(code.includes('header: "名称", accessorKey: "Name"'));
  assert.ok(code.includes('<h1>{"模型"}</h1>'));
  assert.ok(code.includes('placeholder={"选择模型"} name="Name" value="Home"'));
  assert.ok(code.includes('toast.success("保存")'));
  assert.ok(code.includes('{name:"Home",description:"Save"}'));
  assert.ok(code.includes('<pre><code>Home</code></pre>'));
  assert.ok(code.includes('{model.name}'));
});

test("不翻译条件判断、状态枚举、路由和非显示属性", () => {
  const code = `const role="Home"; const payload={label:"Home",title:"Models"};
    const options=[{label:"Models",value:"Models"}];
    function View(){return <a href="Home" data-testid="Models">{role === "Home" ? "Save" : "Home"}</a>}`;
  const result = transform(code, "view.tsx", dictionary).code;
  assert.ok(result.includes('role === "Home" ? "保存" : "首页"'));
  assert.ok(result.includes('const payload={label:"Home",title:"Models"}'));
  assert.ok(result.includes('label:"模型",value:"Models"'));
  assert.ok(result.includes('href="Home" data-testid="Models"'));
});

test("保留换行排版含义且安全转义 JSX 特殊字符", () => {
  const code = transform('<p>\n  Models\n</p>', "view.tsx", { Models: "模型 <测试> {说明}" }).code;
  assert.equal(code, '<p>{"模型 <测试> {说明}"}</p>');
  assert.equal(transform(code, "view.tsx", dictionary).replacements, 0);
});

test("原生 i18next 插值保持双括号，缺少占位符的词条拒绝替换", () => {
  assert.equal(lookup("Saved {{count}} items", dictionary), "已保存 {{count}} 项");
  assert.equal(lookup("Saved {count} items", { "Saved {count} items": "已保存" }), null);
  assert.deepEqual(localizeTree({ header: { title: "Models" }, unknown: "New upstream text" }, dictionary), { header: { title: "模型" }, unknown: "New upstream text" });
});

test("没有显式提交值的原生选项不改写；中文中的替换符保持原样", () => {
  const code = transform('<><option>Home</option><option value="Home">Home</option><button name="action">Save</button><p>Models</p></>', "view.tsx", { ...dictionary, Models: "模型 $&" }).code;
  assert.ok(code.includes('<option>Home</option>'));
  assert.ok(code.includes('<option value="Home">{"首页"}</option>'));
  assert.ok(code.includes('<button name="action">Save</button>'));
  assert.ok(code.includes('<p>{"模型 $&"}</p>'));
});

test("组件显示参数有字符串字面量契约时保留调用值，不破坏类型或分支", () => {
  const code = 'interface BudgetLineProps { label: "Team" | "My Spend"; }\nfunction BudgetLine(p:BudgetLineProps){return <span>{p.label}</span>}\nconst page=<BudgetLine label="Team" />;';
  assert.equal(transform(code, "BudgetLine.tsx", { Team: "团队", "My Spend": "我的费用" }).code, code);
});

test("干净源码转换可重复执行；结构漂移、篡改和低覆盖率安全失败", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "litellm-zh-test-"));
  try {
    const src = path.join(root, "ui/litellm-dashboard/src");
    fs.mkdirSync(path.join(src, "app"), { recursive: true });
    fs.mkdirSync(path.join(src, "i18n/locales"), { recursive: true });
    const layout = path.join(src, "app/layout.tsx");
    fs.writeFileSync(layout, 'export default function Layout(){ return <html lang="en"><body>Home</body></html> }');
    fs.writeFileSync(path.join(src, "i18n/locales/en.json"), JSON.stringify({ name: "Models" }));
    assert.throws(() => applyOverlay(root, dictionary, 100), /低于门槛/);
    assert.ok(fs.readFileSync(layout, "utf8").includes('lang="en"'));
    const report = applyOverlay(root, dictionary, 1);
    assert.equal(report.replacements, 1);
    assert.deepEqual(applyOverlay(root, dictionary, 1), report);
    assert.ok(fs.readFileSync(layout, "utf8").includes('lang="zh-CN"'));
    fs.appendFileSync(layout, "\n// 外部改动");
    assert.throws(() => applyOverlay(root, dictionary, 1), /文件已变化/);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
