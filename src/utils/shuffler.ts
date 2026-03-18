export const getShufflerConfig = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const isEven: boolean = dayOfYear % 2 === 0;

  return {
    currentCol: isEven ? "order_par" : "order_impar",
    oppositeCol: isEven ? "order_impar" : "order_par",
    isEven,
  };
};
