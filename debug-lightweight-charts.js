// Debug test for Lightweight Charts API
console.log('Testing Lightweight Charts API...');

async function testLightweightCharts() {
  try {
    // Try to import Lightweight Charts the same way our adapter does
    const LightweightChartsModule = await import('lightweight-charts');
    
    console.log('Lightweight Charts module:', LightweightChartsModule);
    console.log('Available exports:', Object.keys(LightweightChartsModule));
    
    // Create a temporary div element
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.height = '300px';
    document.body.appendChild(container);
    
    // Try to create a chart
    const chart = LightweightChartsModule.createChart(container, {
      width: 400,
      height: 300
    });
    
    console.log('Chart created successfully!');
    console.log('Chart object:', chart);
    console.log('Chart methods:', Object.getOwnPropertyNames(chart).filter(name => typeof chart[name] === 'function'));
    
    // Test different method names for adding series
    console.log('Available series methods:');
    const methodsToCheck = [
      'addCandlestickSeries',
      'addCandleSeries', 
      'addSeries',
      'addLineSeries',
      'addAreaSeries'
    ];
    
    methodsToCheck.forEach(method => {
      console.log(`${method}:`, typeof chart[method] === 'function' ? '✅ Available' : '❌ Not found');
    });
    
    // Try to add a candlestick series
    if (typeof chart.addCandlestickSeries === 'function') {
      console.log('Attempting to add candlestick series...');
      const series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        wickUpColor: '#22c55e'
      });
      
      console.log('Candlestick series created:', series);
      
      // Test data format
      const testData = [
        { time: Math.floor(Date.now() / 1000), open: 100, high: 110, low: 90, close: 105 }
      ];
      
      series.setData(testData);
      console.log('Test data set successfully!');
    }
    
    // Clean up
    chart.remove();
    container.remove();
    
  } catch (error) {
    console.error('Error testing Lightweight Charts:', error);
  }
}

// Run the test when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testLightweightCharts);
} else {
  testLightweightCharts();
}
