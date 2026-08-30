-- ------------ Write DROP-FOREIGN-KEY-CONSTRAINT-stage scripts -----------

ALTER TABLE bobsusedbookstore_dbo.address DROP CONSTRAINT fk_address_customer_customerid_1173579219;

ALTER TABLE bobsusedbookstore_dbo.book DROP CONSTRAINT fk_book_referencedata_booktypeid_1189579276;

ALTER TABLE bobsusedbookstore_dbo.book DROP CONSTRAINT fk_book_referencedata_conditionid_1205579333;

ALTER TABLE bobsusedbookstore_dbo.book DROP CONSTRAINT fk_book_referencedata_genreid_1221579390;

ALTER TABLE bobsusedbookstore_dbo.book DROP CONSTRAINT fk_book_referencedata_publisherid_1237579447;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT fk_offer_customer_customerid_1253579504;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT fk_offer_referencedata_booktypeid_1269579561;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT fk_offer_referencedata_conditionid_1285579618;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT fk_offer_referencedata_genreid_1301579675;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT fk_offer_referencedata_publisherid_1317579732;

ALTER TABLE bobsusedbookstore_dbo.orderitem DROP CONSTRAINT fk_orderitem_book_bookid_1333579789;

ALTER TABLE bobsusedbookstore_dbo.orderitem DROP CONSTRAINT fk_orderitem_orders_orderid_1349579846;

ALTER TABLE bobsusedbookstore_dbo.orders DROP CONSTRAINT fk_orders_address_addressid_1365579903;

ALTER TABLE bobsusedbookstore_dbo.orders DROP CONSTRAINT fk_orders_customer_customerid_1381579960;

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem DROP CONSTRAINT fk_shoppingcartitem_book_bookid_1397580017;

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem DROP CONSTRAINT fk_shoppingcartitem_shoppingcart_shoppingcartid_1413580074;

-- ------------ Write DROP-CONSTRAINT-stage scripts -----------

ALTER TABLE bobsusedbookstore_dbo.address DROP CONSTRAINT pk_address_901578250;

ALTER TABLE bobsusedbookstore_dbo.book DROP CONSTRAINT pk_book_933578364;

ALTER TABLE bobsusedbookstore_dbo.customer DROP CONSTRAINT pk_customer_965578478;

ALTER TABLE bobsusedbookstore_dbo.offer DROP CONSTRAINT pk_offer_997578592;

ALTER TABLE bobsusedbookstore_dbo.orderitem DROP CONSTRAINT pk_orderitem_1029578706;

ALTER TABLE bobsusedbookstore_dbo.orders DROP CONSTRAINT pk_orders_1061578820;

ALTER TABLE bobsusedbookstore_dbo.referencedata DROP CONSTRAINT pk_referencedata_1093578934;

ALTER TABLE bobsusedbookstore_dbo.shoppingcart DROP CONSTRAINT pk_shoppingcart_1125579048;

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem DROP CONSTRAINT pk_shoppingcartitem_1157579162;

-- ------------ Write DROP-INDEX-stage scripts -----------

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_address_ix_address_customerid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_book_ix_book_booktypeid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_book_ix_book_conditionid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_book_ix_book_genreid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_book_ix_book_publisherid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_customer_ix_customer_sub;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_offer_ix_offer_booktypeid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_offer_ix_offer_conditionid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_offer_ix_offer_customerid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_offer_ix_offer_genreid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_offer_ix_offer_publisherid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_orderitem_ix_orderitem_bookid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_orderitem_ix_orderitem_orderid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_orders_ix_orders_addressid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_orders_ix_orders_customerid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_shoppingcartitem_ix_shoppingcartitem_bookid;

DROP INDEX IF EXISTS bobsusedbookstore_dbo.ix_shoppingcartitem_ix_shoppingcartitem_shoppingcartid;

-- ------------ Write DROP-TABLE-stage scripts -----------

DROP TABLE IF EXISTS bobsusedbookstore_dbo.address;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.book;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.customer;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.offer;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.orderitem;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.orders;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.referencedata;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.shoppingcart;

DROP TABLE IF EXISTS bobsusedbookstore_dbo.shoppingcartitem;

-- ------------ Write DROP-DATABASE-stage scripts -----------

-- ------------ Write CREATE-DATABASE-stage scripts -----------

