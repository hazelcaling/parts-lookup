# from flask import Flask, request, jsonify
# from flask_cors import CORS
# from decimal import Decimal
# from datetime import date
# from config import Config
# from models import db, Company, Contact, Quote, LineItem

# app = Flask(__name__)
# app.config.from_object(Config)

# CORS(app)
# db.init_app(app)

# with app.app_context():
#     db.create_all()


# def to_decimal(value, default="0"):
#     if value in [None, ""]:
#         return Decimal(default)
#     return Decimal(str(value))


# def to_int(value, default=1):
#     try:
#         return int(value)
#     except:
#         return default


# def to_date(value):
#     if not value:
#         return None
#     return date.fromisoformat(value)


# def money(value):
#     return float(value or 0)


# def company_to_dict(c):
#     return {
#         "id": c.id,
#         "type": c.type,
#         "name": c.name,
#         "address_1": c.address_1,
#         "address_2": c.address_2,
#         "city": c.city,
#         "state": c.state,
#         "zipcode": c.zipcode,
#         "notes": c.notes,
#     }


# def contact_to_dict(c):
#     return {
#         "id": c.id,
#         "company_id": c.company_id,
#         "first_name": c.first_name,
#         "last_name": c.last_name,
#         "email": c.email,
#         "tel": c.tel,
#         "mobile": c.mobile,
#         "role": c.role,
#         "notes": c.notes,
#     }


# def line_item_to_dict(i):
#     return {
#         "id": i.id,
#         "quote_id": i.quote_id,
#         "part_number": i.part_number,
#         "description": i.description,
#         "vendor": i.vendor,
#         "list_price": money(i.list_price),
#         "surcharge": money(i.surcharge),
#         "multiplier": money(i.multiplier),
#         "markup": money(i.markup),
#         "sell_price": money(i.sell_price),
#         "qty": i.qty,
#         "total": money(i.total),
#         "notes": i.notes,
#     }


# def quote_to_dict(q, include_lines=True):
#     data = {
#         "id": q.id,
#         "quote_number": q.quote_number,
#         "date": q.date.isoformat() if q.date else None,
#         "status": q.status,
#         "company_id": q.company_id,
#         "contact_id": q.contact_id,
#         "company_name": q.company_name,
#         "attn": q.attn,
#         "email": q.email,
#         "model": q.model,
#         "serial_number": q.serial_number,
#         "total": money(q.total),
#         "customer_po_number": q.customer_po_number,
#         "ordered_date": q.ordered_date.isoformat() if q.ordered_date else None,
#         "order_confirmation_number": q.order_confirmation_number,
#         "order_confirmation_date": q.order_confirmation_date.isoformat()
#         if q.order_confirmation_date
#         else None,
#         "vendor_order_confirmation_number": q.vendor_order_confirmation_number,
#         "vendor_order_confirmation_date": q.vendor_order_confirmation_date.isoformat()
#         if q.vendor_order_confirmation_date
#         else None,
#         "notes": q.notes,
#     }

#     if include_lines:
#         data["line_items"] = [line_item_to_dict(i) for i in q.line_items]

#     return data


# @app.route("/")
# def home():
#     return jsonify({"message": "Parts quoting API running"})


# # ---------------- COMPANIES ----------------

# @app.route("/companies", methods=["GET"])
# def get_companies():
#     companies = Company.query.order_by(Company.name.asc()).all()
#     return jsonify([company_to_dict(c) for c in companies])


# @app.route("/companies", methods=["POST"])
# def create_company():
#     data = request.json

#     company = Company(
#         type=data.get("type"),
#         name=data.get("name"),
#         address_1=data.get("address_1"),
#         address_2=data.get("address_2"),
#         city=data.get("city"),
#         state=data.get("state"),
#         zipcode=data.get("zipcode"),
#         notes=data.get("notes"),
#     )

#     db.session.add(company)
#     db.session.commit()

#     return jsonify(company_to_dict(company)), 201


# @app.route("/companies/<int:id>", methods=["PUT"])
# def update_company(id):
#     company = Company.query.get_or_404(id)
#     data = request.json

#     company.type = data.get("type")
#     company.name = data.get("name")
#     company.address_1 = data.get("address_1")
#     company.address_2 = data.get("address_2")
#     company.city = data.get("city")
#     company.state = data.get("state")
#     company.zipcode = data.get("zipcode")
#     company.notes = data.get("notes")

#     db.session.commit()

