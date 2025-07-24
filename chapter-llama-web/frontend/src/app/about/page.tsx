import Link from 'next/link'

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">About Chapter-Llama</h1>
              <p className="text-xl text-gray-600">
                Efficient Chaptering in Hour-Long Videos with LLMs
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Research Overview</h2>
                <p className="text-gray-700 leading-relaxed">
                  Chapter-Llama addresses the task of video chaptering - partitioning long video timelines into 
                  semantic units and generating corresponding chapter titles. This technology enables efficient 
                  navigation and content retrieval in long-form videos through our innovative LLM-based framework.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Performance</h2>
                <div className="bg-green-50 rounded-lg p-6">
                  <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-green-600">45.3</div>
                      <div className="text-sm text-green-800">F1 Score</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">vs 26.7</div>
                      <div className="text-sm text-green-800">Previous SOTA</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">1 hour</div>
                      <div className="text-sm text-green-800">Single Forward Pass</div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
