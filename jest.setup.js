import '@testing-library/jest-dom'

// Mock next/router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createGain: jest.fn().mockReturnValue({
    gain: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createOscillator: jest.fn().mockReturnValue({
    frequency: { value: 440 },
    type: 'sine',
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }),
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
    getFloatFrequencyData: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createScriptProcessor: jest.fn().mockReturnValue({
    onaudioprocess: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createBiquadFilter: jest.fn().mockReturnValue({
    type: 'lowpass',
    frequency: { value: 350 },
    Q: { value: 1 },
    gain: { value: 0 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createConvolver: jest.fn().mockReturnValue({
    buffer: null,
    normalize: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createDelay: jest.fn().mockReturnValue({
    delayTime: { value: 0 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createDynamicsCompressor: jest.fn().mockReturnValue({
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 12 },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createBuffer: jest.fn().mockReturnValue({
    numberOfChannels: 2,
    length: 44100,
    sampleRate: 44100,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
  }),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    playbackRate: { value: 1 },
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }),
  decodeAudioData: jest.fn().mockResolvedValue({
    numberOfChannels: 2,
    length: 44100,
    sampleRate: 44100,
    getChannelData: jest.fn().mockReturnValue(new Float32Array(44100)),
  }),
  destination: {
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
  sampleRate: 44100,
  currentTime: 0,
  state: 'running',
  suspend: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
}))

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn().mockReturnValue([]),
  getEntriesByType: jest.fn().mockReturnValue([]),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
}

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16)
})

global.cancelAnimationFrame = jest.fn()

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((callback) => {
  setTimeout(callback, 0)
})

global.cancelIdleCallback = jest.fn()

// Mock File API
global.File = jest.fn().mockImplementation((chunks, filename, options) => ({
  name: filename,
  size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  type: options?.type || '',
  lastModified: Date.now(),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  text: jest.fn().mockResolvedValue(''),
  stream: jest.fn(),
}))

global.FileReader = jest.fn().mockImplementation(() => ({
  readAsArrayBuffer: jest.fn(),
  readAsDataURL: jest.fn(),
  readAsText: jest.fn(),
  onload: null,
  onerror: null,
  result: null,
}))

// Mock Blob
global.Blob = jest.fn().mockImplementation((chunks, options) => ({
  size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
  type: options?.type || '',
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  text: jest.fn().mockResolvedValue(''),
  stream: jest.fn(),
}))

// Mock URL.createObjectURL
global.URL = {
  ...global.URL,
  createObjectURL: jest.fn(() => 'mock-object-url'),
  revokeObjectURL: jest.fn(),
}

// Mock canvas
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => ({ data: new Array(4) })),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

global.localStorage = localStorageMock

// Mock sessionStorage
global.sessionStorage = localStorageMock

// Mock navigator
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: jest.fn().mockReturnValue([]),
    }),
  },
})

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})