// Tells the frame's auth listener that a SIGNED_OUT event was asked for (Sign out button),
// so it doesn't treat it as an expired session.
let signingOut = false;

export function markSigningOut(): void {
  signingOut = true;
}

export function isSigningOut(): boolean {
  return signingOut;
}
