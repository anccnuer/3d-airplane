# 大家一起打飞机

一个运行在桌面浏览器中的低多边形 3D 教室空战小游戏。玩家驾驶小飞机在摆满课桌的教室里飞行、切换机型，并通过局域网房间与其他 2–4 名玩家实时对战。

## 功能

- 程序化生成的教室场景：课桌、椅子、墙壁、天花板、窗户、黑板与顶灯。
- 五种机型：纸翼燕、赤隼、铁砧、蜻蜓、流星，外形、速度、转向、生命和火力各不相同。
- 键鼠飞行：鼠标位移直接控制偏航与俯仰角速度，移动越快转向越快，停止移动即停止转向并保持航向；`W/S` 控制油门，`Q/E` 控制滚转，鼠标左键开火。
- 服务端权威：Go 服务以 60Hz 独占飞行、碰撞、伤害与胜负判定；客户端只上传输入意图，并对快照做插值与短时视觉外推。
- 课桌起飞：战机出生与复活时停放在课桌上，按 `W` 给油后才起飞。
- 局域网房间：创建房间或输入房间码加入，支持断线重连。
- 战斗反馈：子弹、火花、爆炸、血量、准星、击坠播报、迷你雷达和结算排行。

## 环境要求

- Node.js 20 或更高版本（仅用于客户端构建与开发）。
- Go 1.22 或更高版本。
- 桌面 Chrome / Edge 浏览器。
- 局域网服务器与玩家电脑处于同一网络，防火墙允许 TCP 8080 端口。
- 静态页面由外部 Web 服务器托管（Nginx、Caddy、IIS 或任意静态文件服务器）。

## 安装

```powershell
cd c:\Users\Administrator\Desktop\3d-airplane
npm install
npm run export:game-data
```

`export:game-data` 会从 `packages/shared` 导出机型与世界常量到 `server/internal/config/game_data.json`，Go 构建时通过 `go:embed` 写入二进制。修改共享常量后必须重新执行该命令。

## 本地开发

开发模式下，Vite 在 `5173` 端口提供页面，Go WebSocket 服务在 `8080` 端口运行：

```powershell
# 终端 1
npm run dev

# 终端 2
npm run server:run
```

浏览器访问 `http://localhost:5173`。其他局域网玩家可访问 `http://你的开发机IP:5173`，并在页面服务器地址栏填写 `ws://你的开发机IP:8080`。

也可以使用 PowerShell 脚本：

```powershell
.\scripts\dev.ps1
.\scripts\dev-go.ps1
```

## 局域网部署

1. 构建前端静态文件与 Go 服务：

```powershell
npm install
npm run export:game-data
npm run build
npm run server:build
```

2. 用任意静态 Web 服务器托管 `dist/` 目录。

3. 在服务器上启动 Go WebSocket 服务：

```powershell
cd server
.\server.exe
```

或：

```powershell
npm run server:run
```

服务默认监听 `:8080`，可用环境变量覆盖：

- `PORT`：WebSocket 端口，默认 `8080`。
- `TICK_RATE`：模拟频率，默认取共享配置中的 `60`。
- `LOG_LEVEL`：`debug` / `info` / `warn` / `error`，默认 `info`。

玩家浏览器访问静态站点后，在服务器地址栏填写 `ws://服务器局域网IP:8080`。如果无法连接，请检查防火墙是否放行 TCP 8080 入站规则，并确认填写的是 WebSocket 地址而不是静态站点地址。

## 操作

| 按键 | 动作 |
| --- | --- |
| `W` / `S` | 加速 / 减速 |
| `W`（停放时） | 从课桌起飞 |
| 鼠标左右移动 | 左右偏航，移动越快转得越快（点击画面锁定指针） |
| 鼠标上下移动 | 抬头 / 俯冲，停止移动即停止转向 |
| `Q` / `E` | 左滚 / 右滚 |
| 鼠标左键 | 开火（起飞后可用） |
| `Esc` | 释放指针并暂停输入 |

## 对战流程

1. 在主菜单输入昵称和服务器地址。
2. 创建房间，或输入其他玩家分享的 5 位房间码加入。
3. 在机库中选择机型并点击准备；房间内至少 2 人全部准备后开始倒计时。
4. 自由对战默认 180 秒，击坠得分，时间结束后展示排行榜。
5. 结算面板点击“再来一局”可重置比分并重新准备。

## 验证

```powershell
npm run check
npm run server:smoke
```

`npm run check` 包含 TypeScript 类型检查、客户端构建、Go `vet` 和 Go 单元测试。Go 测试与冒烟测试会断言：玩家停放且无输入时保持 `alive=true`、`hp>0`、`respawnAt=0`，不会产生死亡/复活事件；正常撞击死亡后会出现未来 `respawnAt`，复活后恢复满血、停放且 `respawnAt=0`。冒烟测试默认连接 `ws://127.0.0.1:8080`，可用 `GAME_WS` 覆盖地址。

服务端健康检查：

```text
http://服务器局域网IP:8080/healthz
```

多人验证建议在两台浏览器窗口中分别加入同一房间，确认双方都能看到位置同步、子弹、命中和计分变化。

## 项目结构

- `server/`：Go WebSocket 权威服务端，包含 60Hz 房间模拟、碰撞、广播、配置 embed 与冒烟测试。
- `packages/shared`：协议类型、TS 常量、机型数值与配置导出；旧飞行数学仅作为黄金向量参考，不再被客户端运行时使用。
- `packages/client`：React 界面与 Three.js 渲染层，使用快照插值和本机视觉外推。
- `scripts`：配置导出、黄金向量导出与 PowerShell 辅助脚本。
- `packages/server`：已废弃的旧 Node 服务端目录，不再参与构建与运行。
