import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold text-white mb-4">
        PipelineSage
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Tailwind CSS v4 is set up and ready to go! 🚀
      </p>
      <div className="flex gap-4">
        <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors cursor-pointer">
          Get Started
        </button>
        <button className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer">
          Learn More
        </button>
      </div>
    </div>
  )
}

export default App
