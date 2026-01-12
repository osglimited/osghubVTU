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
    { id: 'glo_200mb_corporate', name: 'Glo 200MB (Corporate) (30 Days)', price: 130, networkId: 2, variation_id: '50' },
    { id: 'glo_gb_30days_corporate', name: 'GB (Corporate) (30 Days)', price: 540, networkId: 2, variation_id: '52' },
    { id: 'glo_1gig_3days_corporate', name: '1Gig (Corporate) (3 Days)', price: 376, networkId: 2, variation_id: '45' }
  ],
  AIRTEL: [
    { id: 'airtel_sme_2days', name: 'Airtel SME (2 Days)', price: 350, networkId: 3, variation_id: '412' },
    { id: 'airtel_gifting_1day_1gbb', name: '1GBB (Gifting) (1 Days)', price: 592, networkId: 3, variation_id: '349' },
    { id: 'airtel_sme_2days_1_5gbb', name: '1.5GBB (SME) (2 Days)', price: 749, networkId: 3, variation_id: '413' },
    { id: 'airtel_sme_3days_500mb', name: '500MB (SME) (3 Days)', price: 450, networkId: 3, variation_id: '420' }
  ],
  '9MOBILE': []
};
