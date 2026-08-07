import type React from "react";
import { Check, Loader2 } from "lucide-react";
import { SyncjoyLogo } from "../components/SyncjoyLogo";

export function InkjoyLogin({
  onSubmit,
  disabled,
  busy,
}: {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  busy: string;
}) {
  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div className="login-logo">
        <SyncjoyLogo />
        <p>Sign in to manage your e-ink frames</p>
      </div>

      <label>
        Email
        <input name="email" type="email" autoComplete="email" placeholder="user@example.com" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </label>
      <label>
        Server
        <select name="region" defaultValue="global">
          <option value="global">Global Server</option>
          <option value="mainland">China Mainland Server</option>
        </select>
      </label>
      <button type="submit" className="btn btn-primary btn-primary-block" disabled={disabled}>
        {busy ? <Loader2 size={15} /> : <Check size={15} />}
        {busy || "Sign In"}
      </button>
    </form>
  );
}
