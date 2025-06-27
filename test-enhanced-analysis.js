// Test script for enhanced plan vs delivery analysis
const { analyzePlanVsDeliveryDetailed } = require('./analysis');
const { loadClientList } = require('./clients');

// Sample data from user's examples
const samplePlanText = `
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

const sampleDeliveryText = `
تقرير يوم 2025/6/24

سعودي فورتشن درايف 20 ك
اوسكار واتروي 100 ص  
سعودي فورتشن واتروي 15 ك
فوو لوتس 70 فو
الفار مفيدا 50 ص + 35 ك
تي بي اس الرحاب 25 ص + 1125 نقدي
`;

async function testEnhancedAnalysis() {
  console.log('🧪 Testing Enhanced Plan vs Delivery Analysis');
  console.log('=' .repeat(60));
  
  try {
    // Load master client list
    const masterClientList = loadClientList();
    console.log('📊 Loaded', masterClientList.length, 'clients from master list');
    
    // Test enhanced analysis
    console.log('\n🤖 Starting enhanced AI analysis...');
    const result = await analyzePlanVsDeliveryDetailed(
      samplePlanText,
      sampleDeliveryText,
      masterClientList
    );
    
    console.log('\n📋 ANALYSIS RESULT:');
    console.log('Success:', result.success);
    console.log('Analysis Type:', result.analysisType);
    
    if (result.success) {
      console.log('\n📊 METRICS:');
      console.log(JSON.stringify(result.metrics, null, 2));
      
      console.log('\n📄 DETAILED ANALYSIS:');
      console.log(result.analysis);
    } else {
      console.log('\n❌ ERROR:');
      console.log(result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test with Arabic plan format
const arabicPlanText = `
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

const arabicDeliveryText = `
Seven Fortunes Drive: 20 (5kg)
Oscar Waterway: 100 (3kg)
Seven Fortunes Waterway: 15 (5kg)
Voo Lotus: 70 (Voo Bags)
Alfar Mavida: 50 (3kg), 35 (5kg)
TBS Rehab: 25 (3kg), Cash: 1125 EGP
`;

async function testWithEnglishFormat() {
  console.log('\n\n🧪 Testing with English Format Examples');
  console.log('=' .repeat(60));
  
  try {
    const masterClientList = loadClientList();
    
    console.log('\n🤖 Starting enhanced AI analysis with English format...');
    const result = await analyzePlanVsDeliveryDetailed(
      arabicPlanText,
      arabicDeliveryText,
      masterClientList
    );
    
    console.log('\n📋 ANALYSIS RESULT:');
    console.log('Success:', result.success);
    
    if (result.success) {
      console.log('\n📊 METRICS:');
      console.log(JSON.stringify(result.metrics, null, 2));
      
      console.log('\n📄 DETAILED ANALYSIS:');
      console.log(result.analysis);
    } else {
      console.log('\n❌ ERROR:');
      console.log(result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await testEnhancedAnalysis();
  await testWithEnglishFormat();
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testEnhancedAnalysis, testWithEnglishFormat }; 