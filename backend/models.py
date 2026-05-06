from flask_sqlalchemy import SQLAlchemy
from datetime import date, datetime
import random

db = SQLAlchemy()

def generate_quote_number():
    now = datetime.now()

    mm = str(now.month).zfill(2)
    dd = str(now.day).zfill(2)
    yy = str(now.year)[-2:]

    random_digits = random.randint(1000, 9999)

    return f"Q{mm}{dd}{yy}{random_digits}"


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)

    # vendor, contractor, wholesaler, end_user
    type = db.Column(db.String(50))

    name = db.Column(db.String(150), nullable=False)

    address_1 = db.Column(db.String(150))
    address_2 = db.Column(db.String(150))

    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zipcode = db.Column(db.String(20))

    notes = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    contacts = db.relationship(
        "Contact",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    quotes = db.relationship(
        "Quote",
        back_populates="company"
    )


class Contact(db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True)

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True
    )

    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))

    email = db.Column(db.String(150))

    tel = db.Column(db.String(50))
    mobile = db.Column(db.String(50))

    role = db.Column(db.String(100))

    notes = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    company = db.relationship(
        "Company",
        back_populates="contacts"
    )

    quotes = db.relationship(
        "Quote",
        back_populates="contact"
    )

class Item(db.Model):
    __tablename__ = "items"

    id = db.Column(db.Integer, primary_key=True)

    part_number = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    description = db.Column(db.Text)

    vendor = db.Column(db.String(100))

    category = db.Column(db.String(100))

    list_price = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    surcharge = db.Column(
        db.Numeric(10, 4),
        default=0
    )

    multiplier = db.Column(
        db.Numeric(10, 4),
        default=1
    )

    notes = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    line_items = db.relationship(
        "LineItem",
        back_populates="item"
    )


class Quote(db.Model):
    __tablename__ = "quotes"

    id = db.Column(db.Integer, primary_key=True)

    quote_number = db.Column(
        db.String(50),
        unique=True,
        nullable=False,
        default=generate_quote_number
    )

    date = db.Column(
        db.Date,
        default=date.today
    )

    # quoted / ordered
    status = db.Column(
        db.String(50),
        default="quoted"
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True
    )

    contact_id = db.Column(
        db.Integer,
        db.ForeignKey("contacts.id"),
        nullable=True
    )

    # snapshot fields
    company_name = db.Column(db.String(150))

    attn = db.Column(db.String(150))

    email = db.Column(db.String(150))

    # equipment info
    model = db.Column(db.String(150))

    serial_number = db.Column(db.String(150))

    # quote total
    total = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    ship_to_company = db.Column(db.String(150))

    ship_to_address_1 = db.Column(db.String(150))
    ship_to_address_2 = db.Column(db.String(150))

    ship_to_city = db.Column(db.String(100))
    ship_to_state = db.Column(db.String(50))
    ship_to_zipcode = db.Column(db.String(20))

    ship_to_notes = db.Column(db.Text)

    # order info
    customer_po_number = db.Column(db.String(100))

    ordered_date = db.Column(db.Date)

    order_confirmation_number = db.Column(db.String(100))

    order_confirmation_date = db.Column(db.Date)

    vendor_order_confirmation_number = db.Column(db.String(100))

    vendor_order_confirmation_date = db.Column(db.Date)

    notes = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    company = db.relationship(
        "Company",
        back_populates="quotes"
    )

    contact = db.relationship(
        "Contact",
        back_populates="quotes"
    )

    line_items = db.relationship(
        "LineItem",
        back_populates="quote",
        cascade="all, delete-orphan"
    )


class LineItem(db.Model):
    __tablename__ = "line_items"

    id = db.Column(db.Integer, primary_key=True)

    quote_id = db.Column(
        db.Integer,
        db.ForeignKey("quotes.id"),
        nullable=False
    )

    item_id = db.Column(
    db.Integer,
    db.ForeignKey("items.id"),
    nullable=True
)

    part_number = db.Column(db.String(100))

    description = db.Column(db.Text)

    vendor = db.Column(db.String(100))

    list_price = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    surcharge = db.Column(
        db.Numeric(10, 4),
        default=0
    )

    multiplier = db.Column(
        db.Numeric(10, 4),
        default=1
    )

    markup = db.Column(
    db.Numeric(10, 4),
    default=0
)

    sell_price = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    qty = db.Column(
        db.Integer,
        default=1
    )

    total = db.Column(
        db.Numeric(12, 2),
        default=0
    )

    notes = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        server_default=db.func.now()
    )

    updated_at = db.Column(
        db.DateTime,
        server_default=db.func.now(),
        onupdate=db.func.now()
    )

    quote = db.relationship(
        "Quote",
        back_populates="line_items"
    )

    item = db.relationship(
    "Item",
    back_populates="line_items"
)