# 📊 Icebreaker Daily Report Analyzer

A lightweight AI-powered dashboard that analyzes daily delivery reports from WhatsApp and provides structured insights on fulfillment status, missed deliveries, and freezer client coverage.

## ✨ Features

- 📁 **File Upload**: Support for text files and images (screenshots)
- 📝 **Direct Text Input**: Paste WhatsApp reports directly into the interface
- 🤖 **AI Analysis**: Uses OpenAI GPT-4 to analyze delivery reports in Arabic and English
- 📊 **Structured Output**: Provides clear breakdown of:
  - ✅ Delivered clients (with bag size breakdown)
  - ❌ Missed deliveries
  - 🧊 Freezer client status
  - 🔁 Next-day action recommendations
- 🌐 **Web Interface**: Clean, responsive dashboard accessible via browser

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- OpenAI API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your-actual-openai-api-key-here
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📖 Usage

### Upload Method
1. Click "Choose File" and select a text file or screenshot
2. Click "Analyze File" to process the report
3. View the AI-generated analysis

### Text Input Method
1. Paste your WhatsApp delivery report text into the textarea
2. Click "Analyze Text" to process the report
3. View the structured analysis results

## 🛠️ API Endpoints

- `GET /` - Main dashboard interface
- `POST /upload` - Upload and analyze files
- `POST /analyze-text` - Analyze pasted text
- `GET /health` - Health check endpoint

## 📁 Project Structure

```
icebreaker-ai-dashboard/
├── uploads/               # Temporary file storage (auto-created)
├── .env                   # Environment variables (create from env.example)
├── env.example           # Environment template
├── index.js              # Main Express server
├── analysis.js           # OpenAI integration and analysis logic
├── prompts.js            # GPT prompt templates
├── package.json          # Node.js dependencies
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Server port (default: 3000) | No |

### File Upload Limits

- Maximum file size: 10MB
- Supported formats: Text files (.txt, .csv, .json) and images
- Files are automatically deleted after analysis

## 🤖 AI Analysis Features

The system analyzes reports and extracts:

- **Client Deliveries**: List of successfully delivered clients with bag counts
- **Missed Deliveries**: Clients who were scheduled but not delivered to
- **Freezer Client Status**: Special tracking for freezer/cold storage clients
- **Action Items**: Recommended follow-up actions for the next day

## 🔍 Example Report Format

The system can handle mixed Arabic/English reports like:

```
Today's deliveries:
- Ahmed Restaurant: 5 bags delivered ✅
- Frozen Foods Co: Not visited ❌ (freezer client)
- City Cafe: 3 bags delivered ✅
- Ice Cream Shop: Closed, try tomorrow ❌ (freezer client)
```

## 🚀 Deployment Options

### Local Development
```bash
npm start
```

### Production Deployment

**Railway:**
1. Connect your GitHub repo to Railway
2. Add `OPENAI_API_KEY` environment variable
3. Deploy automatically

**Vercel:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Add environment variables in Vercel dashboard

**Docker:**
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔒 Security Notes

- Keep your OpenAI API key secure
- Files are temporarily stored and automatically deleted
- No data is permanently stored on the server
- Use HTTPS in production

## 🔮 Future Enhancements

- 📷 OCR integration for image text extraction
- 📊 Excel export functionality
- 🔗 WhatsApp Web API integration
- 📈 Analytics and trend tracking
- 🗄️ Database storage for historical analysis

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check that your OpenAI API key is correctly set
2. Ensure you have sufficient OpenAI API credits
3. Verify that the server is running on the correct port
4. Check the console for error messages

For additional help, please create an issue in the repository. 