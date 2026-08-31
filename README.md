# JLPT N1 错题复习网站

用于复习、更新和间隔重复 JLPT N1 错题。初始数据为 2025 年 12 月 JLPT N1 非听力错题 35 题。

## 技术栈
- GitHub Pages：静态前端托管
- HTML / CSS / Vanilla JavaScript ES Modules
- Supabase Auth：邮箱 + 密码登录
- Supabase Postgres：错题与复习进度云端保存
- Supabase RLS：每个用户只能访问自己的数据
- Node 内置测试：零第三方测试依赖
- GitHub Actions：语法检查、单元测试通过后自动部署 Pages

## Vanilla JS 架构

应用逻辑不集中在单个脚本，也不通过运行时覆盖函数、全局变量桥接或 clone DOM 替换事件监听器。当前职责划分：

```text
js/
├── main.js           # 应用入口，只负责状态与流程协调
├── constants.js      # 复习间隔、seed版本、Auth UI策略、导入限制等常量
├── utils.js          # 日期、转义、提示、debounce 等通用工具
├── review.js         # 间隔复习与筛选的纯逻辑
├── questions.js      # 题目模型、Supabase row/item 映射
├── validator.js      # JSON 导入规范化与校验
├── io.js             # JSON 导入读取与导出下载
├── supabase.js       # Supabase client 创建
├── repository.js     # Supabase 数据读写与事务 RPC 调用
├── auth.js           # 登录、注册、退出和 session 初始化
├── data/
│   ├── base-questions.js       # 初始题目与标准解析
│   ├── option-explanations.js  # ①～④ 逐项解释源数据
│   └── seed-data.js            # 唯一题库入口；合并为完整题目对象
└── ui/
    ├── editor.js     # 添加/编辑表单
    ├── events.js     # 静态 DOM 事件绑定
    └── render.js     # 统计、复习区、错题列表和 tab 渲染
```

业务代码只通过 `js/data/seed-data.js` 消费初始题库。根目录不再存在旧式全局题库、桥接或运行时覆盖脚本。

大体数据流为：

```text
用户操作
  ↓
ui/events.js
  ↓
main.js
  ↓
review / validator / io / editor
  ↓
repository.js
  ↓
Supabase + RLS + transaction RPC
  ↓
state
  ↓
ui/render.js
```

## CSS 与 CSP

页面最终样式收敛到单一 `styles.css`，不再依赖后加载 CSS 覆盖旧规则。

页面和渲染器不使用 `style="..."` 或 `element.style.*`。选中状态、队列按钮布局、列表最小宽度和表单间距都通过 class 管理。因此 CSP 已收紧为：

```text
style-src 'self'
```

不再需要 `style-src 'self' 'unsafe-inline'`。

下拉框箭头使用单个 SVG background，并在明暗主题中显式保持 `background-repeat:no-repeat`。夜间控件只修改 `background-color`，避免 `background` shorthand 把箭头重复方式重置为 `repeat`。

## 静态资源加载

`index.html` 不手工维护 `?v=1`、`?v=2` 等缓存版本号。应用资源使用稳定路径：

```text
styles.css
theme-init.js
theme.js
js/main.js
```

结构测试会阻止重新引入手工 `?v=` 参数。

## Supabase 项目

项目 ref：`flpmblfscgcbrprwwckz`

前端只使用 Supabase publishable key。该 key 设计为可公开用于浏览器客户端；真正的数据权限由登录状态、Postgres grants 和 RLS 控制。绝不要把 `service_role` / secret key 放进前端或 GitHub 仓库。

## 首次题库初始化

初始 `2025-12` 题库不再通过“查询题数为 0 就插入”的方式判断。

数据库新增：

```text
user_seed_state
├── user_id
├── source_exam
├── seed_version
├── initialized_at
└── updated_at
```

首次登录时，前端调用：

```text
initialize_wrong_answers_exam(source, seed_version, questions)
```

该 RPC 在同一个 PostgreSQL transaction 中：

1. 尝试创建当前用户 + 来源的 seed state。
2. 如果已经初始化过，直接返回，不再自动插题。
3. 如果从未初始化，则校验并写入初始题库。
4. 任意一步失败，seed state 和题目写入一起回滚。

因此：
- 多设备第一次同时登录不会重复插入。
- 用户以后主动删除全部 `2025-12` 后，重新登录不会自动恢复。
- 需要恢复时，必须主动点击“恢复 2025-12 初始35题”。
- 手动恢复通过版本化事务 RPC 完成，并同步更新 seed state。

