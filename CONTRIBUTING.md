# 贡献与验证

修改 `防DNS泄露.yaml` 或 `android-process-name-rules.yaml` 后，请至少做一次 YAML 解析检查：

```sh
ruby -e 'require "yaml"; ["防DNS泄露.yaml", "android-process-name-rules.yaml"].each { |file| YAML.safe_load_file(file, aliases: true); puts "#{file} YAML OK" }'
```

如果本地装有 `mihomo`，再做一次主配置加载检查：

```sh
mihomo -t -f "防DNS泄露.yaml"
```

仓库的 GitHub Actions 会在 push 和 pull request 中自动执行主配置与 Android 包名规则片段的 YAML 解析检查，并下载 `mihomo` 进行主配置加载检查，避免配置语法、YAML alias 用法、规则片段格式或 Mihomo 兼容性被意外改坏。
