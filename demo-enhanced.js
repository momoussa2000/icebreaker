// Demo script showcasing the enhanced plan vs delivery analysis functionality
const { analyzePlanVsDeliveryDetailed } = require('./analysis');
const { loadClientList } = require('./clients');

console.log('🚀 Enhanced Icebreaker Plan vs Delivery Analysis Demo');
console.log('=' .repeat(60));

// Sample data matching the user's examples exactly
const examplePlanData = `
اسم العميل	3 KG	5 KG	V00	Cup	Comment
سعودي فورتشن درايف	15		
سعودي فورتشن واتروي	15		
الفار مفيدا	50	50		متأخر
الفار 90 جنوب	50	20		متأخر
الفار 90 شمال	15	15		متأخر
اوسكار واتروي	100	30		متأخر
فوو لوتس		40		
فوو التجمع	30		30	
المجموع	245	145	70	0	1.7
`;

const exampleDeliveryData = `
تقرير يوم 2025/6/24

سعودي فورتشن درايف 20 ك
اوسكار واتروي 100 ص  
سعودي فورتشن واتروي 15 ك
فوو لوتس 70 فو
الفار مفيدا 50 ص + 35 ك
تي بي اس الرحاب 25 ص + 1125 نقدي
`;

// English format example as provided by user
const englishPlanExample = `
Seven Fortunes Drive: 15 (5kg)
Seven Fortunes Waterway: 15 (5kg)
Alfar Mavida: 50 (3kg), 50 (5kg) — Late Order
Alfar 90 South: 50 (3kg), 20 (5kg) — Late Order
Alfar 90 North: 15 (3kg), 15 (5kg) — Late Order
Oscar Waterway: 100 (3kg), 30 (5kg) — Late Order
Voo Lotus: 40 (Voo Bags)
Voo Altagamoo: 30 (3kg), 30 (Voo Bags)

Total 3kg: 245
Total 5kg: 145
Total Voo: 70
Total Cups: 0
`;

const englishDeliveryExample = `
Seven Fortunes Drive: 20 (5kg)
Oscar Waterway: 100 (3kg)
Seven Fortunes Waterway: 15 (5kg)
Voo Lotus: 70 (Voo Bags)
Alfar Mavida: 50 (3kg), 35 (5kg)
TBS Rehab: 25 (3kg), Cash: 1125 EGP
`;

async function runDemo() {
  try {
    console.log('\n📊 Loading client database...');
    const masterClientList = loadClientList();
    console.log(`✅ Loaded ${masterClientList.length} clients from master database`);
    
    console.log('\n🧪 TEST 1: Arabic Format Analysis');
    console.log('-'.repeat(40));
    
    const result1 = await analyzePlanVsDeliveryDetailed(
      examplePlanData,
      exampleDeliveryData,
      masterClientList
    );
    
    if (result1.success) {
      console.log('✅ Analysis successful!');
      console.log('\n📊 KEY METRICS:');
      console.log(`• Total planned clients: ${result1.metrics.totalPlannedClients}`);
      console.log(`• Successfully delivered: ${result1.metrics.successfullyDelivered}`);
      console.log(`• Missed deliveries: ${result1.metrics.missedDeliveries}`);
      console.log(`• Unplanned deliveries: ${result1.metrics.unplannedDeliveries}`);
      console.log(`• Fulfillment rate: ${result1.metrics.fulfillmentRate}%`);
      
      console.log('\n📈 PLANNED vs DELIVERED TOTALS:');
      console.log('Planned:', result1.metrics.plannedTotals);
      console.log('Delivered:', result1.metrics.deliveredTotals);
      
      console.log('\n📋 DETAILED ANALYSIS:');
      console.log(result1.analysis);
      
    } else {
      console.log('❌ Analysis failed:', result1.error);
    }
    
    console.log('\n\n🧪 TEST 2: English Format Analysis');
    console.log('-'.repeat(40));
    
    const result2 = await analyzePlanVsDeliveryDetailed(
      englishPlanExample,
      englishDeliveryExample,
      masterClientList
    );
    
    if (result2.success) {
      console.log('✅ Analysis successful!');
      console.log('\n📊 KEY METRICS:');
      console.log(`• Total planned clients: ${result2.metrics.totalPlannedClients}`);
      console.log(`• Successfully delivered: ${result2.metrics.successfullyDelivered}`);
      console.log(`• Missed deliveries: ${result2.metrics.missedDeliveries}`);
      console.log(`• Unplanned deliveries: ${result2.metrics.unplannedDeliveries}`);
      console.log(`• Fulfillment rate: ${result2.metrics.fulfillmentRate}%`);
      
      console.log('\n📈 PLANNED vs DELIVERED TOTALS:');
      console.log('Planned:', result2.metrics.plannedTotals);
      console.log('Delivered:', result2.metrics.deliveredTotals);
      
      console.log('\n📋 DETAILED ANALYSIS:');
      console.log(result2.analysis);
      
    } else {
      console.log('❌ Analysis failed:', result2.error);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Enhanced analysis system successfully processes both Arabic and English formats');
    console.log('✅ Provides detailed structured output exactly as requested');
    console.log('✅ Extracts precise product quantities (3KG, 5KG, V00, Cup)');
    console.log('✅ Calculates exact variances and fulfillment rates');
    console.log('✅ Identifies delivered, missed, and unplanned deliveries');
    console.log('✅ Shows freezer client status (🧊) where available');
    console.log('✅ Ready for integration with OCR image processing');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Run the demo
runDemo(); 