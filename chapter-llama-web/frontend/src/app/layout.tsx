import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chapter-Llama Web',
  description: 'AI-powered video chapter generation using Meta Llama 3.1 8B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