升级现有数据库时，会为已经拥有 `2025-12` 数据的用户自动回填 seed state，避免升级后再次初始化。

## 首次配置数据库

1. 打开 Supabase Dashboard。
2. 进入 **SQL Editor**。
3. 打开仓库中的 `supabase/schema.sql`。
4. 将完整 SQL 粘贴到 SQL Editor 并运行一次。
5. 在 **Authentication > Providers > Email** 确认 Email 登录已启用。

数据库表创建成功后，新用户第一次登录会自动初始化初始 35 道错题一次。

## Auth 策略

前端的注册策略集中在 `AUTH_POLICY`：

```js
registrationEnabled: true
registrationMinPasswordLength: 12
```

这是 **前端 UX / 防误操作策略，不是服务端安全边界**。直接调用 Supabase Auth API 的客户端不能依赖这段前端代码来限制密码或注册。

生产环境应在 Supabase Dashboard 中同步配置：
- 服务端最小密码长度（建议至少 12 位）。
- 如果网站只给固定账号使用，关闭公开 Email signup。
- 套餐支持时启用 Leaked Password Protection。

当前仓库代码不会假装这些 Dashboard 设置已经生效。

## 使用

1. 注册 / 登录。
2. “今日复习”重新作答并查看：正确选项、原来的错误选项、正确解说、错误原因、四个选项逐项解析和复习重点。
3. “全部错题”搜索、筛选、编辑和删除。
4. “添加 / 编辑”持续加入未来的新错题。
5. 所有数据写入 Supabase，可跨设备同步。
6. 仍可通过“导出 JSON / 导入 JSON”做离线备份。

## 安全与事务设计

- `anon` 对 `wrong_answers` 没有表权限；`authenticated` 只有 SELECT / INSERT / UPDATE / DELETE。
- `user_seed_state` 开启 RLS，只允许已认证用户读取/写入自己的状态。
- 所有 CRUD RLS policy 都要求 `auth.uid() = user_id`。
- JSON 导入先在浏览器校验文件大小、题数、来源、分类、字段长度、选项数量与日期格式。
- 云端全量导入通过 `replace_wrong_answers(jsonb)` RPC 在一个 transaction 中完成。
- “恢复 2025-12 初始35题”通过 `replace_wrong_answers_for_exam(text,jsonb,integer)` 事务替换指定来源并更新 seed version。
- 首次初始化通过 `initialize_wrong_answers_exam(text,integer,jsonb)` 保证只执行一次。
- 以上 RPC 只允许 `authenticated` 执行，`anon` 无执行权限。
- 数据库还有 CHECK constraints，防止绕过前端直接提交非法记录。
- CSP 不允许内联脚本、内联样式、object/frame/worker/media。
- Supabase SDK 使用固定版本 `2.112.4`。
- 前端只保存主题偏好和 Supabase Auth 正常会话，不保存密码。

## 间隔复习

- 还需复习：次日再次出现。
- 已掌握：1 → 3 → 7 → 14 → 30 天逐步拉长。

## 测试

本地无需安装第三方 npm 包即可运行：

```bash
npm run check
npm test
```

当前测试覆盖：
- 试卷来源规范化
- 1 → 3 → 7 → 14 → 30 天复习间隔
- “还需复习”重置逻辑
- 到期判断
- 逐项解析搜索
- 今日队列与无到期题时的 fallback 顺序
- 初始题库固定为 35 题
- 每道初始题固定包含 4 个选项 + 4 条逐项解释
- `2025-12` 来源与题号唯一性
- 問題7 Q41–43 正确答案保护
- `index.html` 只加载一个应用样式表和一个模块入口
- CSP 不允许 `unsafe-inline` 样式
- HTML 和动态 renderer 不得产生 inline style
- 资源 URL 不使用手工 `?v=` 版本参数
- 夜间模式 select 不会重复铺设箭头 background
- 首次 seed 必须通过一次性事务 RPC，不得恢复为“count=0 就插入”
- 恢复初始题库必须通过版本化事务 RPC
- Auth UI 策略必须集中维护
- `main.js` 保持为协调层，I/O 和静态事件绑定位于独立模块
- 已删除的全局题库/桥接/覆盖 CSS 文件不会重新出现

GitHub Pages 工作流会先执行检查，只有通过后才部署。

## GitHub Pages

站点地址：
`https://kai987.github.io/n1-wrong-answer-site/`

## 数据说明

- 問題7 Q41–43 的原始 PDF 选项发生错位，本网站使用后续核对的还原版选项。
