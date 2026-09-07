// Politica de contrasena ya aprobada y repetida en varias pantallas (crear-cuenta, alta de
// operador/colaborador): minimo 8 caracteres, mayuscula, minuscula, numero y caracter
// especial. Centralizada aqui para no repetir la misma regex en cada formulario.
export function getPasswordPolicyError(password: string): string {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialCharacter = /[^A-Za-z0-9\s]/.test(password);

  if (hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialCharacter) return '';
  return 'La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un caracter especial.';
}
