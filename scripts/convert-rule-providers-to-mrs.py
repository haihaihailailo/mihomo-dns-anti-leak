from pathlib import Path

for file_name in ["防DNS泄露.yaml", "防DNS泄露.js"]:
    path = Path(file_name)
    text = path.read_text(encoding="utf-8")
    text = text.replace("format: yaml", "format: mrs")
    text = text.replace('format: "yaml"', 'format: "mrs"')
    text = text.replace(".yaml\"", ".mrs\"")
    path.write_text(text, encoding="utf-8")