#     return jsonify(company_to_dict(company))


# @app.route("/companies/<int:id>", methods=["DELETE"])
# def delete_company(id):
#     company = Company.query.get_or_404(id)
#     db.session.delete(company)
#     db.session.commit()

#     return jsonify({"message": "Company deleted"})


# # ---------------- CONTACTS ----------------

# @app.route("/contacts", methods=["GET"])
# def get_contacts():
#     contacts = Contact.query.order_by(Contact.last_name.asc()).all()
#     return jsonify([contact_to_dict(c) for c in contacts])


# @app.route("/contacts", methods=["POST"])
# def create_contact():
#     data = request.json

#     contact = Contact(
#         company_id=data.get("company_id") or None,
#         first_name=data.get("first_name"),
#         last_name=data.get("last_name"),
#         email=data.get("email"),
#         tel=data.get("tel"),
#         mobile=data.get("mobile"),
#         role=data.get("role"),
#         notes=data.get("notes"),
#     )

#     db.session.add(contact)
#     db.session.commit()

#     return jsonify(contact_to_dict(contact)), 201


# @app.route("/contacts/<int:id>", methods=["PUT"])
# def update_contact(id):
#     contact = Contact.query.get_or_404(id)
#     data = request.json

#     contact.company_id = data.get("company_id") or None
#     contact.first_name = data.get("first_name")
#     contact.last_name = data.get("last_name")
#     contact.email = data.get("email")
#     contact.tel = data.get("tel")
#     contact.mobile = data.get("mobile")
#     contact.role = data.get("role")
#     contact.notes = data.get("notes")

#     db.session.commit()

#     return jsonify(contact_to_dict(contact))


# @app.route("/contacts/<int:id>", methods=["DELETE"])
# def delete_contact(id):
#     contact = Contact.query.get_or_404(id)
#     db.session.delete(contact)
#     db.session.commit()

#     return jsonify({"message": "Contact deleted"})


# # ---------------- QUOTES ----------------

# @app.route("/quotes", methods=["GET"])
# def get_quotes():
#     quotes = Quote.query.order_by(Quote.id.desc()).all()
#     return jsonify([quote_to_dict(q, include_lines=False) for q in quotes])


# @app.route("/quotes/<int:id>", methods=["GET"])
# def get_quote(id):
#     quote = Quote.query.get_or_404(id)
#     return jsonify(quote_to_dict(quote, include_lines=True))


# def add_line_items_to_quote(quote, line_items_data):
#     quote.total = Decimal("0")

#     for row in line_items_data:
#         list_price = to_decimal(row.get("list_price"))
#         surcharge = to_decimal(row.get("surcharge"))
#         multiplier = to_decimal(row.get("multiplier"), "1")
#         markup = to_decimal(row.get("markup"), "0.20")
#         qty = to_int(row.get("qty"), 1)

#         sell_price = to_decimal(row.get("sell_price"))

#         if sell_price == 0:
#             sell_price = (
#                 list_price
#                 * (Decimal("1") + surcharge)
#                 * multiplier
#                 * (Decimal("1") + markup)
#             ).to_integral_value(rounding="ROUND_CEILING")

#         line_total = sell_price * qty

#         item = LineItem(
#             part_number=row.get("part_number"),
#             description=row.get("description"),
#             vendor=row.get("vendor"),
#             list_price=list_price,
#             surcharge=surcharge,
#             multiplier=multiplier,
#             markup=markup,
#             sell_price=sell_price,
#             qty=qty,
#             total=line_total,
#             notes=row.get("notes"),
#         )

#         quote.line_items.append(item)
#         quote.total += line_total


# @app.route("/quotes", methods=["POST"])
# def create_quote():
#     data = request.json

#     quote = Quote(
#         company_id=data.get("company_id") or None,
#         contact_id=data.get("contact_id") or None,
#         company_name=data.get("company_name"),
#         attn=data.get("attn"),
#         email=data.get("email"),
#         model=data.get("model"),
#         serial_number=data.get("serial_number"),
#         status=data.get("status") or "quoted",
#         customer_po_number=data.get("customer_po_number"),
#         ordered_date=to_date(data.get("ordered_date")),
#         order_confirmation_number=data.get("order_confirmation_number"),
#         order_confirmation_date=to_date(data.get("order_confirmation_date")),
#         vendor_order_confirmation_number=data.get("vendor_order_confirmation_number"),
#         vendor_order_confirmation_date=to_date(
#             data.get("vendor_order_confirmation_date")
#         ),
#         notes=data.get("notes"),
#     )

