import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Micro-jobs for <span className="text-secondary">everyone.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              The easiest way to get tasks done or earn extra cash. 
              No complicated contracts, just connect and work.
            </p>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              
              {/* Button 1: For Workers */}
              <Link 
                href="/jobs" 
                className="rounded-md bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
              >
                Find Work
              </Link>
              
              {/* Button 2: For Employers */}
              <Link 
                href="/dashboard" 
                className="text-sm font-semibold leading-6 text-gray-900 border border-gray-200 px-5 py-3 rounded-md hover:bg-gray-50"
              >
                Post a Job <span aria-hidden="true">→</span>
              </Link>

            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-secondary">Work Faster</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to get started
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                    💰
                  </div>
                  Instant Pricing
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  See exactly how much a job pays before you apply. No hidden negotiations.
                </dd>
              </div>

              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                    🛡️
                  </div>
                  Secure Profiles
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Hire with confidence by checking applicant bios and past history.
                </dd>
              </div>

            </dl>
          </div>
        </div>
      </div>

    </div>
  )
}