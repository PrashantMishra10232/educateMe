import React from 'react'
import { LogIn, Search, Menu } from 'lucide-react'
import { Button } from '../ui/button'

function Navbar() {
  return (
    <div>
      <div className='w-full flex justify-between px-8 py-3 shadow-2xl'>
        <div className='flex gap-3 items-center justify-center'>
          <div className='md:hidden'><Menu /></div>
          <div className='text-2xl w-2/3'>logo</div>
        </div>

        <div className='md:hidden flex gap-2'>
          <button><Search /></button>
          <button><LogIn /></button>
        </div>
        <div className='hidden md:flex justify-around md:w-1/3 p-2'>
        
          <div className='flex rounded-full overflow-hidden w-fit bg-gray-200'>
            <form className='flex'>
              <input type="search" name='query' id='query' placeholder='Type here to search..' className='py-2 px-4 border border-gray-400 rounded-l-full w-[200px] focus:outline-none' />
              <button type='submit' className='w-[40px] flex items-center justify-center border border-gray-400 rounded-r-full hover:bg-gray-300 cursor-pointer'><Search size={18} /></button>
            </form>
          </div>

          <div className='flex gap-2'>
            <Button className='text-white bg-blue-500 font-semibold rounded-2xl py-4  text-[1.1rem] cursor-pointer hover:bg-blue-400'>Signup</Button>
            <Button className='text-white bg-blue-500 font-semibold rounded-2xl py-4 text-[1.1rem] cursor-pointer hover:bg-blue-400'>Login</Button>
          </div>

        </div>

      </div>
    </div>
  )
}

export default Navbar