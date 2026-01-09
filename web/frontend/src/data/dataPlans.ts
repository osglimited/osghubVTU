export interface DataPlan {
  id: string;
  name: string;
  price: number;
  networkId: number;
  variation_id: string; // The ID required by IA Café
}

export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'mtn_1gb_1day_gifting', name: 'MTN 1GB (1 Day Gifting)', price: 355, networkId: 1, variation_id: '106' },
    { id: 'mtn_1gb_sme_weekly', name: 'MTN 1GB SME (7 Days)', price: 548, networkId: 1, variation_id: '9' },
    { id: 'mtn_1gb_sme_30days', name: 'MTN 1GB SME (30 Days)', price: 648, networkId: 1, variation_id: '11' },
  ],
  GLO: [
    { id: 'glo_1gb_corp_3days', name: 'Glo 1GB Corporate (3 Days)', price: 382, networkId: 2, variation_id: '45' },
    { id: 'glo_1gb_corp_30days', name: 'Glo 1GB Corporate (30 Days)', price: 502, networkId: 2, variation_id: '52' },
    { id: 'glo_2_5gb_sme_2days', name: 'Glo 2.5GB SME (2 Days)', price: 585, networkId: 2, variation_id: '112' },
  ],
  AIRTEL: [
    { id: 'airtel_1gb_gifting', name: 'Airtel 1GB Gifting (1 Day)', price: 565, networkId: 3, variation_id: '349' },
    { id: 'airtel_3gb_sme_2days', name: 'Airtel 3GB SME (2 Days)', price: 891, networkId: 3, variation_id: '415' },
    { id: 'airtel_7gb_sme_7days', name: 'Airtel 7GB SME (7 Days)', price: 2180, networkId: 3, variation_id: '426' },
  ],
  '9MOBILE': [
    { id: '9mobile_1gb', name: '9mobile 1GB (30 Days)', price: 300, networkId: 4, variation_id: 'CHANGE_ME_9M_1GB' },
    { id: '9mobile_2gb', name: '9mobile 2GB (30 Days)', price: 600, networkId: 4, variation_id: 'CHANGE_ME_9M_2GB' },
  ]
};