#     add_line_items_to_quote(quote, data.get("line_items", []))

#     db.session.add(quote)
#     db.session.commit()

#     return jsonify(quote_to_dict(quote)), 201


# @app.route("/quotes/<int:id>", methods=["PUT"])
# def update_quote(id):
#     quote = Quote.query.get_or_404(id)
#     data = request.json

#     quote.company_id = data.get("company_id") or None
#     quote.contact_id = data.get("contact_id") or None
#     quote.company_name = data.get("company_name")
#     quote.attn = data.get("attn")
#     quote.email = data.get("email")
#     quote.model = data.get("model")
#     quote.serial_number = data.get("serial_number")
#     quote.status = data.get("status") or "quoted"
#     quote.customer_po_number = data.get("customer_po_number")
#     quote.ordered_date = to_date(data.get("ordered_date"))
#     quote.order_confirmation_number = data.get("order_confirmation_number")
#     quote.order_confirmation_date = to_date(data.get("order_confirmation_date"))
#     quote.vendor_order_confirmation_number = data.get(
#         "vendor_order_confirmation_number"
#     )
#     quote.vendor_order_confirmation_date = to_date(
#         data.get("vendor_order_confirmation_date")
#     )
#     quote.notes = data.get("notes")

#     LineItem.query.filter_by(quote_id=quote.id).delete()
#     add_line_items_to_quote(quote, data.get("line_items", []))

#     db.session.commit()

#     return jsonify(quote_to_dict(quote))


# @app.route("/quotes/<int:id>", methods=["DELETE"])
# def delete_quote(id):
#     quote = Quote.query.get_or_404(id)
#     db.session.delete(quote)
#     db.session.commit()

#     return jsonify({"message": "Quote deleted"})


# if __name__ == "__main__":
#     app.run(debug=True, port=5001)

from email.utils import quote

from flask import Flask, request, jsonify
from flask_cors import CORS
from decimal import Decimal, ROUND_CEILING
from datetime import date
from config import Config
from models import db, Company, Contact, Quote, LineItem

app = Flask(__name__)
app.config.from_object(Config)

CORS(app)
db.init_app(app)

with app.app_context():
    db.create_all()


def to_decimal(value, default="0"):
    if value in [None, ""]:
        return Decimal(default)
    return Decimal(str(value))


def to_int(value, default=1):
    try:
        return int(value)
    except Exception:
        return default


def to_date(value):
    if not value:
        return None
    return date.fromisoformat(value)


def money(value):
    return float(value or 0)


def company_to_dict(c):
    return {
        "id": c.id,
        "type": c.type,
        "name": c.name,
        "address_1": c.address_1,
        "address_2": c.address_2,
        "city": c.city,
        "state": c.state,
        "zipcode": c.zipcode,
        "notes": c.notes,
    }


def contact_to_dict(c):
    return {
        "id": c.id,
        "company_id": c.company_id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "tel": c.tel,
        "mobile": c.mobile,
        "role": c.role,
        "notes": c.notes,
    }


def line_item_to_dict(i):
    return {
        "id": i.id,
        "quote_id": i.quote_id,
        "part_number": i.part_number,
        "description": i.description,
        "vendor": i.vendor,
        "list_price": money(i.list_price),
        "surcharge": money(i.surcharge),
        "multiplier": money(i.multiplier),
        "markup": money(i.markup),
        "sell_price": money(i.sell_price),
        "qty": i.qty,
        "total": money(i.total),
        "notes": i.notes,
    }


def quote_to_dict(q, include_lines=True):
    data = {
        "id": q.id,
        "quote_number": q.quote_number,
        "date": q.date.isoformat() if q.date else None,
        "status": q.status,
        "company_id": q.company_id,
        "contact_id": q.contact_id,
        "company_name": q.company_name,
        "attn": q.attn,
        "email": q.email,
        "model": q.model,
        "serial_number": q.serial_number,
        "total": money(q.total),
        "customer_po_number": q.customer_po_number,
        "ordered_date": q.ordered_date.isoformat() if q.ordered_date else None,
        "order_confirmation_number": q.order_confirmation_number,
        "order_confirmation_date": q.order_confirmation_date.isoformat()
        if q.order_confirmation_date
        else None,
        "vendor_order_confirmation_number": q.vendor_order_confirmation_number,
        "vendor_order_confirmation_date": q.vendor_order_confirmation_date.isoformat()
        if q.vendor_order_confirmation_date
        else None,
        "ship_to_company": q.ship_to_company,
        "ship_to_address_1": q.ship_to_address_1,
        "ship_to_address_2": q.ship_to_address_2,
        "ship_to_city": q.ship_to_city,
        "ship_to_state": q.ship_to_state,
        "ship_to_zipcode": q.ship_to_zipcode,
        "ship_to_notes": q.ship_to_notes,
        "notes": q.notes,
    }

    if include_lines:
        data["line_items"] = [line_item_to_dict(i) for i in q.line_items]

    return data


