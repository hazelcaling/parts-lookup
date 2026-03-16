import pandas as pd
import json

# load excel
df = pd.read_excel("annualparts.xlsx")

data = {}

for _, row in df.iterrows():
    series = row["SERIES"]
    model = str(row["MODEL"])

    part = {
        "pn": row["PN"],
        "description": row["DESCRIPTION"],
        "price": row["SELL PRICE"],
        "annual": bool(row["ANNUAL"]),
        "defaultQty": row["DEFAULT QTY"]
    }

    if series not in data:
        data[series] = {}

    if model not in data[series]:
        data[series][model] = []

    data[series][model].append(part)

# convert to JS export
js_output = "export const partsData = " + json.dumps(data, indent=2)

# save to React folder
with open("src/data/partsData.js", "w") as f:
    f.write(js_output)

print("✅ partsData.js created successfully")