# NotebookLM Clone

A full-stack AI-powered document chat application that allows users to upload PDF documents and ask questions about their content using RAG (Retrieval Augmented Generation).

## Features

- PDF document upload and processing
- Real-time streaming chat responses
- Accurate citation system with page references
- Professional UI with document viewer
- Vector-based semantic search using Pinecone
- Powered by Google's Gemini AI models

## Tech Stack

**Frontend:**
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- react-pdf for document viewing

**Backend:**
- Node.js with Express
- TypeScript
- Google Generative AI (Gemini)
- Pinecone Vector Database
- LlamaParse for PDF processing

## Prerequisites

- Node.js 18+ and npm
- Google API Key (for Gemini)
- Pinecone API Key and Index
- LlamaCloud API Key (for PDF parsing)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ggl-notebooklm-clone
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=8000

# Google AI
GOOGLE_API_KEY=your_google_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index_name

# LlamaCloud
LLAMA_CLOUD_API_KEY=your_llamacloud_api_key
```

**How to get API keys:**

- **Google API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Pinecone**: Sign up at [Pinecone.io](https://www.pinecone.io/) and create an index
- **LlamaCloud**: Get from [LlamaIndex Cloud](https://cloud.llamaindex.ai/)

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_BACKEND_API_BASE_URL=http://localhost:8000
```

For production, update this to your deployed backend URL.

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:8000`

### 2. Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Usage

### Uploading a PDF

1. Click the upload area or drag and drop a PDF file
2. Wait for the file to be processed (parsing and embedding)
3. Once complete, the chat interface will appear

### Asking Questions

1. Type your question in the chat input
2. Press Enter or click the send button
3. The AI will stream the response in real-time
4. Click on page citations to navigate to referenced pages in the PDF viewer

### Navigation

- Use the Previous/Next buttons in the PDF viewer to browse pages
- Click citation buttons to jump to specific pages
- Upload a new document to start over

## Project Structure

```
ggl-notebooklm-clone/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files (Gemini, Pinecone)
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── prompts/         # AI prompt templates
│   │   ├── lib/             # Utilities (PDF parser)
│   │   ├── types/           # TypeScript types
│   │   └── index.ts         # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   └── components/      # React components
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## API Endpoints

### Upload PDF
```
POST /api/upload
Content-Type: multipart/form-data
Body: { pdfFile: File }
```

### Chat (Non-streaming)
```
POST /api/chat
Content-Type: application/json
Body: { question: string, documentId: string }
```

### Chat (Streaming)
```
POST /api/chat/stream
Content-Type: application/json
Body: { question: string, documentId: string }
Response: Server-Sent Events (SSE)
```

## Deployment

### Frontend (Vercel)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variable: `NEXT_PUBLIC_BACKEND_API_BASE_URL`
4. Deploy

### Backend (Railway/Render/Heroku)

1. Deploy backend to your preferred platform
2. Set all environment variables
3. Note the deployed URL
4. Update frontend environment variable with backend URL

## Key Features Implementation

**RAG Pipeline:**
1. PDF is parsed into text chunks with page numbers
2. Text is embedded using Google's embedding model
3. Vectors are stored in Pinecone with metadata
4. User questions are embedded and matched against stored vectors
5. Retrieved context is sent to Gemini for answer generation

**Streaming:**
- Real-time response streaming using Server-Sent Events (SSE)
- Text appears token-by-token for better UX
- Citations are extracted and sent after streaming completes

**Retry Logic:**
- Attempts with Gemini Pro (2.5-pro) first
- Falls back to Gemini Flash (2.5-flash) with 2 retries
- Ensures high availability and cost optimization
