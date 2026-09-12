/** Validação de CPF: formato + dígitos verificadores (algoritmo módulo 11). */
export function isValidCpf(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os digitos iguais

  const digits = cpf.split("").map(Number);

  const calcCheckDigit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calcCheckDigit(9) === digits[9] && calcCheckDigit(10) === digits[10];
}

export function formatCpf(raw: string): string {
  const cpf = raw.replace(/\D/g, "").slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCpf(raw: string): string {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11) return raw;
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}`;
}
