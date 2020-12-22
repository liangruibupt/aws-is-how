
--Create the board_csv table --
-- Data type: https://docs.aws.amazon.com/athena/latest/ug/data-types.html --
CREATE TABLE board_csv
  WITH (
     format = 'TEXTFILE',
     field_delimiter = '|') 
AS 
SELECT 
    split_part(boardinfo_no_space, '|', 1) as "BARCODE",
    split_part(boardinfo_no_space, '|', 2) as "INDEX",
    split_part(boardinfo_no_space, '|', 3) as "DATE",
    split_part(boardinfo_no_space, '|', 4) as "S.TIME",
    split_part(boardinfo_no_space, '|', 5) as "E.TIME",
    split_part(boardinfo_no_space, '|', 6) as "CYCLE",
    split_part(boardinfo_no_space, '|', 7) as "JOB",
    split_part(boardinfo_no_space, '|', 8) as "RESULT",
    split_part(boardinfo_no_space, '|', 9) as "USER",
    split_part(boardinfo_no_space, '|', 10) as "LOTINFO",
    split_part(boardinfo_no_space, '|', 11) as "MACHINE",
    split_part(boardinfo_no_space, '|', 12) as "SIDE"
FROM
    (SELECT 
        regexp_replace(boardinfo, '\s+', '|') as boardinfo_no_space
    FROM (
        SELECT trim("component id") as boardinfo FROM "rawdata_csv"
            WHERE "Volume(%)" IS NULL AND "Height(um)" IS NULL AND "Area(%)" IS NULL
            ORDER BY 'Volume(%)' NULLS FIRST LIMIT 1
        )
    )

-- Create board_csv as Array --
CREATE TABLE board_csv
AS 
SELECT 
    regexp_split(boardinfo, '\s+') as boardinfo_no_space
FROM (
  SELECT trim("component id") as boardinfo FROM "rawdata_csv"
    WHERE "Volume(%)" IS NULL AND "Height(um)" IS NULL AND "Area(%)" IS NULL
    ORDER BY 'Volume(%)' NULLS FIRST LIMIT 1
)