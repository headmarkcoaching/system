// One rule for every place a password is set (reset link, admin-created users, students, parents).
// Deliberately modest, because the people choosing these are parents and children: long enough to
// resist guessing, not a trivially common value, and not all letters or all digits.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "password1234", "12345678", "123456789", "1234567890",
  "11111111", "00000000", "qwerty123", "qwertyuiop", "iloveyou1", "admin123", "welcome1", "welcome123",
  "abc12345", "letmein123", "pakistan1", "pakistan123", "khan12345", "ali12345", "changeme1", "changeme123",
]);

/** Returns an error message, or null when the password is acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain both letters and numbers.";
  if (COMMON.has(password.toLowerCase())) return "That password is too common. Choose something harder to guess.";
  return null;
}
