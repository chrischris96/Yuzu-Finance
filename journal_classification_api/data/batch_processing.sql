CREATE SEQUENCE journal_batches_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER journal_batches_bir
BEFORE INSERT ON journal_batches
FOR EACH ROW
WHEN (new.batch_id IS NULL)
BEGIN
  SELECT journal_batches_seq.NEXTVAL INTO :new.batch_id FROM dual;
END;
/