CREATE SCHEMA IF NOT EXISTS bobsusedbookstore_dbo;

-- ------------ Write CREATE-TABLE-stage scripts -----------

CREATE TABLE bobsusedbookstore_dbo.address(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    addressline1 TEXT NOT NULL,
    addressline2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    zipcode TEXT NOT NULL,
    customerid INTEGER NOT NULL,
    isactive INTEGER NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.book(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    isbn TEXT NOT NULL,
    publisherid INTEGER NOT NULL,
    booktypeid INTEGER NOT NULL,
    genreid INTEGER NOT NULL,
    conditionid INTEGER NOT NULL,
    coverimageurl TEXT,
    summary TEXT,
    price NUMERIC(18,2) NOT NULL,
    quantity INTEGER NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.customer(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    sub VARCHAR(450) NOT NULL,
    username TEXT,
    firstname TEXT,
    lastname TEXT,
    email TEXT,
    dateofbirth TIMESTAMP(6) WITHOUT TIME ZONE,
    phone TEXT,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.offer(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    author TEXT NOT NULL,
    isbn TEXT NOT NULL,
    bookname TEXT NOT NULL,
    fronturl TEXT,
    genreid INTEGER NOT NULL,
    conditionid INTEGER NOT NULL,
    publisherid INTEGER NOT NULL,
    booktypeid INTEGER NOT NULL,
    summary TEXT,
    offerstatus INTEGER NOT NULL,
    comment TEXT,
    customerid INTEGER NOT NULL,
    bookprice NUMERIC(18,2) NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.orderitem(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    orderid INTEGER NOT NULL,
    bookid INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.orders(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    customerid INTEGER NOT NULL,
    addressid INTEGER NOT NULL,
    deliverydate TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    orderstatus INTEGER NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.referencedata(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    datatype INTEGER NOT NULL,
    text TEXT NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.shoppingcart(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    correlationid TEXT NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

CREATE TABLE bobsusedbookstore_dbo.shoppingcartitem(
    id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY,
    shoppingcartid INTEGER NOT NULL,
    bookid INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    wanttobuy INTEGER NOT NULL,
    createdby TEXT NOT NULL,
    createdon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    updatedon TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL
)
        WITH (
        OIDS=FALSE
        );

-- ------------ Write CREATE-INDEX-stage scripts -----------

CREATE INDEX ix_address_ix_address_customerid
ON bobsusedbookstore_dbo.address
USING BTREE (customerid ASC);

CREATE INDEX ix_book_ix_book_booktypeid
ON bobsusedbookstore_dbo.book
USING BTREE (booktypeid ASC);

CREATE INDEX ix_book_ix_book_conditionid
ON bobsusedbookstore_dbo.book
USING BTREE (conditionid ASC);

CREATE INDEX ix_book_ix_book_genreid
ON bobsusedbookstore_dbo.book
USING BTREE (genreid ASC);

CREATE INDEX ix_book_ix_book_publisherid
ON bobsusedbookstore_dbo.book
USING BTREE (publisherid ASC);

CREATE UNIQUE INDEX ix_customer_ix_customer_sub
ON bobsusedbookstore_dbo.customer
USING BTREE (sub ASC);

CREATE INDEX ix_offer_ix_offer_booktypeid
ON bobsusedbookstore_dbo.offer
USING BTREE (booktypeid ASC);

CREATE INDEX ix_offer_ix_offer_conditionid
ON bobsusedbookstore_dbo.offer
USING BTREE (conditionid ASC);

CREATE INDEX ix_offer_ix_offer_customerid
ON bobsusedbookstore_dbo.offer
USING BTREE (customerid ASC);

CREATE INDEX ix_offer_ix_offer_genreid
ON bobsusedbookstore_dbo.offer
USING BTREE (genreid ASC);

CREATE INDEX ix_offer_ix_offer_publisherid
ON bobsusedbookstore_dbo.offer
USING BTREE (publisherid ASC);

CREATE INDEX ix_orderitem_ix_orderitem_bookid
ON bobsusedbookstore_dbo.orderitem
USING BTREE (bookid ASC);

CREATE INDEX ix_orderitem_ix_orderitem_orderid
ON bobsusedbookstore_dbo.orderitem
USING BTREE (orderid ASC);

CREATE INDEX ix_orders_ix_orders_addressid
ON bobsusedbookstore_dbo.orders
USING BTREE (addressid ASC);

CREATE INDEX ix_orders_ix_orders_customerid
ON bobsusedbookstore_dbo.orders
USING BTREE (customerid ASC);

CREATE INDEX ix_shoppingcartitem_ix_shoppingcartitem_bookid
ON bobsusedbookstore_dbo.shoppingcartitem
USING BTREE (bookid ASC);

CREATE INDEX ix_shoppingcartitem_ix_shoppingcartitem_shoppingcartid
ON bobsusedbookstore_dbo.shoppingcartitem
USING BTREE (shoppingcartid ASC);

-- ------------ Write CREATE-CONSTRAINT-stage scripts -----------

ALTER TABLE bobsusedbookstore_dbo.address
ADD CONSTRAINT pk_address_901578250 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.book
ADD CONSTRAINT pk_book_933578364 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.customer
ADD CONSTRAINT pk_customer_965578478 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT pk_offer_997578592 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.orderitem
ADD CONSTRAINT pk_orderitem_1029578706 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.orders
ADD CONSTRAINT pk_orders_1061578820 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.referencedata
ADD CONSTRAINT pk_referencedata_1093578934 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.shoppingcart
ADD CONSTRAINT pk_shoppingcart_1125579048 PRIMARY KEY (id);

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem
ADD CONSTRAINT pk_shoppingcartitem_1157579162 PRIMARY KEY (id);

-- ------------ Write CREATE-FOREIGN-KEY-CONSTRAINT-stage scripts -----------

ALTER TABLE bobsusedbookstore_dbo.address
ADD CONSTRAINT fk_address_customer_customerid_1173579219 FOREIGN KEY (customerid) 
REFERENCES bobsusedbookstore_dbo.customer (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.book
ADD CONSTRAINT fk_book_referencedata_booktypeid_1189579276 FOREIGN KEY (booktypeid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.book
ADD CONSTRAINT fk_book_referencedata_conditionid_1205579333 FOREIGN KEY (conditionid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.book
ADD CONSTRAINT fk_book_referencedata_genreid_1221579390 FOREIGN KEY (genreid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.book
ADD CONSTRAINT fk_book_referencedata_publisherid_1237579447 FOREIGN KEY (publisherid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT fk_offer_customer_customerid_1253579504 FOREIGN KEY (customerid) 
REFERENCES bobsusedbookstore_dbo.customer (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT fk_offer_referencedata_booktypeid_1269579561 FOREIGN KEY (booktypeid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT fk_offer_referencedata_conditionid_1285579618 FOREIGN KEY (conditionid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT fk_offer_referencedata_genreid_1301579675 FOREIGN KEY (genreid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.offer
ADD CONSTRAINT fk_offer_referencedata_publisherid_1317579732 FOREIGN KEY (publisherid) 
REFERENCES bobsusedbookstore_dbo.referencedata (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.orderitem
ADD CONSTRAINT fk_orderitem_book_bookid_1333579789 FOREIGN KEY (bookid) 
REFERENCES bobsusedbookstore_dbo.book (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.orderitem
ADD CONSTRAINT fk_orderitem_orders_orderid_1349579846 FOREIGN KEY (orderid) 
REFERENCES bobsusedbookstore_dbo.orders (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.orders
ADD CONSTRAINT fk_orders_address_addressid_1365579903 FOREIGN KEY (addressid) 
REFERENCES bobsusedbookstore_dbo.address (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.orders
ADD CONSTRAINT fk_orders_customer_customerid_1381579960 FOREIGN KEY (customerid) 
REFERENCES bobsusedbookstore_dbo.customer (id)
ON UPDATE NO ACTION
ON DELETE NO ACTION;

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem
ADD CONSTRAINT fk_shoppingcartitem_book_bookid_1397580017 FOREIGN KEY (bookid) 
REFERENCES bobsusedbookstore_dbo.book (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

ALTER TABLE bobsusedbookstore_dbo.shoppingcartitem
ADD CONSTRAINT fk_shoppingcartitem_shoppingcart_shoppingcartid_1413580074 FOREIGN KEY (shoppingcartid) 
REFERENCES bobsusedbookstore_dbo.shoppingcart (id)
ON UPDATE NO ACTION
ON DELETE CASCADE;

