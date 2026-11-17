# Hydra · 序数展开实验室

纯静态交互页面，无第三方运行依赖。直接打开 index.html，或部署到 GitHub Pages。

功能：KP/PSS 树形展开；括号与 PrSS/HPrSS/BMS 编码；任意有限行 BM4；0-Y 山脉；下一步预览、撤销、预设、种子行数滑块和 SVG 导出。全部记号作为序数记号。0-Y Hydra 在共同极限层级中说明，未提供独立展开器。

验证：`node engine.test.cjs`。真实浏览器验证脚本 browser.test.cjs 使用本机 Chrome DevTools 端口 9237；`TEST_URL` 可指定已部署地址。已验证桌面和移动端、四个模式、参数、展开、撤销、重置、输入校验与种子载入。

编号：q 为最终总副本数。BMS 与 0-Y 原始展开存在末端边界差异，页面保留各自定义并明确解释。

内容与算法参考见页面末尾及 report.md。
