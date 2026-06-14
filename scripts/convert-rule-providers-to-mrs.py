from pathlib import Path

# Temporary helper: convert rule-provider files from yaml rule-set format to mrs.
yaml_path = Path("防DNS泄露.yaml")
js_path = Path("防DNS泄露.js")

for path in [yaml_path, js_path]:
    text = path.read_text(encoding="utf-8")
    text = text.replace("format: yaml", "format: mrs")
    text = text.replace('format: "yaml"', 'format: "mrs"')
    text = text.replace(".yaml\"", ".mrs\"")
    path.write_text(text, encoding="utf-8")
