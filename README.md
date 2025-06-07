# 几何图形绘制工具

一个基于React、Fluent UI、Three.js和MobX构建的现代化3D几何图形绘制应用程序。

## 功能特性

- 🎨 **直观的用户界面** - 使用Microsoft Fluent UI设计系统
- 🔷 **多种几何图形** - 支持球体、立方体、圆柱体、圆锥体、圆环体
- ⚡ **实时渲染** - 基于Three.js的高性能3D渲染
- 📱 **响应式状态管理** - 使用MobX进行状态管理
- 🎛️ **属性编辑** - 实时调整图形的位置、旋转、缩放和颜色
- 📋 **图形管理** - 图形列表、选择、删除等管理功能
- 🖱️ **交互控制** - 鼠标控制3D场景视角

## 技术栈

- **前端框架**: React 18 + TypeScript
- **UI库**: Microsoft Fluent UI
- **3D渲染**: Three.js
- **状态管理**: MobX
- **构建工具**: React Scripts

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

应用将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

## 使用指南

### 添加图形
1. 使用顶部工具栏的"添加图形"菜单选择要添加的图形类型
2. 或使用快速添加按钮直接添加图形

### 编辑图形
1. 在左侧图形列表中点击选择图形
2. 点击"属性面板"按钮打开属性编辑面板
3. 调整位置、旋转、缩放和颜色等属性

### 管理图形
- **选择图形**: 在图形列表中点击图形
- **删除图形**: 使用图形列表中的删除按钮或工具栏的删除选中按钮
- **显示/隐藏**: 使用图形列表中的眼睛图标
- **清空全部**: 使用工具栏的清空全部按钮

### 视角控制
- **鼠标拖拽**: 旋转视角
- **白色背景**: 默认的3D场景背景

## 项目结构

```
src/
├── components/          # React组件
│   ├── ThreeCanvas.tsx  # Three.js 3D画布组件
│   ├── Toolbar.tsx      # 工具栏组件
│   ├── PropertyPanel.tsx # 属性编辑面板
│   └── ShapeList.tsx    # 图形列表组件
├── stores/              # MobX状态管理
│   └── GeometryStore.ts # 几何图形状态管理器
├── App.tsx              # 主应用组件
├── App.css              # 样式文件
└── index.tsx            # 应用入口
```

## 开发说明

### 添加新的几何图形类型

1. 在 `GeometryStore.ts` 中的 `GeometryShape` 接口的 `type` 字段添加新类型
2. 在 `ThreeCanvas.tsx` 的 `createGeometry` 函数中添加对应的Three.js几何体创建逻辑
3. 在 `Toolbar.tsx` 和 `ShapeList.tsx` 中添加相应的UI支持

### 自定义主题

在 `App.tsx` 中修改 `theme` 对象来自定义应用主题色彩。

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License 