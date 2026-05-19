# 世界圈整理版

這一版保留原始玩法邏輯，主要目標是降低 AI 與人工維護成本。

## 結構

- `index.html`: 載入頁面與外部資源。
- `styles.css`: 基本樣式。
- `js/core.js`: React hooks、圖示、常數、共用工具函式。
- `js/roster.js`: 角色資料與技能邏輯。
- `js/app.js`: 畫面、互動流程、對戰控制。

## 之後怎麼請 AI 幫忙

- 改角色平衡時，只提供 `js/roster.js` 的相關區段。
- 改介面或按鈕時，只提供 `js/app.js`。
- 改常數或工具函式時，只提供 `js/core.js`。

## 原始檔

原始來源檔未被覆蓋，仍在：

- `/Users/wang/Downloads/未命名文件-3.txt`
