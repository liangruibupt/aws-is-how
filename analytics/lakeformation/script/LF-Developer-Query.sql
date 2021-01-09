/*
 * Developer can only see web_page & web_sales tables
 */
SELECT sum(ws_net_paid_inc_tax) NetPaid,
        ws_web_site_sk WebSiteID
FROM dl_tpc_web_sales ws, dl_tpc_web_page wp WHERE ws.ws_web_site_sk = wp.wp_web_page_sk GROUP BY  ws_web_site_sk;

/*
 Check out the web_sales table
*/ 
SELECT COUNT(*) FROM dl_tpc_web_sales;

/* Verify that a developer cannot access any other table. This should give a Insufficient Privileges message */ 
SELECT * FROM dl_tpc_item limit 10;
