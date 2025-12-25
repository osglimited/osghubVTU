class MockProvider {
  constructor() {
    this.name = 'MockProvider';
  }

  async purchaseAirtime(phone, amount, network) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          reference: `MOCK_AIR_${Date.now()}`,
          message: 'Airtime purchase successful',
          provider: this.name
        });
      }, 500);
    });
  }

  async purchaseData(phone, planId, network) {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          reference: `MOCK_DATA_${Date.now()}`,
          message: 'Data purchase successful',
          provider: this.name
        });
      }, 500);
    });
  }
}

module.exports = new MockProvider();
