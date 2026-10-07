#!/usr/bin/env python3
"""Find Raypak obsolete-model IPLs (model-number-history page) missing from the catalog,
parse them, and write rows to add.

Usage: build_ipl_import.py <catalog.json> <pdf_dir> <out.json> [report.json]
Downloads the page + PDFs if missing in pdf_dir.
"""
import html, json, os, re, subprocess, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from parse_ipl import parse

PAGE = "https://www.raypak.com/technical-resources/documents/model-number-history/"
catalog_path, pdf_dir, out_path = sys.argv[1:4]
report_path = sys.argv[4] if len(sys.argv) > 4 else None
os.makedirs(pdf_dir, exist_ok=True)

page = os.path.join(pdf_dir, "model-number-history.html")
if not os.path.exists(page):
    subprocess.run(["curl", "-sfL", "-A", "Mozilla/5.0", "-o", page, PAGE], check=True)
s = open(page, encoding="utf8", errors="ignore").read()

# table rows -> per-PDF info
docs = collections.OrderedDict()
for r in re.findall(r"<tr[^>]*>(.*?)</tr>", s, re.S):
    cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
    if len(cells) < 10:
        continue
    txt = [" ".join(html.unescape(re.sub(r"<[^>]+>", " ", c)).split()) for c in cells]
    links = re.findall(r'href="([^"]+\.pdf)"', cells[7])
    if not links:
        continue
    url = links[0]
    url_key = url.rsplit("/", 1)[1]  # same file can be linked from /documents and /archives
    d = docs.setdefault(url_key, {"url": url, "file": url.rsplit("/", 1)[1], "lines": [], "models": [], "types": set(),
                              "ipl": txt[9], "dates": []})
    d["lines"].append(f"{txt[2]} {txt[3]}".strip())
    ms = [m.strip() for m in re.split(r",", txt[4]) if m.strip()]
    d["models"] += ms
    if len(ms) > len(d.setdefault("longest", [])):
        d["longest"] = ms
    d["types"] |= {t.strip().upper() for t in txt[6].split(",") if t.strip()}
    d["dates"].append(txt[1])

catalog = json.load(open(catalog_path))
by_pn_models = collections.defaultdict(set)
price_by_pn = collections.defaultdict(list)
for c in catalog:
    by_pn_models[c["partNumber"]].add(c["model"])
    if c.get("listPrice"):
        price_by_pn[c["partNumber"]].append(c["listPrice"])

added, report = [], []
for d in docs.values():
    path = os.path.join(pdf_dir, d["file"])
    if not os.path.exists(path):
        subprocess.run(["curl", "-sfL", "-o", path, d["url"]])
    line = sorted(set(d["lines"]), key=lambda x: (len(x), x))[0].upper()
    models = list(dict.fromkeys(d["models"]))
    lm = d["longest"]
    series = f'{line} {lm[0]}{" - " + lm[-1] if len(lm) > 1 else ""} TYPE {" ".join(sorted(d["types"]))} (IPL {d["file"][:-4]})'
    entry = {"file": d["file"], "series": series, "ipl_column": d["ipl"], "models": models}
    if not os.path.exists(path):
        entry["status"] = "download failed"; report.append(entry); continue
    if d["ipl"].lower().startswith("see manual"):
        entry["status"] = "skipped: installation manual, not an IPL (page says 'see manual')"; report.append(entry); continue
    rows = parse(path, series)
    if not rows:
        words = len(subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True).stdout.split())
        entry["status"] = "could not parse" + (" (scanned image, no text)" if words < 50 else " (unrecognized layout)")
        report.append(entry); continue
    pairs = {(r["model"], r["partNumber"]) for r in rows}
    covered = sum(1 for m, pn in pairs if m in by_pn_models.get(pn, ()))
    entry.update(parsed_rows=len(rows), already_in_catalog=covered, models_parsed=sorted({r["model"] for r in rows}))
    if covered / len(pairs) >= 0.5:
        entry["status"] = "already in catalog"; report.append(entry); continue
    for r in rows:
        prices = price_by_pn.get(r["partNumber"])
        # Never invent prices: only reuse the existing catalog list price for the same part number
        r["listPrice"] = collections.Counter(prices).most_common(1)[0][0] if prices else None
        r["priceSource"] = "existing catalog (same part number)" if prices else ""
        r["iplQty"] = r.pop("notes", "").replace("Qty ", "")
        r["notes"] = ""
        r["sourceUrl"] = d["url"]
        r["optionGroup"] = r["callOut"] if r.get("isOption") else ""
        r["descNote"] = ""
    added += rows
    entry["status"] = "added"; entry["added_rows"] = len(rows)
    entry["priced_rows"] = sum(1 for r in rows if r["listPrice"])
    report.append(entry)

json.dump(added, open(out_path, "w"), indent=1)
if report_path:
    json.dump(report, open(report_path, "w"), indent=1, default=list)
for e in report:
    print(f'{e["status"][:60]:60} {e["file"]:16} rows={e.get("added_rows", e.get("parsed_rows", 0)):5} {e["series"][:70]}')
print("TOTAL added rows:", len(added))
