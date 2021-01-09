/*
 * Sample Query from a Campaign Manager who is interested in marketing analytics
 */

SELECT count(distinct i.i_item_sk) NumItems, p.p_promo_id PromotionId FROM dl_tpc_item i, dl_tpc_promotion p, dl_tpc_web_sales ws WHERE i.i_item_sk = ws_item_sk AND ws.ws_promo_sk = p.p_promo_sk GROUP BY p.p_promo_id;
/*
 * Make sure Campaign manager cannot access web_page table
 */
SELECT count(*) FROM dl_tpc_web_page;