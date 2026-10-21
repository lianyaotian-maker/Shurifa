# Worldword 输入法

Worldword 是一款基于 [Rime 输入法引擎](https://rime.im) 的 Android 中英双语输入法：
输入中文时，每个候选词都会显示对应的英文释义；输入英文时，同样会显示中文释义。

本项目基于 [Trime 同文输入法](https://github.com/osfans/trime) 二次开发，
遵循 [GPL-3.0-or-later](LICENSE) 协议开源。原项目说明见 [README_trime.md](README_trime.md)。

## 功能规划

| 里程碑 | 内容 | 状态 |
|---|---|---|
| M1 | 基于 Trime 建立项目，Worldword 品牌，GitHub Actions 自动构建 APK | 进行中 |
| M2 | 内置雾凇拼音与英文输入方案，中英切换 | 计划中 |
| M3 | 离线双语词典（CC-CEDICT / ECDICT），候选词下方显示释义 | 计划中 |
| M4 | 详细释义面板，点击译文上屏 | 计划中 |
| M5 | 英文滑行输入（SHARK2 模板匹配 + 语言模型，C++ 解码器），滑行轨迹显示及消失速率可调 | 计划中 |
| M6 | 拼音滑行输入（滑过拼音字母直接出汉字，附释义） | 计划中 |
| M7 | 在线翻译补充（用户自填 API Key）、主题与布局预设 | 计划中 |

## 下载

每次推送代码后，GitHub Actions 会自动构建 APK：
进入仓库的 **Actions** 页面 → 选择最新一次 **Commit** 运行 → 在 **Artifacts** 中下载
`worldword-arm64-v8a`（适用于绝大多数手机）。

## 本地构建

需要 JDK 25、Android SDK 以及 CMake 3.31.6：

```bash
git submodule update --init --recursive
make debug
```

## 同步上游 Trime

```bash
git remote add upstream https://github.com/osfans/trime.git
git fetch upstream develop
git merge upstream/develop
```
