// Invented design examples. Never loaded automatically into a private workspace.
export function sampleDataset() {
  const rows = [
    ['2026-08-01','Example salary',6200,'Income','Salary'],
    ['2026-08-02','Example housing payment',-1800,'Housing','Rent'],
    ['2026-08-05','Example supermarket',-420,'Groceries','Supermarket'],
    ['2026-08-07','Example electricity',-230,'Housing','Electricity'],
    ['2026-08-08','Example fuel',-180,'Transport','Fuel'],
    ['2026-08-10','Example insurance',-350,'Insurance','Other'],
    ['2026-08-12','Example family activity',-260,'Lifestyle','Entertainment'],
    ['2026-08-14','Example supermarket',-380,'Groceries','Supermarket'],
    ['2026-08-16','Example coffee and lunch',-140,'Dining & Takeaway','Dining Out'],
    ['2026-08-18','Example purchase to review',-95,'Uncategorized','Other'],
    ['2026-08-21','Example phone and internet',-120,'Housing','Internet'],
    ['2026-08-24','Example family outing',-770,'Lifestyle','Entertainment'],
    ['2026-08-28','Another example to review',-55,'Uncategorized','Other']
  ];
  return { generated_at:'2026-08-31T00:00:00Z', monthly_cashflow:[], tax_data:{manual_expenses:[],rules:[],overrides:[]}, recent_transactions:rows.map(([date,description,amount,category,subcategory],i)=>({id:`sample-${i}`,date,description,amount,category,subcategory,account:'Example everyday account',type:amount>0?'income':'expense',source_type:'invented-sample'})) };
}
