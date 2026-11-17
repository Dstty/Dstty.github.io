# Hydra 层级与表示形式 · 互动文章

主页面 index.html 以 report.md 全文为主体，保留全部章节、公式、七幅树形／层级图，在对应算例位置嵌入六个局部互动组件。原展开实验室保留在 lab.html，作为辅助入口。

所有记号直接作为序数记号。0-Y、0-Y Hydra 与完整 BMS 的共同极限为 BMO／SHO。0-Y Hydra 未提供独立展开器。

公式用本地 MathJax 3.2.2，静态图用本地 Mermaid 10.9.3 渲染，不依赖外部 CDN。两者分别采用 Apache-2.0 和 MIT 许可；项目地址 https://github.com/mathjax/MathJax 和 https://github.com/mermaid-js/mermaid 。生成 HTML 的脚本使用 Python Markdown。

算法验证：`node engine.test.cjs`。文章真实浏览器检查：`node article.test.cjs`，使用 Chrome DevTools 端口 9237，可用 TEST_URL 指向线上地址。覆盖全文章节、公式、静态图、六个组件操作和手机宽度。

q 为最终总副本数。BMS 与 0-Y 的基本列末端边界不同，正文保留并解释这一约定。
