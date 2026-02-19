export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          UK Takeaway Phone Order Assistant
        </h1>
        <p className="text-center text-lg">
          Dashboard for monitoring phone call metrics, order transcripts, and analytics.
        </p>
        <div className="mt-8 text-center">
          <a
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Login to Dashboard
          </a>
        </div>
      </div>
    </main>
  )
}
