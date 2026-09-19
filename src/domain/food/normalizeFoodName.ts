export const normalizeFoodName = (name: string): string => name.normalize('NFC').trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
