# 季忆 · Seasons in Memory

一盏漂在水上的八角灯笼。转动它，树会走完春、夏、秋、冬；每到一个季节，灯笼会轻轻往下一沉、碰到水面，涟漪从浮板边荡开。连续转过两圈，整顶玻璃罩（灯罩连同屋顶）会抬离水面，树开成一朵立体的花；继续转动，花收回、罩子落回，再转五圈又会开花。

水面有整座灯笼和树的倒影，倒影会随微波轻轻晃动；夜里灯笼自己亮起来，周围有萤火，但没有月亮。

![春季 · 灯笼浮在水面](docs/spring.png)

<table>
  <tr>
    <td width="50%"><img src="docs/ripple.png" alt="季节落定时的涟漪"></td>
    <td width="50%"><img src="docs/night.png" alt="夜间模式"></td>
  </tr>
  <tr>
    <td align="center">季节落定 · 灯笼下沉，涟漪从浮板边散开</td>
    <td align="center">夜间 · 灯笼内部亮起，周围是萤火</td>
  </tr>
  <tr>
    <td><img src="docs/bloom.png" alt="树开成一朵花"></td>
    <td><img src="docs/mobile.png" alt="手机版" width="48%"></td>
  </tr>
  <tr>
    <td align="center">两圈之后 · 玻璃罩整体移开，树开花</td>
    <td align="center">手机版 · 灯笼、倒影和信卡</td>
  </tr>
</table>

## 打开方式

直接双击 `index.html` 即可。没有构建步骤、没有第三方依赖、没有外部字体或 CDN 请求；灯罩、水面、树和花都是运行时用代码画的。

- 需要支持 WebGL2 的浏览器：Chrome / Edge / Safari 15+ / 微信内置浏览器（较新机型）。
- 如果在 `file://` 下指针事件受限，可以起一个静态服务器：

```powershell
python -m http.server 8080
npx serve .
```

然后访问 `http://localhost:8080/four-seasons/`。

## 发布到 GitHub Pages（分享到微信）

这个目录已经按 GitHub Pages 的结构准备好：`index.html` 在根目录，`.github/workflows/deploy.yml` 会在 push 到 `main` 时自动部署。

1. 在 GitHub 新建一个仓库（例如 `jiyi`），**把这个目录里的内容上传到仓库根目录**（不是把 `four-seasons` 文件夹整个套进去）。也可以用命令行：

```bash
cd four-seasons
git init
git add .
git commit -m "季忆 · 水上灯笼"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 没有装 Git 也可以：在仓库页面点 **Add file → Upload files**，把 `index.html`、`letter.html`、`assets/`、`docs/` 一起拖进去，提交到 `main`。

2. 打开仓库的 **Settings → Pages**：
   - 用附带的 Actions 工作流：**Build and deployment → Source** 选 **GitHub Actions**，以后每次 push 自动发布；
   - 或者不用 Actions：Source 选 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`。两种都可以（`.nojekyll` 已经放好）。
3. 等发布完成，访问 `https://<你的用户名>.github.io/<仓库名>/`。
4. 微信里打开这个网址 → 右上角 `...` → **分享给朋友**；也可以直接把链接发到聊天里。

**让微信链接卡片有封面图**：部署后把 `index.html` 头部 `<meta property="og:image">` 和 `twitter:image` 里的相对路径改成完整的线上地址，例如：

```html
<meta property="og:image" content="https://<你的用户名>.github.io/<仓库名>/docs/share.jpg" />
```

微信抓取链接时会读取页面标题、`description` 和这张封面图（`docs/share.jpg` 是 1200×630 的分享版）。仓库必须是 **Public**，分享出去才能被打开。

## 交互

| 操作 | 效果 |
| --- | --- |
| 左右拖动 / 横向滚轮 | 旋转灯笼和树，四季连续过渡 |
| 松手 | 惯性滑行后吸附到最近的季节；灯笼下沉、碰水、涟漪荡开 |
| 点击底部正中的空心圆点 | 先扩散三层涟漪，再跳转 `letter.html?season=...`（目前是占位空白页） |
| 左下角月亮 / 太阳图标 | 切换白天 / 夜晚（也可按 `N`），图标交叉淡入旋转 |
| `←` / `→` | 转到上 / 下一个季节 |
| `G` | 打开小礼物 |
| `Esc` | 关闭礼物 |

- **底部只有一个空心圆点**，没有文字。它固定在屏幕下方正中；手机上在信卡正上方。
- **无操作 3 秒**，圆点上方会浮出一行灰字“左右旋转”；任何拖动、滚轮、按键都会让它消失，安静下来 3 秒后再出现。
- **季节落定的下沉**不会锁住操作：出现季节字和圆点时，仍可以直接拖动，字会淡出、季节继续，灯笼从水里升起。
- 四种季节都停过一次后，右上角的“小礼物”会解锁。

## 场景说明

