export const generateHexadecimalCode = (length: number): string => {
  const characters = "0123456789ABCDEF";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomNumber = Math.floor(Math.random() * characters.length);

    result += characters.charAt(randomNumber);
  }

  return result;
};
