// Line item rows shared by the PO and Order Confirmation forms
let nextId = 1;
export const blankRow = () => ({ id: `r${Date.now()}-${nextId++}`, qty: "1", pn: "", description: "", price: "" });
export const withIds = (rows) => (rows || []).map((r) => (r.id ? r : { ...blankRow(), ...r, id: blankRow().id }));
