"use client";

interface AccountInfo {
  email: string;
  mobile: string;
}

interface AccountListProps {
  accounts: AccountInfo[];
}

export default function AccountList({ accounts }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-surface-300 bg-surface-100 p-6 shadow-whisper">
        <h3 className="font-serif text-lg text-text-primary mb-4">Account Pool</h3>
        <div className="flex h-24 items-center justify-center">
          <p className="text-sm text-text-muted font-sans">
            No accounts found. Make sure config.toml exists in the parent directory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-300 bg-surface-100 shadow-whisper">
      <div className="border-b border-surface-300 p-5">
        <h3 className="font-serif text-lg text-text-primary">Account Pool</h3>
        <p className="text-sm text-text-secondary mt-1 font-sans">
          {accounts.length} accounts configured (read from config.toml)
        </p>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-1 gap-0 divide-y divide-surface-300">
          {accounts.map((account, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-200"
            >
              {/* Index */}
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-300 text-[10px] font-mono text-text-muted">
                {i + 1}
              </span>

              {/* Status dot */}
              <span className="h-2 w-2 shrink-0 rounded-full bg-success shadow-[0_0_8px_rgba(83,141,83,0.5)]" />

              {/* Email/Mobile */}
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-text-secondary">
                {account.email || account.mobile || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
