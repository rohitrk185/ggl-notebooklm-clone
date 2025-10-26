"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  citations?: number[];
  isStreaming?: boolean;
}

interface Props {
  documentId: string;
  onCitationClick: (page: number) => void;
}

// Simple component to render markdown-like formatting
function FormattedMessage({ text }: { text: string }) {
  // Split by lines and process each line
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Check if it's a bullet point
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const content = line.replace(/^[\s]*[*-]\s/, '');
          return (
            <div key={index} className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span className="flex-1">{formatInlineMarkdown(content)}</span>
            </div>
          );
        }
        // Regular line
        if (line.trim()) {
          return <div key={index}>{formatInlineMarkdown(line)}</div>;
        }
        // Empty line
        return <div key={index} className="h-2" />;
      })}
    </div>
  );
}

// Format inline markdown (bold, italic, code)
function formatInlineMarkdown(text: string) {
  const parts = [];
  let key = 0;

  // Handle **bold**
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++}>{text.substring(lastIndex, match.index)}</span>
      );
    }
    // Add bold text
    parts.push(
      <strong key={key++} className="font-semibold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.substring(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

export default function Chat({ documentId, onCitationClick }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleStreamingSubmit = async (userQuestion: string) => {
    const botMessageId = Date.now().toString() + "bot";
    const botMessage: Message = {
      id: botMessageId,
      sender: "bot",
      text: "",
      isStreaming: true,
    };
    setMessages((prev) => [...prev, botMessage]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/api/chat/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: userQuestion,
            documentId: documentId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start streaming");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "chunk") {
                accumulatedText += parsed.text;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                );
              } else if (parsed.type === "done") {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? {
                          ...msg,
                          citations: parsed.citations,
                          isStreaming: false,
                        }
                      : msg
                  )
                );
              } else if (parsed.type === "error") {
                throw new Error(parsed.error || "Streaming error");
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in streaming:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to stream answer.";
      toast.error(errorMessage);
      
      // Remove the failed streaming message
      setMessages((prev) => prev.filter((msg) => msg.id !== botMessageId));
      
      // Fallback to non-streaming
      if (useStreaming) {
        console.log("Falling back to non-streaming mode");
        setUseStreaming(false);
        await handleNonStreamingSubmit(userQuestion);
      }
    }
  };

  const handleNonStreamingSubmit = async (userQuestion: string) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/api/chat`,
        {
          question: userQuestion,
          documentId: documentId,
        }
      );

      const { answer, citations } = response.data;
      const botMessage: Message = {
        id: Date.now().toString() + "bot",
        sender: "bot",
        text: answer,
        citations: citations || [],
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error in non-streaming chat:", error);
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.details || "Failed to get answer.");
      } else {
        toast.error("Failed to get answer.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuestion = input;
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userQuestion,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (useStreaming) {
        await handleStreamingSubmit(userQuestion);
      } else {
        await handleNonStreamingSubmit(userQuestion);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full bg-white border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-gray-900">Chat Assistant</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden bg-gray-50">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3",
                  msg.sender === "user" ? "justify-end" : ""
                )}
              >
                {msg.sender === "bot" && (
                  <div className="bg-gray-900 p-2 rounded-full shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "p-4 rounded-lg max-w-xs md:max-w-md shadow-sm",
                    msg.sender === "user" 
                      ? "bg-gray-900 text-white" 
                      : "bg-white border border-gray-200 text-gray-900"
                  )}
                >
                  <div className={cn(
                    "text-sm leading-relaxed",
                    msg.sender === "user" ? "text-white" : "text-gray-900"
                  )}>
                    <FormattedMessage text={msg.text} />
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                    )}
                  </div>
                  {msg.sender === "bot" &&
                    msg.citations &&
                    msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500 font-medium">Sources:</span>
                        {msg.citations.map((page, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                            onClick={() => onCitationClick(page)}
                          >
                            Page {page}
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
                {msg.sender === "user" && (
                  <div className="bg-gray-900 p-2 rounded-full shrink-0">
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && !messages.some(msg => msg.isStreaming) && (
              <div className="flex items-start gap-3">
                <div className="bg-gray-900 p-2 rounded-full shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Ask a question about your PDF..."
            disabled={isLoading}
            className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-gray-900"
          />
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="icon"
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Send size={16} />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
