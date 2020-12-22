
--Create the component_csv table
-- Data type: https://docs.aws.amazon.com/athena/latest/ug/data-types.html
CREATE TABLE component_csv
  WITH (
     format = 'TEXTFILE',
     field_delimiter = ',') 
AS SELECT * 
FROM "rawdata_csv"
WHERE "Volume(%)" IS NOT NULL AND "Height(um)" IS NOT NULL AND "Area(%)" IS NOT NULL;