@app.route("/")
def home():
    return jsonify({"message": "Parts quoting API running"})


# ---------------- COMPANIES ----------------

@app.route("/companies", methods=["GET"])
def get_companies():
    companies = Company.query.order_by(Company.name.asc()).all()
    return jsonify([company_to_dict(c) for c in companies])


@app.route("/companies", methods=["POST"])
def create_company():
    data = request.json

    company = Company(
        type=data.get("type"),
        name=data.get("name"),
        address_1=data.get("address_1"),
        address_2=data.get("address_2"),
        city=data.get("city"),
        state=data.get("state"),
        zipcode=data.get("zipcode"),
        notes=data.get("notes"),
    )

    db.session.add(company)
    db.session.commit()

    return jsonify(company_to_dict(company)), 201


@app.route("/companies/<int:id>", methods=["PUT"])
def update_company(id):
    company = Company.query.get_or_404(id)
    data = request.json

    company.type = data.get("type")
    company.name = data.get("name")
    company.address_1 = data.get("address_1")
    company.address_2 = data.get("address_2")
    company.city = data.get("city")
    company.state = data.get("state")
    company.zipcode = data.get("zipcode")
    company.notes = data.get("notes")

    db.session.commit()

    return jsonify(company_to_dict(company))


@app.route("/companies/<int:id>", methods=["DELETE"])
def delete_company(id):
    company = Company.query.get_or_404(id)
    db.session.delete(company)
    db.session.commit()

    return jsonify({"message": "Company deleted"})


# ---------------- CONTACTS ----------------

@app.route("/contacts", methods=["GET"])
def get_contacts():
    contacts = Contact.query.order_by(Contact.last_name.asc()).all()
    return jsonify([contact_to_dict(c) for c in contacts])


@app.route("/contacts", methods=["POST"])
def create_contact():
    data = request.json

    contact = Contact(
        company_id=data.get("company_id") or None,
        first_name=data.get("first_name"),
        last_name=data.get("last_name"),
        email=data.get("email"),
        tel=data.get("tel"),
        mobile=data.get("mobile"),
        role=data.get("role"),
        notes=data.get("notes"),
    )

    db.session.add(contact)
    db.session.commit()

    return jsonify(contact_to_dict(contact)), 201


@app.route("/contacts/<int:id>", methods=["PUT"])
def update_contact(id):
    contact = Contact.query.get_or_404(id)
    data = request.json

    contact.company_id = data.get("company_id") or None
    contact.first_name = data.get("first_name")
    contact.last_name = data.get("last_name")
    contact.email = data.get("email")
    contact.tel = data.get("tel")
    contact.mobile = data.get("mobile")
    contact.role = data.get("role")
    contact.notes = data.get("notes")

    db.session.commit()

    return jsonify(contact_to_dict(contact))


@app.route("/contacts/<int:id>", methods=["DELETE"])
def delete_contact(id):
    contact = Contact.query.get_or_404(id)
    db.session.delete(contact)
    db.session.commit()

    return jsonify({"message": "Contact deleted"})


# ---------------- QUOTES ----------------

@app.route("/quotes", methods=["GET"])
def get_quotes():
    quotes = Quote.query.order_by(Quote.id.desc()).all()
    return jsonify([quote_to_dict(q, include_lines=False) for q in quotes])


@app.route("/quotes/<int:id>", methods=["GET"])
def get_quote(id):
    quote = Quote.query.get_or_404(id)
    return jsonify(quote_to_dict(quote, include_lines=True))


