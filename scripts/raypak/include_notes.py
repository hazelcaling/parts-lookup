#!/usr/bin/env python3
"""Compute "Included in <call out> <PN>" / "Includes <call out> <PN>, ..." notes per model.

Usage: include_notes.py <partsCatalog.json> [more.json ...]   (rewrites the files in place)

Parent/child call outs come from:
  * imported IPL rows: parentCallOut (indentation in the PDF layout, see parse_ipl.py)
  * original catalog rows: their source notes ("Included under 1-F", "Includes 2-B, 3-B, and 4-B")
The result goes into includeNote (one note per line); user notes are never touched.
"""
import json, re, sys, collections

CO = r"\d+-[A-Z]{1,2}"

def co_key(c):
    m = re.match(r"(\d+)-([A-Z]+)", c or "")
    return (m.group(2), int(m.group(1))) if m else ("", 0)

def process(rows):
    by_series = collections.defaultdict(list)
    for r in rows:
        by_series[r["series"]].append(r)
    stats = collections.Counter()
    undetermined = []
    for series, rs in by_series.items():
        parent_of = {}
        for r in rs:
            p = r.get("parentCallOut")
            if p and r.get("callOut"):
                parent_of.setdefault(r["callOut"], p)
        if not r.get("sourceUrl"):  # original catalog: use the source notes
            for r in rs:
                n = r.get("descNote") or ""
                m = re.match(rf"^Included under ({CO})$", n)
                if m and r.get("callOut"):
                    parent_of.setdefault(r["callOut"], m.group(1))
                m = re.match(r"^Includes (.+)$", n)
                if m and r.get("callOut"):
                    for ch in re.findall(CO, m.group(1)):
                        if ch != r["callOut"]:
                            parent_of.setdefault(ch, r["callOut"])
        if not parent_of:
            undetermined.append(series)
            for r in rs:
                r["includeNote"] = ""
            continue
        pn_of = {}
        for r in rs:  # first non-option row of a call out per model
            k = (r["model"], r.get("callOut"))
            if k not in pn_of or (pn_of[k][1] and not r.get("isOption")):
                pn_of[k] = (r["partNumber"], bool(r.get("isOption")))
        children = collections.defaultdict(list)
        for ch, p in parent_of.items():
            children[p].append(ch)
        for p in children:
            children[p].sort(key=co_key)
        parents_hit, subs_hit = set(), set()
        for r in rs:
            notes, co, model = [], r.get("callOut"), r["model"]
            if co in parent_of:
                p = parent_of[co]
                ppn = pn_of.get((model, p), (None,))[0]
                notes.append(f"Included in {p} {ppn}" if ppn else f"Included in {p}")
                subs_hit.add((model, co))
            if co in children:
                items = [f"{ch} {pn_of[(model, ch)][0]}" for ch in children[co] if (model, ch) in pn_of]
                if items:
                    notes.append("Includes " + ", ".join(items))
                    parents_hit.add((model, co))
            r["includeNote"] = "\n".join(notes)
            r["parentCallOut"] = parent_of.get(co, "")
        stats["parents"] += len(parents_hit)
        stats["subparts"] += len(subs_hit)
        stats["rows_with_note"] += sum(1 for r in rs if r["includeNote"])
    return stats, undetermined

if __name__ == "__main__":
    for path in sys.argv[1:]:
        rows = json.load(open(path))
        stats, und = process(rows)
        json.dump(rows, open(path, "w"), indent=2)
        print(path, dict(stats), "series without hierarchy:", len(und))
        for s in und:
            print("   -", s)
