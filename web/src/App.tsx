import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { ItemDetail } from './components/items'
import { ItemDetailProvider } from './hooks'
import { Today, Tasks, Events, Ideas, Reference } from './pages'

function App() {
  return (
    <BrowserRouter>
      <ItemDetailProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Today />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/events" element={<Events />} />
            <Route path="/ideas" element={<Ideas />} />
            <Route path="/reference" element={<Reference />} />
          </Route>
        </Routes>
        <ItemDetail />
      </ItemDetailProvider>
    </BrowserRouter>
  )
}

export default App
