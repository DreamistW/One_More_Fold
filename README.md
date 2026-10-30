# 开合之间

原生 HTML / CSS / JavaScript 本地小游戏。无依赖、无外部素材请求，无后端和支付功能。

## 启动

在此文件所在目录打开终端，运行：

```powershell
python serve.py
```

默认监听 `0.0.0.0:8000`，本机打开终端输出的 Local 地址，手机与电脑在同一局域网时打开 Network 地址。`0.0.0.0` 是监听地址，不是手机访问地址。端口占用时最多尝试后续99个端口，按 Ctrl+C 结束。也可以使用 `npm start`。

仅限本机时运行 `python serve.py --host 127.0.0.1`；指定端口使用 `--port 8080`。局域网访问还取决于 Windows 防火墙和网络是否允许设备之间访问。

## 折叠屏真机控制

- 在支持的浏览器和安全上下文中自动启用姿态检测，可在「测试设置」中关闭。
- 优先使用 `navigator.devicePosture` 的 `change` 事件；缺少该接口时，尝试标准 `device-posture` CSS 媒体查询。
- 观察到稳定的 `continuous → folded → continuous` 后，触发与「开合」按钮相同的一轮动画；仍然只在游戏展开完成时判定一次故障并计分。
- API 的 `folded` 通常指内屏半折／书本姿态，`continuous` 并不保证手机物理上完全展开。API 不提供铰链角度，本实现不实时追踪折叠角度，也不把旋转或窗口缩放当作折叠事件。
- 页面初始状态、重复通知、短暂抖动、动画中、游戏结束后、页面隐藏及恢复都不会额外计分。切到外屏、锁屏或完全合拢可能暂停姿态事件；重新显示页面后需要重新做一轮半折、展开。
- 页面会显示等待、已检测半折、不支持或需要 HTTPS 等状态；API 存在也不代表设备一定有折叠传感器。

### 三星 Z Fold 7 + Chrome 测试

使用支持 Device Posture API 的 Chrome（Chrome 132 起提供该接口），在内屏打开 **HTTPS** 页面，保持浏览器跨内屏显示。先从平展姿态半折并稍停，再展开。看到「已检测到半折」后展开，应触发一轮游戏。若手机系统不向浏览器上报姿态变化，仍可使用按钮。

普通 `http://电脑局域网IP:8000` 可以游玩，但不是安全上下文，真机控制会提示需要 HTTPS。可部署 `dist/` 到已有 HTTPS 站点，或使用受手机信任、且覆盖访问域名／IP 的证书启动本地 HTTPS：

```powershell
python serve.py --host 0.0.0.0 --port 8443 --certfile certs/server.pem --keyfile certs/server-key.pem
```

证书与私钥需要成对提供，证书错误会停止启动，不会降级为 HTTP。项目不会自动安装证书或修改信任设置。`certs/`、证书和私钥文件已加入 `.gitignore`。

相关规范：[W3C Device Posture API](https://www.w3.org/TR/device-posture/)、[Chrome 132 发布说明](https://developer.chrome.com/release-notes/132?hl=en)。

## 玩法和测试

- 点击一次「开合」或按 Enter 完成折叠 600ms、合拢停留 150ms、展开 600ms。长按 Enter 不会连续开合；在设置输入框和其他控件中保留原有键盘行为。
- 左半内屏在折叠时由清晰变模糊，展开时由模糊恢复清晰；右半内屏、外屏和机身边框保持清晰。模糊仅改变屏幕纹理的颜色，不改变透明度和遮挡关系。
- 仅在展开完成后判定一次故障；默认概率 1%，成功一轮加 1 分，故障轮不加分。
- 故障时抖动 450ms，随后在内屏显示结算。故障线覆盖文字与按钮但不会拦截点击。
- 展开「测试设置」可调整 0% 至 100%，精度 0.1%。修改值不影响当前局；重玩或「应用并重新开始」时生效。刷新页面恢复默认 1%。
- 设为 0% 可检查连续正常开合，设为 100% 可检查故障效果和重玩。
- 支持 Tab 和 Enter / Space 操作按钮。系统设置「减少动态效果」时停用旋转和抖动动画，仍保留完整游戏规则。
- 右上角「中文 / EN」切换完整界面语言，不重置游戏或测试设置。手动选择保存在本浏览器；没有手动选择时，按浏览器语言偏好顺序匹配中文（含繁体地区）或英文，均不匹配时使用英文。存储不可用时仍可切换本次访问的语言。
- 测试设置展开和收起带有高度、淡入淡出过渡，快速反复切换可平滑反向；减少动态效果时立即切换。

## 验证

需要 Node.js 18 或更新版本：

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

受限环境若禁止测试进程派生，可在 Node.js 24 下运行 `node --test --test-isolation=none tests/*.test.mjs`。

`dist/game.mjs` 为独立游戏逻辑，支持注入随机数和等待函数。`dist/pixel-art.mjs` 负责像素素材，`dist/app.mjs` 连接界面与游戏状态。默认概率位于 `DEFAULT_PROBABILITY`。

`dist/phone-renderer.mjs` 在同一张 Canvas 中逐帧绘制手机，展开时直接恢复同一张完整纹理，不使用两块 CSS 3D 图层拼接。计分与故障判定等待实际动画最后一帧绘制完成。

## 授权

本项目采用 [MIT License](LICENSE)。Copyright (c) 2026 DreamistW。