- **灯笼盒子**：八边形的玻璃灯身，深色木柱和上下木圈，八片高透明度玻璃；盖子是一顶八角的木屋顶，带黄铜顶珠。整顶罩子（屋顶 + 木柱 + 玻璃）在开花时一起抬离水面，花开完再落回。
- **水面**：灯笼浮在水上，有轻微上下浮动；每次季节落定会往下沉一下，接触水面时溅出涟漪。整座灯笼、树、花和浮板都会倒映在水里，倒影的透明度较低，并随水波扭动。
- **花**：27 片真实曲面的花瓣，外、中、内三圈错峰打开；花茎、四片叶子和金色花心。开花后继续转动，花收回、树恢复。
- **夜间**：没有左上角光源；灯笼内部变亮，成为唯一主光；水面上有暖色倒影，四周有萤火和少量星点。
- **季节字**：同色系三段渐变（浅暖顶色 → 季节中间色 → 更深的同色底），底部渐隐，透明像素不写深度，所以不会出现方块。桌面端字在玻璃后、会被屋顶和木柱挡住一部分；手机端字在灯笼上方，避免被挡住。

## 文件

```
four-seasons/
├─ index.html              主页面
├─ letter.html             占位跳转页（每一季一张空白信纸）
├─ assets/
│  ├─ css/style.css        版式、信卡、空心圆点、灰字提示、夜间主题、图标按钮
│  └─ js/
│     ├─ math.js           矩阵 / 颜色 / 缓动
│     ├─ gl.js             极简 WebGL2 渲染器（含水面、倒影、玻璃着色器）
│     ├─ world.js          八角灯笼、浮板、树、3D 花、水面、倒影、涟漪、季节色板
│     └─ app.js            状态机、拖拽、吸附、下沉、涟漪、开花、夜间、提示
├─ docs/                   预览图与微信分享封面
├─ .github/workflows/deploy.yml
├─ .nojekyll
├─ .gitignore
└─ README.md
```

## 想改的地方

- **四段对话**：`assets/js/app.js` 顶部的 `SEASONS`，`lines` 每行是 `{ who, text }`；`note` 是信卡底部的小字。
- **开花时的三句话**：同文件的 `BLOOM_LINES`。
- **季节色**：`assets/js/world.js` 顶部的 `PALETTE_SRC`。`leaf` 是叶子的五个色阶，`accent` / `accentDeep` 是界面和季节字的颜色，`petal` / `petalCenter` 是花的颜色。
- **灯笼和屋顶**：`world.js` 的 `buildRaft()`、`buildCover()`、`buildCaseGlass()`；灯身半径 `R`、屋顶高度、木色 `WOOD_*` 都在这里。
- **水色和涟漪**：`world.js` 的 `draw()` 里 `wShallow` / `wDeep` 决定水色；`gl.js` 的 `WATER_FS` 决定水波、涟漪和水线。
- **镜头和字的排布**：`app.js` 的 `computeCamera()`；`camera.target`、`halfH`、`camera.text`。
- **空心圆点、灰字提示、图标按钮**：`index.html` 底部和 `.css` 里的 `.hold` / `.ripple-core` / `.hint` / `.night-btn`。
- **小礼物**：`index.html` 里 `.gift-card` 内的 `.gift-art`（压花书签 SVG）和 `app.js` 的 `openGift()` 文案。后续放进真实图片时替换 `.gift-art` 即可。
- **每一季的内容页**：`letter.html` 已经接收 `?season=spring|summer|autumn|winter|bloom`，可以在这里放照片、长信或礼物。

## 调试参数

可组合使用：

| 参数 | 说明 |
| --- | --- |
| `?season=0..3` | 直接停在某个季节 |
| `?angle=45` | 直接转到某个角度（度） |
| `?hold=1` | 强制显示当前季节的定格和圆点 |
| `?bloom=1` | 强制开花（玻璃罩整体移开） |
| `?turns=2.2` | 设置累计圈数（测试开花阈值） |
| `?night=1` | 直接进入夜间模式 |
| `?gift=1` | 打开小礼物 |
| `?static=1` | 关闭 CSS 过渡和动画，便于截图 |
| `?debug=1` | 显示调试浮层，并把内部状态挂到 `window.__jiyi` |

示例：`index.html?angle=180&bloom=1&night=1&static=1`。

## 已验证

- 拖拽旋转 → 吸附到季节、进入定格；季节落定时灯笼下沉、涟漪从浮板边扩散。
- 累计圈数正确计入拖拽产生的角度；2 圈阈值后的下一次定格开花，之后每再转 5 圈开花。
- 开花时玻璃罩（屋顶、木柱、玻璃）整体移出画面；花收回时罩子落回。
- 底部只有空心圆点、无文字；点击生成 3 层涟漪并跳转 `letter.html?season=spring`（含 `?season=bloom`）。
- 无操作 3 秒后灰字“左右旋转”出现，任意操作消失；桌面和手机都验证过。
- 白天 / 夜晚图标切换流畅，夜间没有左上角光源，灯笼内部变亮，萤火与星点正常。
- 水面倒影在白天、夜间、开花时都存在，并随水波轻微扭动。
- 季节字的透明区域不写深度，木屋顶和玻璃上不会出现方块缺口。
- 桌面 1440×900、手机 390×844 均检查过；礼物按钮、信卡、圆点、提示不重叠。
- 页面无运行时报错；`python -m http.server` 下通过相对路径正常加载（GitHub Pages 同理）。

## 说明

- 页面目前没有任何图片和外部请求（`docs/` 只是 README 预览图，不参与页面加载）。
- 支持 `prefers-reduced-motion`。
- 主要动效都是阻尼过渡：玻璃罩抬升、花瓣打开、灯笼下沉、涟漪、叶子收缩都带错峰。
- Git 已初始化并提交；要发布到 GitHub 还需按上面的步骤添加远程仓库并 push（或在 GitHub 网页上传）。
