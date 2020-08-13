DROP TABLE if exists airports;

CREATE TABLE airports (
  airport_code CHAR(3) SORTKEY,
  airport      varchar(100)
);