-- Run this in Oracle (SQL*Plus or SQL Developer):

CREATE SEQUENCE journal_entries_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER journal_entries_bi
BEFORE INSERT ON journal_entries
FOR EACH ROW
BEGIN
  IF :new.entry_id IS NULL THEN
    SELECT journal_entries_seq.NEXTVAL INTO :new.entry_id FROM dual;
  END IF;
END;
/
