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
  GLO: [],
  AIRTEL: [],
  '9MOBILE': []
};
