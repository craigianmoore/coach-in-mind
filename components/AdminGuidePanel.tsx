"use client";

// Admin guide: a short, plain-English guide to running the admin screens, kept as a PDF so it can be downloaded and printed.
export default function AdminGuidePanel() {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div>
          <h2 className="font-semibold">Admin guide</h2>
          <p className="mt-1 text-sm text-gray-600">
            A normal day, how to check and approve a match, auto-approve, and what each tab is for. 3 pages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin-guide.pdf"
            download="Coach-In-Mind-Admin-Guide.pdf"
            className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Download PDF
          </a>
          <a
            href="/admin-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Open in new tab
          </a>
        </div>
      </div>
      <iframe
        src="/admin-guide.pdf#view=FitH"
        title="Admin guide"
        className="mt-4 hidden h-[75vh] w-full rounded-xl border bg-white sm:block"
      />
    </div>
  );
}
