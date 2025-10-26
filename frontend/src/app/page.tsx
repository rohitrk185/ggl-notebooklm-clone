"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import FileUpload from "@/components/FileUpload";
import { PdfViewerRef } from "@/components/PdfViewer";
import Chat from "@/components/Chat";

// Dynamically import PdfViewer with SSR disabled to avoid DOMMatrix error
const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>,
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const pdfViewerRef = useRef<PdfViewerRef>(null);

  const handleUploadSuccess = (uploadedFile: File, docId: string) => {
    setFile(uploadedFile);
    setDocumentId(docId);
  };

  const handleCitationClick = (pageNumber: number) => {
    pdfViewerRef.current?.goToPage(pageNumber);
  };

  return (
    <main className="h-full bg-gray-900 text-white p-4 md:p-8 overflow-hidden flex flex-col">
      {!documentId || !file ? (
        <div className="flex items-center justify-center h-full">
          <FileUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
          <div className="flex flex-col rounded-md border border-gray-700 bg-gray-950 overflow-hidden">
            <PdfViewer file={file} ref={pdfViewerRef} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <Chat
              documentId={documentId}
              onCitationClick={handleCitationClick}
            />
          </div>
        </div>
      )}
    </main>
  );
}
