import {createBrowserRouter, RouterProvider} from "react-router-dom"
import './App.css'
import Home from "./components/Home"

const appRouter = createBrowserRouter([
  {
    path:'/',
    element:<Home/>
  }
])

function App() {

  return (
    <div>
      <RouterProvider router={appRouter}/>
    </div>
  )
}

export default App
