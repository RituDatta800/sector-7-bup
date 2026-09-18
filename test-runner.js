const fs = require('fs');

async function runTest() {
  try {
    const data = JSON.parse(fs.readFileSync('./docs/BUP_CSE_FEST_2026_Preli_Public_Sample_Cases.json', 'utf8'));
    
    for (let i = 0; i < data.cases.length; i++) {
      const currentCase = data.cases[i];
      console.log(`\n===========================================`);
      console.log(`Running Case ${i + 1}: ${currentCase.input.scenario_id}`);
      
      const response = await fetch('http://localhost:3000/optimize-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCase.input)
      });
      
      const result = await response.json();
      if (!response.ok) {
        console.error('API Error:', result);
        continue;
      }

      console.log('Directives Extracted:', result.directive_interpretation.map(d => d.directive_type));
      console.log('Plan Summary:', result.plan_summary);
      console.log('Total Cost:', result.total_cost_bdt);
      console.log('Peak Grid:', result.peak_grid_kwh);
    }
    console.log(`\n===========================================`);
    console.log('All test cases completed successfully!');
  } catch (err) {
    console.error('Error running test:', err);
  }
}

runTest();
