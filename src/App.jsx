import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [isToggled, setIsToggled] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 text-white overflow-x-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Header Section */}
      <header className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent animate-pulse">
              SYNTHWAVE COMPONENTS
            </h1>
            <div className="flex space-x-4">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full animate-ping animation-delay-200"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping animation-delay-400"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Hero Section */}
          <section className="text-center py-12">
            <div className="flex justify-center space-x-8 mb-8">
              <div className="relative">
                <img src={viteLogo} className="w-20 h-20 filter drop-shadow-lg hover:drop-shadow-xl transition-all duration-300" alt="Vite logo" />
                <div className="absolute inset-0 bg-cyan-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              </div>
              <div className="relative">
                <img src={reactLogo} className="w-20 h-20 animate-spin filter drop-shadow-lg" alt="React logo" />
                <div className="absolute inset-0 bg-pink-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              </div>
            </div>

            <h2 className="text-6xl font-bold mb-6 bg-gradient-to-r from-pink-500 via-cyan-400 to-yellow-400 bg-clip-text text-transparent">
              RETRO FUTURE
            </h2>
            <p className="text-xl text-purple-200 mb-8 max-w-2xl mx-auto">
              Experience the power of Tailwind CSS with an authentic 80's synthwave aesthetic
            </p>
          </section>

          {/* Interactive Components Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Counter Card */}
            <div className="bg-gradient-to-br from-purple-800/50 to-pink-800/50 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-8 shadow-2xl hover:shadow-cyan-400/20 transition-all duration-300">
              <h3 className="text-2xl font-bold text-cyan-400 mb-6 text-center">COUNTER MODULE</h3>
              <div className="text-center">
                <div className="text-6xl font-mono text-pink-400 mb-6 glow-text">{count}</div>
                <button
                  onClick={() => setCount(count + 1)}
                  className="bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-black font-bold py-4 px-8 rounded-full transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-cyan-400/50"
                >
                  INCREASE
                </button>
                <button
                  onClick={() => setCount(0)}
                  className="ml-4 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold py-4 px-8 rounded-full transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  RESET
                </button>
              </div>
            </div>

            {/* Toggle Switch Card */}
            <div className="bg-gradient-to-br from-violet-800/50 to-purple-800/50 backdrop-blur-sm border border-pink-400/30 rounded-2xl p-8 shadow-2xl hover:shadow-pink-400/20 transition-all duration-300">
              <h3 className="text-2xl font-bold text-pink-400 mb-6 text-center">TOGGLE SWITCH</h3>
              <div className="text-center">
                <div className={`text-4xl mb-6 transition-all duration-300 ${isToggled ? 'text-cyan-400 glow-text' : 'text-gray-400'}`}>
                  {isToggled ? '◆ ACTIVE ◆' : '◇ INACTIVE ◇'}
                </div>
                <button
                  onClick={() => setIsToggled(!isToggled)}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-200 ${
                    isToggled ? 'bg-gradient-to-r from-cyan-500 to-pink-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ${
                      isToggled ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Progress Bars Card */}
            <div className="bg-gradient-to-br from-cyan-800/50 to-blue-800/50 backdrop-blur-sm border border-yellow-400/30 rounded-2xl p-8 shadow-2xl hover:shadow-yellow-400/20 transition-all duration-300">
              <h3 className="text-2xl font-bold text-yellow-400 mb-6 text-center">PROGRESS BARS</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-cyan-300 mb-1">
                    <span>POWER</span>
                    <span>85%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-cyan-400 to-pink-500 h-3 rounded-full w-[85%] animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-pink-300 mb-1">
                    <span>ENERGY</span>
                    <span>72%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-pink-500 to-yellow-400 h-3 rounded-full w-[72%] animate-pulse"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm text-yellow-300 mb-1">
                    <span>SYNC</span>
                    <span>94%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div className="bg-gradient-to-r from-yellow-400 to-cyan-400 h-3 rounded-full w-[94%] animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'RESPONSIVE', icon: '📱', color: 'from-cyan-500 to-blue-500' },
              { title: 'ANIMATIONS', icon: '✨', color: 'from-pink-500 to-purple-500' },
              { title: 'GRADIENTS', icon: '🌈', color: 'from-yellow-400 to-orange-500' },
              { title: 'COMPONENTS', icon: '🔧', color: 'from-green-400 to-cyan-500' }
            ].map((feature, index) => (
              <div key={index} className="group bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:border-white/30 transition-all duration-300 hover:transform hover:scale-105">
                <div className="text-4xl mb-4 group-hover:animate-bounce">{feature.icon}</div>
                <h4 className={`text-lg font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                  {feature.title}
                </h4>
                <div className="mt-2 text-gray-400 text-sm">Ready to use</div>
              </div>
            ))}
          </section>

          {/* Footer */}
          <footer className="text-center py-8 border-t border-purple-500/30">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-2xl p-8 border border-cyan-400/20">
              <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 mb-4">
                🚀 TAILWIND CSS + AMPLIFY
              </h3>
              <p className="text-purple-200 text-lg">
                The future of web development is here. Neon dreams made reality.
              </p>
              <div className="mt-6 flex justify-center space-x-4">
                <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-cyan-300 text-sm">
                  RETRO
                </div>
                <div className="px-4 py-2 bg-pink-500/20 border border-pink-400/50 rounded-full text-pink-300 text-sm">
                  FUTURISTIC
                </div>
                <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-400/50 rounded-full text-yellow-300 text-sm">
                  SYNTHWAVE
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
