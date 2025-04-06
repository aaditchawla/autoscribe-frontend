"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import ReactMarkdown from 'react-markdown'

// API endpoint configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function TranscriptionUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcript, setTranscript] = useState<string>("")
  const [summary, setSummary] = useState<string>("")
  const [translatedSummary, setTranslatedSummary] = useState<string>("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState<string>("")
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles)
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/m4a': ['.m4a'],
      'audio/wav': ['.wav'],
      'audio/mp3': ['.mp3'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm']
    },
    maxFiles: 1
  })

  const handleTranscribe = async () => {
    console.log('Transcribe button clicked')
    if (!file) {
      console.log('No file selected')
      return
    }

    console.log('Starting transcription for file:', file.name)
    setIsTranscribing(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('Sending request to backend...')
      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      })

      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json()
      console.log('Received response:', data)
      setTranscript(data.transcript)
      setSummary(data.summary)
      toast({
        title: "Success",
        description: "File transcribed successfully!",
      })
    } catch (error) {
      console.error('Error during transcription:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transcribe file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleTranslate = async (language: string) => {
    if (!summary) return

    setIsTranslating(true)
    try {
      const response = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: summary,
          targetLanguage: language
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Translation failed')
      }

      const data = await response.json()
      setTranslatedSummary(data.translatedText)
      toast({
        title: "Success",
        description: `Summary translated to ${language} successfully!`,
      })
    } catch (error) {
      console.error('Error during translation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to translate summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsTranslating(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`${API_URL}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          translatedSummary: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meeting_summary.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTranslatedPDF = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`${API_URL}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: translatedSummary,
          translatedSummary: null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translated_summary.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Translated PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate translated PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!summary || !emailRecipients) return;

    setIsSendingEmail(true);
    try {
      const recipients = emailRecipients.split(',').map(email => email.trim());
      const response = await fetch(`${API_URL}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients,
          summary,
          translatedSummary: translatedSummary || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast({
        title: "Success",
        description: "Email sent successfully!",
      });
      setEmailRecipients("");
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-lg">Drop the file here...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">Drag & drop an audio or video file here, or click to select</p>
            <p className="text-sm text-gray-500">Supports M4A, WAV, MP3, MP4, MOV, AVI, MKV, and WEBM files</p>
          </div>
        )}
      </div>

      {file && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium">Selected file:</p>
          <p className="text-sm text-gray-600">
            {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>

          <Button onClick={handleTranscribe} disabled={isTranscribing} className="mt-4">
            {isTranscribing ? "Transcribing..." : "Transcribe"}
          </Button>
        </div>
      )}

      {transcript && summary && (
        <div className="mt-8">
          <Tabs defaultValue="transcript">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="translated" disabled={!translatedSummary}>
                Translated
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transcript" className="p-4 border rounded-lg mt-2">
              <p className="whitespace-pre-wrap">{transcript}</p>
            </TabsContent>
            <TabsContent value="summary" className="p-4 border rounded-lg mt-2">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button 
                    onClick={() => handleTranslate("French")} 
                    disabled={isTranslating}
                    variant="outline"
                  >
                    {isTranslating ? "Translating..." : "Translate to French"}
                  </Button>
                  <Button 
                    onClick={() => handleTranslate("Spanish")} 
                    disabled={isTranslating}
                    variant="outline"
                  >
                    {isTranslating ? "Translating..." : "Translate to Spanish"}
                  </Button>
                  <Button 
                    onClick={() => handleTranslate("German")} 
                    disabled={isTranslating}
                    variant="outline"
                  >
                    {isTranslating ? "Translating..." : "Translate to German"}
                  </Button>
                </div>
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h3 className="text-lg font-semibold mb-2">Email Summary</h3>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Enter email addresses (comma-separated)"
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      className="p-2 border rounded"
                    />
                    <Button
                      onClick={handleSendEmail}
                      disabled={isSendingEmail || !emailRecipients}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isSendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Summary</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDownloadPDF}
                      disabled={isDownloading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isDownloading ? 'Downloading...' : 'Download PDF'}
                    </Button>
                    {translatedSummary && (
                      <Button
                        onClick={handleDownloadTranslatedPDF}
                        disabled={isDownloading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isDownloading ? 'Downloading...' : 'Download Translated PDF'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="translated" className="p-4 border rounded-lg mt-2">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{translatedSummary}</ReactMarkdown>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
      <Toaster />
    </div>
  )
} 