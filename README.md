# dsh-mac-companion

> Optional companion to [dsh-wsl-kit](https://github.com/173787247/dsh-wsl-kit). Not in `install.sh`.

dsh（多半在 WSL）通过 HTTP 调用 **Mac 上的 Companion**，接入通知、Shortcuts、剪贴板。协议见 [`docs/PROTOCOL.md`](./docs/PROTOCOL.md)。

[English → README.en.md](./README.en.md)

## 兼容性

| 字段 | 值 |
|------|----|
| **插件** | `dsh-mac-companion` **0.1.0** |
| **最低 dsh** | ≥ **0.1.2** |
| **最新验证** | 以 [dsh-wsl-kit 兼容性](https://github.com/173787247/dsh-wsl-kit#compatibility-2026-09) 为准（当前 **`0.1.7-alpha.2`**） |
| **套件档位** | 可选（远程桥接） |

## 工具

| 工具 | 作用 |
|------|------|
| `mac_companion_status` | GET /v1/health |
| `mac_notify` | 系统通知 |
| `mac_run_shortcut` | 跑 Shortcuts（需 confirm=true） |
| `mac_clipboard_read` | 读剪贴板文本 |
| `mac_clipboard_write` | 写剪贴板（需 confirm=true） |

## Mac 上启动 Companion

```sh
python3 companion/server.py --port 18765 --token 'your-secret'
```

WSL 侧：

```sh
dsh plugin --profile web add github:173787247/dsh-mac-companion
export DSH_MAC_COMPANION_URL=http://<mac-ip>:18765
export DSH_MAC_COMPANION_TOKEN=your-secret
```

仅 SSH CLI 请用 [dsh-remote-ssh](https://github.com/173787247/dsh-remote-ssh)。

## License

MIT
