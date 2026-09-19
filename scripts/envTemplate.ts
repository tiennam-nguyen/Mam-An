export function hasNonemptyProviderKeys(text: string): boolean {
 return text.split(/\r?\n/).some(line => {
  const match=/^[ \t]*(?:GROQ_API_KEY|OPENROUTER_API_KEY)=(.*)$/.exec(line);
  return !!match?.[1]?.trim().replace(/^(['"])(.*)\1$/,'$2');
 });
}
