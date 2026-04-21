export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: April 21, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p>When you connect your Google account, we access your Gmail messages and Google Calendar events solely to display them within the CRM. We store your OAuth tokens securely to maintain your connection.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Display your emails and calendar events inside the CRM dashboard</li>
          <li>Allow you to send emails and create calendar events on your behalf</li>
          <li>Store contact and deal information you enter manually</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. Data Sharing</h2>
        <p>We do not sell, rent, or share your personal data with third parties. Your Google data is only used to provide the features you requested.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">4. Data Storage</h2>
        <p>Your data is stored securely in Supabase. OAuth tokens are encrypted and only accessible by the server. We do not store your Google password.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">5. Google API Scopes</h2>
        <p>We request the following Google permissions:</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li><strong>Gmail:</strong> Read and send emails on your behalf</li>
          <li><strong>Google Calendar:</strong> Read and create calendar events</li>
        </ul>
        <p className="mt-2">We only use these permissions for the features described above and nothing else.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">6. Revoking Access</h2>
        <p>You can disconnect your Google account at any time from the Settings page. You can also revoke access from your <a href="https://myaccount.google.com/permissions" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Google Account settings</a>.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
        <p>If you have any questions about this privacy policy, contact us at: <a href="mailto:issacn90474@gmail.com" className="text-blue-600 underline">issacn90474@gmail.com</a></p>
      </section>
    </div>
  );
}
