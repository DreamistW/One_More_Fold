# 开合之间 · One More Fold

像素风折叠屏耐久小游戏。

## 基本玩法

- 点击「开合」或按 **Enter**，完成一次折叠和展开。
- 成功完成一轮得 **1 分**；仅在展开后判定故障，默认概率 **1%**。
- 屏幕损坏后游戏结束，显示最终分数，点击「重玩」重新开始。
- 「测试设置」可调整故障概率，下一局生效；右上角可切换中文和英文。
- 支持姿态检测的折叠屏浏览器可通过**半折→展开**触发一轮，需要 **HTTPS**。

## 游戏截图

### 1. 展开就绪

<img src="./preview-v3.jpg" alt="展开状态的手机、当前分数和开合按钮" width="420">

### 2. 折叠过程

<img src="./occlusion-fixed.jpg" alt="不同折叠角度下，外屏逐渐覆盖内屏" width="760">

### 3. 完全合拢

<img src="./preview-folded.jpg" alt="手机合拢后的竖向外屏" width="680">

### 4. 展开与清晰度过渡

<img src="./focus-transition-strong.jpg" alt="展开时左半内屏从模糊逐渐恢复清晰" width="920">

### 5. 故障结算与重玩

<img src="./preview-price-en.jpg" alt="损坏的内屏、最终分数和重玩按钮" width="420">

## 本地部署

在项目根目录运行，需要 Python 3：

```powershell
python serve.py
```

默认监听 **`0.0.0.0:8000`**，本机访问 [http://127.0.0.1:8000](http://127.0.0.1:8000)。端口占用时会顺延。

| 参数 | 用途 | 默认值 |
| --- | --- | --- |
| `--host` | 监听地址 | `0.0.0.0` |
| `--port` | 起始端口 | `8000` |

修改监听地址和端口：

```powershell
python serve.py --host 127.0.0.1 --port 8080
```

也可使用 `npm start`，按 **Ctrl+C** 停止服务。

### HTTPS

使用受设备信任的证书：

```powershell
python serve.py --host 0.0.0.0 --port 8443 --certfile certs/server.pem --keyfile certs/server-key.pem
```

## 测试

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

## 授权

[MIT License](LICENSE) · Copyright (c) 2026 DreamistW
