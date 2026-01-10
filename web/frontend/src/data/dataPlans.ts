export interface DataPlan {
  id: string;
  name: string;
  price: number;
  networkId: number;
  variation_id: string; // The ID required by IA Café
}

export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'mtn_1gb_7days', name: 'MTN 1GB + 5 mins (7 Days)', price: 819, networkId: 1, variation_id: '2676' },
    { id: 'mtn_2gb_30days', name: 'MTN 2GB + 2 mins (30 Days)', price: 1599, networkId: 1, variation_id: '244542' },
    { id: 'mtn_1gb_1day', name: 'MTN 1GB + 1.5 mins (1 Day)', price: 499, networkId: 1, variation_id: '5506674' },
  ],
  GLO: [
    { id: 'glo_1_5gb_14days', name: 'Glo 1.5GB (14 Days)', price: 549, networkId: 2, variation_id: '2666' },
    { id: 'glo_2_2gb_weekend', name: 'Glo 2.2GB (Weekend)', price: 549, networkId: 2, variation_id: '244659' },
    { id: 'glo_2_6gb_30days', name: 'Glo 2.6GB (30 Days)', price: 1099, networkId: 2, variation_id: '2660' },
  ],
  AIRTEL: [
    { id: 'airtel_1gb_7days', name: 'Airtel 1GB (7 Days)', price: 819, networkId: 3, variation_id: '244698' },
    { id: 'airtel_2gb_30days', name: 'Airtel 2GB (30 Days)', price: 1519, networkId: 3, variation_id: '2672' },
    { id: 'airtel_3gb_30days', name: 'Airtel 3GB (30 Days)', price: 2099, networkId: 3, variation_id: '244721' },
  ],
  '9MOBILE': [
    { id: '9mobile_1_4gb_30days', name: '9mobile 1.4GB (30 Days)', price: 1299, networkId: 4, variation_id: '2664' },
    { id: '9mobile_2_44gb_30days', name: '9mobile 2.44GB (30 Days)', price: 2099, networkId: 4, variation_id: '2787' },
  ]
};