def add_line_items_to_quote(quote, line_items_data):
    quote.total = Decimal("0")

    for row in line_items_data:
        list_price = to_decimal(row.get("list_price"))
        surcharge = to_decimal(row.get("surcharge"))
        multiplier = to_decimal(row.get("multiplier"), "1")
        markup = to_decimal(row.get("markup"), "0")
        qty = to_int(row.get("qty"), 1)

        sell_price = to_decimal(row.get("sell_price"))

        if sell_price == 0:
            sell_price = (
                list_price
                * (Decimal("1") + surcharge)
                * multiplier
                * (Decimal("1") + markup)
            ).to_integral_value(rounding=ROUND_CEILING)

        line_total = sell_price * qty

        item = LineItem(
            part_number=row.get("part_number"),
            description=row.get("description"),
            vendor=row.get("vendor"),
            list_price=list_price,
            surcharge=surcharge,
            multiplier=multiplier,
            markup=markup,
            sell_price=sell_price,
            qty=qty,
            total=line_total,
            notes=row.get("notes"),
        )

        quote.line_items.append(item)
        quote.total += line_total


@app.route("/quotes", methods=["POST"])
def create_quote():
    data = request.json

    status = "quoted"

    if data.get("order_confirmation_number"):
        status = "ordered"

    quote = Quote(
        company_id=data.get("company_id") or None,
        contact_id=data.get("contact_id") or None,
        company_name=data.get("company_name"),
        attn=data.get("attn"),
        email=data.get("email"),
        model=data.get("model"),
        serial_number=data.get("serial_number"),
        status=status,
        customer_po_number=data.get("customer_po_number"),
        ordered_date=to_date(data.get("ordered_date")),
        order_confirmation_number=data.get("order_confirmation_number"),
        order_confirmation_date=to_date(data.get("order_confirmation_date")),
        vendor_order_confirmation_number=data.get("vendor_order_confirmation_number"),
        vendor_order_confirmation_date=to_date(
            data.get("vendor_order_confirmation_date")
        ),
        ship_to_company=data.get("ship_to_company"),
        ship_to_address_1=data.get("ship_to_address_1"),
        ship_to_address_2=data.get("ship_to_address_2"),
        ship_to_city=data.get("ship_to_city"),
        ship_to_state=data.get("ship_to_state"),
        ship_to_zipcode=data.get("ship_to_zipcode"),
        ship_to_notes=data.get("ship_to_notes"),
        notes=data.get("notes"),
    )

    add_line_items_to_quote(quote, data.get("line_items", []))

    db.session.add(quote)
    db.session.commit()

    return jsonify(quote_to_dict(quote)), 201


@app.route("/quotes/<int:id>", methods=["PUT"])
def update_quote(id):
    quote = Quote.query.get_or_404(id)
    data = request.json

    quote.company_id = data.get("company_id") or None
    quote.contact_id = data.get("contact_id") or None
    quote.company_name = data.get("company_name")
    quote.attn = data.get("attn")
    quote.email = data.get("email")
    quote.model = data.get("model")
    quote.serial_number = data.get("serial_number")
    
    status = "quoted"

    if data.get("order_confirmation_number"):
        status = "ordered"

    quote.status = status

    quote.customer_po_number = data.get("customer_po_number")
    quote.ordered_date = to_date(data.get("ordered_date"))

    quote.order_confirmation_number = data.get("order_confirmation_number")
    quote.order_confirmation_date = to_date(data.get("order_confirmation_date"))

    quote.vendor_order_confirmation_number = data.get(
        "vendor_order_confirmation_number"
    )
    quote.vendor_order_confirmation_date = to_date(
        data.get("vendor_order_confirmation_date")
    )

    quote.ship_to_company = data.get("ship_to_company")
    quote.ship_to_address_1 = data.get("ship_to_address_1")
    quote.ship_to_address_2 = data.get("ship_to_address_2")
    quote.ship_to_city = data.get("ship_to_city")
    quote.ship_to_state = data.get("ship_to_state")
    quote.ship_to_zipcode = data.get("ship_to_zipcode")
    quote.ship_to_notes = data.get("ship_to_notes")

    quote.notes = data.get("notes")

    LineItem.query.filter_by(quote_id=quote.id).delete()
    add_line_items_to_quote(quote, data.get("line_items", []))

    db.session.commit()

    return jsonify(quote_to_dict(quote))


@app.route("/quotes/<int:id>", methods=["DELETE"])
def delete_quote(id):
    quote = Quote.query.get_or_404(id)
    db.session.delete(quote)
    db.session.commit()

    return jsonify({"message": "Quote deleted"})


if __name__ == "__main__":
    app.run(debug=True, port=5001)