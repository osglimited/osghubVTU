export type DataPlan = {
  id: string;
  name: string;
  price: number;
  networkId: number;
  variation_id: string;
};

// Fallback static plans used only when dynamic plans fail to load.
// Network ID mapping aligns with provider: MTN=1, Glo=2, 9mobile=3, Airtel=4
export const DATA_PLANS: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'MTN_101', name: 'MTN 1GB (30 days)', price: 1000, networkId: 1, variation_id: '101' },
    { id: 'MTN_102', name: 'MTN 2GB (30 days)', price: 1900, networkId: 1, variation_id: '102' },
    { id: 'MTN_103', name: 'MTN 5GB (30 days)', price: 4500, networkId: 1, variation_id: '103' },
  ],
  GLO: [
    { id: 'GLO_201', name: 'Glo 1GB (30 days)', price: 900, networkId: 2, variation_id: '201' },
    { id: 'GLO_202', name: 'Glo 2GB (30 days)', price: 1700, networkId: 2, variation_id: '202' },
    { id: 'GLO_203', name: 'Glo 5GB (30 days)', price: 4300, networkId: 2, variation_id: '203' },
  ],
  AIRTEL: [
    { id: 'AIRTEL_401', name: 'Airtel 1GB (30 days)', price: 1000, networkId: 4, variation_id: '401' },
    { id: 'AIRTEL_402', name: 'Airtel 2GB (30 days)', price: 1900, networkId: 4, variation_id: '402' },
    { id: 'AIRTEL_403', name: 'Airtel 5GB (30 days)', price: 4500, networkId: 4, variation_id: '403' },
  ],
  '9MOBILE': [
    { id: '9MOBILE_301', name: '9mobile 1GB (30 days)', price: 1000, networkId: 3, variation_id: '301' },
    { id: '9MOBILE_302', name: '9mobile 2GB (30 days)', price: 1900, networkId: 3, variation_id: '302' },
    { id: '9MOBILE_303', name: '9mobile 5GB (30 days)', price: 4500, networkId: 3, variation_id: '303' },
  ],
};
