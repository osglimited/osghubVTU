export interface DataPlan {
  id: string;
  name: string;
  price: number;
  networkId: number;
  variation_id: string; // The ID required by IA Café
}

export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'mtn_sme_weekly', name: 'MTN SME Weekly (7 Days)', price: 549, networkId: 1, variation_id: '9' }
  ],
  GLO: [
    { id: 'glo_200mb_corporate', name: 'Glo 200MB (Corporate) (30 Days)', price: 130, networkId: 2, variation_id: '50' }
  ],
  AIRTEL: [],
  '9MOBILE': []
};
