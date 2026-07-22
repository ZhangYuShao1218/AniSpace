import json
with open('scraper/to_translate_2.json', encoding='utf-8') as f:
    data = json.load(f)
with open('scraper/temp_view.md', 'w', encoding='utf-8') as f:
    for d in data:
        f.write(f"ID: {d['id']}\nTitle: {d['title']}\nSummary: {d['summary']}\n---\n")
