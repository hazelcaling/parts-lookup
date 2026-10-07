#!/usr/bin/env python3
"""Parse Raypak Illustrated Parts List PDFs (matrix layout) into catalog rows.

Usage: parse_ipl.py <pdf> [--series NAME]  -> JSON list on stdout
Each row: series, model, partNumber, description, callOut, section, iplDescription, notes, qty
Relies on `pdftotext -layout` column positions: the header line containing DESCRIPTION
defines the model columns; part numbers are assigned to the nearest column.
"""
import json, re, subprocess, sys

PN = r"(?:\d{6}[A-Z]?|[A-Z]\d{5,6}[A-Z]?|N/A)"
PN_TOKEN = re.compile(rf"(?<![\w/])({PN})(\s*/\s*\d+)?(?![\w])")
CALLOUT = re.compile(r"^\s{0,12}(\d{1,2}\s*[–-]\s*[A-Z]{1,2}|[A-Z]{1,2}\d{1,2})\b")
SECTION = re.compile(r"^\s*([A-Z]{1,2})\s{2,}([A-Z][A-Z0-9 &/(),.'-]{2,})\s*$")

def norm_callout(c):
    return re.sub(r"\s*[–-]\s*", "-", c.strip())

def parse(path, series):
    text = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    lines = text.split("\n")
    rows, cols, section, callout, prev = [], None, "", "", ""
    parent, stack = "", []
    qty_mode = False
    model_sizes = ""
    for ln in lines:
        m = re.search(r"MODEL SIZES?:\s*(.+)", ln)
        if m and not model_sizes:
            model_sizes = m.group(1).strip()
        if "DESCRIPTION" in ln and not re.search(r"DESCRIPTION\s{2,}\S", ln) and re.match(r"^\s*(CALL\s+)?OUT\s+DESCRIPTION\s*$", ln) and "PART" in prev:
            cols, qty_mode, callout = [], True, ""
            prev = ln
            continue
        if "DESCRIPTION" in ln and re.search(r"DESCRIPTION\s{2,}\S", ln):
            # header: labels to the right of DESCRIPTION, merge with line above for 2-line labels
            start = ln.index("DESCRIPTION") + len("DESCRIPTION")
            labels = [(mm.start(), mm.end(), mm.group()) for mm in re.finditer(r"\S+(?: \S+)*", ln[start:])]
            labels = [(a + start, b + start, t) for a, b, t in labels]
            above = prev
            out = []
            for a, b, t in labels:
                for tok in re.split(r"\s{2,}", t) if "  " in t else [t]:
                    out.append((a, b, tok))
            merged = []
            for a, b, t in out:
                ab = above[max(0, a - 3): b + 3].strip() if len(above) > a else ""
                if ab and not re.search(r"DESCRIPTION|CALL", ab) and len(ab) < 20:
                    t = f"{ab} {t}"
                merged.append(((a + b) / 2, t))
            # "PART NUMBER | qty per model" layout: first label is NUMBER
            if re.search(r"PART NO\.\s*$", ln):
                cols, qty_mode, callout = [], True, ""  # single-model list
                prev = ln
                continue
            if re.search(r"PART NO\.", ln):
                # staggered two-line model headers (very old IPLs): not reliably parseable
                cols, qty_mode = None, False
                prev = ln
                continue
            qty_mode = bool(merged) and merged[0][1].split()[-1] == "NUMBER"
            if qty_mode:
                merged = merged[1:]
                # labels may be one space-separated run: split into individual model columns
                cols = []
                m2 = re.search(r"NUMBER", ln[start:])
                base = start + m2.end()
                for mm in re.finditer(r"\S+", ln[base:]):
                    cols.append(((mm.start() + mm.end()) / 2 + base, mm.group()))
            else:
                cols = merged
            callout, parent, stack = "", "", []
            prev = ln
            continue
        prev = ln
        if cols is None or not ln.strip():
            continue
        s = SECTION.match(ln)
        tokens = list(PN_TOKEN.finditer(ln))
        if s and not tokens:
            section = s.group(2).strip()
            callout, parent, stack = "", "", []
            continue
        c = CALLOUT.match(ln)
        if c:
            callout = norm_callout(c.group(1))
            # Indented call outs are sub-parts of the nearest less-indented call out above
            indent = c.start(1)
            while stack and stack[-1][0] >= indent - 1:
                stack.pop()
            parent = stack[-1][1] if stack else ""
            stack.append((indent, callout))
        if not tokens:
            continue
        is_option = not c and bool(callout)
        first = tokens[0].start()
        desc = ln[c.end() if c else 0:first].strip()
        desc = re.sub(r"\s{2,}", " ", desc)
        desc = desc.lstrip("* ").strip()
        if not desc:
            continue
        if qty_mode:
            pn = tokens[0].group(1)
            if pn == "N/A":
                continue
            if not cols:  # single-model list: DESCRIPTION | PART NUMBER
                qty = re.sub(r"\D", "", tokens[0].group(2) or "")
                for model in [m.strip() for m in re.split(r",|&|\bAND\b", model_sizes) if m.strip()] or [""]:
                    rows.append({
                        "series": series, "model": model.upper(), "partNumber": pn, "description": desc.upper(),
                        "callOut": callout, "section": section, "iplDescription": desc,
                        "notes": f"Qty {qty}" if qty else "", "isOption": is_option, "parentCallOut": parent,
                    })
                continue
            after = ln[tokens[0].end():]
            base = tokens[0].end()
            for q in re.finditer(r"\d+", after):
                center = base + (q.start() + q.end()) / 2
                col = min(cols, key=lambda x: abs(x[0] - center))
                rows.append({
                    "series": series, "model": col[1].upper(), "partNumber": pn, "description": desc.upper(),
                    "callOut": callout, "section": section, "iplDescription": desc,
                    "notes": f"Qty {q.group()}", "isOption": is_option, "parentCallOut": parent,
                })
            continue
        for t in tokens:
            pn = t.group(1)
            if pn == "N/A":
                continue
            center = (t.start() + t.end()) / 2
            col = min(cols, key=lambda x: abs(x[0] - center))
            label = col[1]
            qty = re.sub(r"\D", "", t.group(2) or "")
            if re.search(r"\d", label):
                model, variant = label, ""
            else:
                model, variant = model_sizes, label
            ipl = desc + (f" ({variant.title()})" if variant else "")
            rows.append({
                "series": series, "model": model.upper(), "partNumber": pn, "description": ipl.upper(),
                "callOut": callout, "section": section, "iplDescription": ipl,
                "notes": f"Qty {qty}" if qty else "", "isOption": is_option, "parentCallOut": parent,
            })
    # de-duplicate identical rows
    seen, out = set(), []
    for r in rows:
        k = (r["model"], r["partNumber"], r["callOut"], r["iplDescription"])
        if k not in seen:
            seen.add(k); out.append(r)
    return out

if __name__ == "__main__":
    path = sys.argv[1]
    series = sys.argv[sys.argv.index("--series") + 1] if "--series" in sys.argv else path.rsplit("/", 1)[-1]
    json.dump(parse(path, series), sys.stdout, indent=1)
