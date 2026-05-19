# 世界圈整理版

這份版本已從單一 HTML 拆成較容易讓 AI 與人工維護的結構。

- `index.html`: 頁面入口與外部資源
- `styles.css`: 基本樣式
- `js/core.js`: React hooks、圖示、常數、共用工具
- `js/roster.js`: 角色資料與技能邏輯
- `js/app.js`: UI、對戰流程、引擎與渲染

之後如果你要改：

- 角色平衡：優先給 `js/roster.js`
- 介面與模式：優先給 `js/app.js`
- 共用參數與工具：優先給 `js/core.js`
