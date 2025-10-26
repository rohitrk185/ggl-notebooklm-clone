"use client";

import React, { useState, useImperativeHandle, forwardRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Configure PDF.js worker
// Use CDN for reliability, fallback to local copy
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  file: File;
}

export interface PdfViewerRef {
  goToPage: (page: number) => void;
}

const PdfViewer = forwardRef<PdfViewerRef, Props>(({ file }, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setCurrentPage(1);
  }

  useImperativeHandle(ref, () => ({
    goToPage(page) {
      if (page >= 1 && page <= (numPages || 1)) {
        setCurrentPage(page);
      }
    },
  }));

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < (numPages || 1)) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-2 bg-gray-800 text-white flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage <= 1}
          className="text-white hover:bg-gray-700"
        >
          <ChevronLeft size={20} />
          Previous
        </Button>
        <p className="text-sm font-medium">
          Page {currentPage} of {numPages || "--"}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage >= (numPages || 1)}
          className="text-white hover:bg-gray-700"
        >
          Next
          <ChevronRight size={20} />
        </Button>
      </div>
      <ScrollArea className="flex-1 overflow-auto">
        <div className="flex justify-center p-4">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => console.error("Error loading PDF:", error)}
          >
            <Page pageNumber={currentPage} />
          </Document>
        </div>
      </ScrollArea>
    </div>
  );
});

PdfViewer.displayName = "PdfViewer";
export default PdfViewer;
