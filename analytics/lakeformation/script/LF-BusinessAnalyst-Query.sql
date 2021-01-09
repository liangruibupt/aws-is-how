/*
  Run a sample query as a business analyst
  */
  SELECT sum(ws.ws_net_paid_inc_tax) NetPaid, count(distinct i.i_item_sk) NumItems, ca.ca_zip ZipCode FROM dl_tpc_item i, dl_tpc_web_sales ws, dl_tpc_customer_address ca
  WHERE i.i_item_sk = ws.ws_item_sk
  AND ws.ws_ship_addr_sk = ca.ca_address_sk
  GROUP BY ca.ca_zip;

  /*
   Verify that business-analyst can access the all the non-PII columns in customer table
   */
  SELECT *
  FROM dl_tpc_customer limit 10;

  /*
   Verify that a business-analyst cannot access PII data
  */
  SELECT c_first_name, c_last_name, c_customer_sk, c_current_addr_sk
  FROM dl_tpc_customer;
