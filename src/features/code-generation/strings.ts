// UTF-8 bytes as fixed-width octal escapes prevent C++ injection and hex escape ambiguity.
export function cppString(value: string) {
  return '"' + Array.from(new TextEncoder().encode(value), byte => byte >= 32 && byte <= 126 && byte !== 34 && byte !== 92 ? String.fromCharCode(byte) : "\\" + byte.toString(8).padStart(3, "0")).join("") + '"';
}
