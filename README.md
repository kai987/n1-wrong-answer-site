# JLPT N1 错题复习网站

用于复习、更新和间隔重复 JLPT N1 错题。初始数据为 2025 年 12 月 JLPT N1 非听力错题 35 题。

## 技术栈
- GitHub Pages：静态前端托管
- HTML / CSS / Vanilla JavaScript
- Supabase Auth：邮箱 + 密码登录
- Supabase Postgres：错题与复习进度云端保存
- Supabase RLS：每个用户只能访问自己的数据
- GitHub Actions：自动部署 Pages

## Supabase 项目
项目 ref：`flpmblfscgcbrprwwckz`

前端只使用 Supabase publishable key。该 key 设计为可公开用于浏览器客户端；真正的数据权限由登录状态和 RLS 控制。

## 首次配置数据库
1. 打开 Supabase Dashboard。
2. 进入 **SQL Editor**。
3. 打开仓库中的 `supabase/schema.sql`。
4. 将完整 SQL 粘贴到 SQL Editor 并运行一次。
5. 在 **Authentication > Providers > Email** 确认 Email 登录已启用。

数据库表创建成功后，用户首次登录网站时会自动把初始 35 道错题导入自己的账号。

## 使用
1. 注册 / 登录。
2. “今日复习”重新作答并查看：正确选项、原来的错误选项、正确解说、错误原因和复习重点。
3. “全部错题”搜索、筛选、编辑和删除。
4. “添加 / 编辑”持续加入未来的新错题。
5. 所有数据写入 Supabase，可跨设备同步。
6. 仍可通过“导出 JSON / 导入 JSON”做离线备份。

## 间隔复习
- 还需复习：次日再次出现。
- 已掌握：1 → 3 → 7 → 14 → 30 天逐步拉长。

## GitHub Pages
仓库包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后会自动部署。

预计站点地址：
`https://kai987.github.io/n1-wrong-answer-site/`

## 数据说明
- 問題7 Q41–43 的原始 PDF 选项发生错位，本网站使用后续核对的还原版选项。
