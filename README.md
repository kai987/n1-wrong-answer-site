# JLPT N1 错题复习网站

用于复习、更新和间隔重复 JLPT N1 错题。初始数据为 2025 年 12 月 JLPT N1 非听力错题 35 题。

## 技术栈
- GitHub Pages：静态前端托管
- HTML / CSS / Vanilla JavaScript ES Modules
- Supabase Auth：邮箱 + 密码登录、邮件找回密码
- Supabase Postgres：错题与复习进度云端保存
- Supabase RLS：每个用户只能访问自己的数据
- Node 内置测试：零第三方测试依赖
- GitHub Actions：语法检查、单元测试通过后自动部署 Pages

## Vanilla JS 架构

应用逻辑不集中在单个脚本，也不通过运行时覆盖函数、全局变量桥接或 clone DOM 替换事件监听器。当前职责划分：

```text
js/
├── main.js                # 应用入口，只负责状态与流程协调
├── constants.js           # 复习间隔、seed版本、Auth UI策略、导入限制等常量
├── utils.js               # 日期、转义、提示、debounce 等通用工具
├── review.js              # 间隔复习与筛选的纯逻辑
├── questions.js           # 题目模型、Supabase row/item 映射
├── validator.js           # JSON 导入规范化与校验
├── io.js                  # JSON 导入读取与导出下载
├── supabase.js            # Supabase client 创建
├── repository.js          # Supabase 数据读写与事务 RPC 调用
├── auth.js                # 登录、注册、退出、找回密码和 session 初始化
├── auth-errors.js         # Supabase Auth 错误 → 中文友好提示
├── password-recovery.js   # 新密码设置流程控制
├── data/
│   ├── base-questions.js
│   ├── option-explanations.js
│   └── seed-data.js
└── ui/
    ├── auth-view.js       # 登录 / 设置新密码视图切换
    ├── editor.js          # 添加/编辑表单
    ├── events.js          # 静态 DOM 事件绑定
    └── render.js          # 统计、复习区、错题列表和 tab 渲染
```

## 读解文章模型

`読解` 不再把 `context` 当成文章正文。题目模型新增独立字段：

```text
passage  # 完整读解文章正文
context  # 文章摘要 / 要点 / 补充材料
stem     # 问题
```

复习时顺序为：

```text
文章 passage
↓
问题 stem
↓
四个选项
↓
显示解析后才出现文章摘要 context
```

这样不会再用摘要替代文章，也不会在作答前通过摘要泄露答案。

编辑器中选择 `読解` 时，会显示“读解文章正文”输入框，并要求填写完整文章。旧 JSON 备份没有 `passage` 仍可正常导入；新备份会保存 `passage`。

当前初始题库中的 7 道读解错题（Q46、53、57、59、61、62、64）原数据只有摘要/要点，没有完整原文。网站会明确显示“文章尚未录入”，不会把摘要伪装成原文。需要根据原始试卷 PDF 或用户提供的文章文本再补全。

## CSS 与 CSP

页面最终样式收敛到单一 `styles.css`，不再依赖后加载 CSS 覆盖旧规则。

页面和渲染器不使用 `style="..."` 或 `element.style.*`，CSP 已收紧为：

```text
style-src 'self'
```

下拉框箭头使用单个 SVG background，并在明暗主题中显式保持 `background-repeat:no-repeat`。

## Supabase 项目

项目 ref：`flpmblfscgcbrprwwckz`

前端只使用 Supabase publishable key。真正的数据权限由登录状态、Postgres grants 和 RLS 控制。绝不要把 `service_role` / secret key 放进前端或 GitHub 仓库。

### 数据库更新

基础 schema 位于：

```text
supabase/schema.sql
```

读解文章字段的增量迁移位于：

```text
supabase/migrations/20260908_add_reading_passage.sql
```

现有 Supabase 项目已经应用该迁移。新建项目时先运行 `schema.sql`，再运行 migrations 目录中的后续迁移。

## 首次题库初始化

初始 `2025-12` 题库使用 `user_seed_state` 和 `initialize_wrong_answers_exam(...)` 保证每个用户只自动初始化一次。用户以后主动删除全部 `2025-12` 后，重新登录不会自动恢复；需要手动点击“恢复 2025-12 初始35题”。

## Auth 与找回密码

前端注册策略集中在 `AUTH_POLICY`：

```js
registrationEnabled: true
registrationMinPasswordLength: 12
```

登录失败不会直接显示 Supabase 原始英文错误。例如：

```text
Invalid login credentials
↓
邮箱或密码错误，请重新输入。
```

“忘记密码”使用 `resetPasswordForEmail` → `PASSWORD_RECOVERY` → `updateUser({ password })` 完成。

`AUTH_POLICY` 只是前端 UX 策略，服务端最小密码长度、公开注册和 Leaked Password Protection 仍应在 Supabase Dashboard 配置。

## 使用

1. 注册 / 登录；忘记密码时可从登录页发送重置邮件。
2. “今日复习”重新作答并查看解析。
3. `読解` 会先显示完整文章，再显示问题和选项；摘要只在解析后显示。
4. “全部错题”搜索、筛选、编辑和删除。
5. “添加 / 编辑”持续加入未来的新错题；读解题必须填写文章正文。
6. 所有数据写入 Supabase，可跨设备同步。
7. 可通过“导出 JSON / 导入 JSON”做离线备份。

## 安全与事务设计

- `anon` 对 `wrong_answers` 没有表权限。
- `user_seed_state` 开启 RLS，只允许已认证用户访问自己的状态。
- JSON 导入先在浏览器校验，再通过 `replace_wrong_answers(jsonb)` 事务写入。
- `passage` 最大 100000 字符，并在数据库与前端同时校验。
- 首次初始化和恢复初始题库均使用事务 RPC。
- CSP 不允许内联脚本、内联样式、object/frame/worker/media。
- Supabase SDK 使用固定版本 `2.112.4`。
- 前端不保存密码。

## 间隔复习

- 还需复习：次日再次出现。
- 已掌握：1 → 3 → 7 → 14 → 30 天逐步拉长。

## 测试

本地无需安装第三方 npm 包即可运行：

```bash
npm run check
npm test
```

当前测试覆盖包括：复习算法、题库完整性、CSP、登录错误中文化、找回密码、一次性 seed、事务恢复、select 箭头、读解 `passage` 字段、读解编辑器和文章/摘要分离渲染。

## GitHub Pages

站点地址：
`https://kai987.github.io/n1-wrong-answer-site/`

## 数据说明

- 問題7 Q41–43 的原始 PDF 选项发生错位，本网站使用后续核对的还原版选项。
- Q46、53、57、59、61、62、64 当前只有文章摘要，完整读解原文尚未录入。
