module.exports = async function (req, res) {
  try {
    console.log('🔍 Test function called');
    
    // Test basic functionality
    const testResult = {
      status: 'working',
      timestamp: new Date().toISOString(),
      method: req.method,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        isVercel: !!process.env.VERCEL,
        hasOpenAI: !!process.env.OPENAI_API_KEY
      }
    };
    
    console.log('✅ Test result:', testResult);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(testResult);
    
  } catch (error) {
    console.error('❌ Test function error:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}; 