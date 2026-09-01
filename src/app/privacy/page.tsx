export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <h1 className="text-3xl font-black text-primary mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-slate-600 leading-relaxed">
          <p>Last Updated: September 1, 2026</p>

          <p>
            FxD Event Staffing ("we," "our," or "us") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, and safeguard your information 
            when you use our platform.
          </p>

          <p className="font-bold text-slate-800 text-lg mt-8 mb-2">1. Information We Collect</p>
          <p>
            We collect personal information that you voluntarily provide to us when registering 
            on the platform, expressing an interest in obtaining information about us or our 
            services, or otherwise contacting us. This includes your name, email address, and 
            mobile phone number. We collect your phone number exclusively for the purpose of 
            account security, authentication (OTP), and essential platform notifications.
          </p>

          <p className="font-bold text-slate-800 text-lg mt-8 mb-2">2. SMS & Mobile Data Policy</p>
          <p className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-medium text-slate-700">
            No mobile information will be shared with third parties or affiliates for marketing 
            or promotional purposes. All other categories exclude text messaging originator 
            opt-in data and consent; this information will not be shared with any third parties.
          </p>

          <p className="font-bold text-slate-800 text-lg mt-8 mb-2">3. Opting Out of Communications</p>
          <p>
            You may opt out of receiving SMS messages from us at any time by replying <strong>STOP</strong> to 
            any message. Standard message and data rates may apply. For assistance, you can 
            reply <strong>HELP</strong> or contact our support team.
          </p>

          <p className="font-bold text-slate-800 text-lg mt-8 mb-2">4. Data Security</p>
          <p>
            We have implemented appropriate technical and organizational security measures 
            designed to protect the security of any personal information we process.
          </p>
          
          <p className="mt-12 text-sm text-slate-500">
            If you have questions or comments about this notice, you may email us at hello@fxdevents.com.
          </p>
        </div>
      </div>
    </div>
  )
}