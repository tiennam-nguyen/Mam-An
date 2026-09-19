export function hasNonemptyProviderKeys(text: string): boolean {
 return text.split(/\r?\n/).some(line => {
  const match=/^[ \t]*[A-Z_][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET)\s*=(.*)$/.exec(line);
  return !!match?.[1]?.trim().replace(/^(['"])(.*)\1$/,'$2');
 });
}
