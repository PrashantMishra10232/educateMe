import React, { useRef } from 'react'
import Navbar from './Shared/Navbar'
import Autoplay from 'embla-carousel-autoplay'
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"

function Home() {

  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  return (
    <div className='min-h-screen w-full'>
      <Navbar />
      <div className='flex min-h-screen'>
        <div className='w-[20%] bg-blue-100'>hello</div>
        <div className='w-[80%]'>

          {/* latest course carousel */}
          <div className="carousel border border-amber-300 py-10 px-6 flex items-center justify-center">
            <Carousel
              plugins={[plugin.current]}
              onMouseEnter={plugin.current.stop}
              onMouseLeave={plugin.current.reset}
              className='w-[80%] h-[600px] overflow-hidden rounded-[20px]'
            >
              <CarouselContent>
                <CarouselItem>
                  <img src="https://www.successindegrees.org/wp-content/uploads/course-selection-1024x576.jpg" alt="course" className='w-fit rounded-[20px]'/>
                </CarouselItem>
                <CarouselItem>
                  <img src="https://www.cheggindia.com/wp-content/uploads/2022/10/Which-Post-Graduation-Course-you-need-to-pursue-in-todays-economy-1.png" alt="course" className='w-fit rounded-[20px]' />
                </CarouselItem>
                <CarouselItem>
                  <img src="https://www.successindegrees.org/wp-content/uploads/course-selection-1024x576.jpg" alt="course" className='w-fit rounded-[20px]'/>
                </CarouselItem>
                <CarouselItem>
                  <img src="https://www.cheggindia.com/wp-content/uploads/2022/10/Which-Post-Graduation-Course-you-need-to-pursue-in-todays-economy-1.png" alt="course" className='w-fit rounded-[20px]' />
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home