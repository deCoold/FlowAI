import { Landing } from '@/app/components/landing'

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col  p-24'>
      <div className='w-full font-mono '>
        <p
          className='w-40 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30'>
          Flow AI
        </p>
        <div
          className='w-full mt-8 h-screen'>
          <Landing />
        </div>
      </div>

    </main>
  )
}
