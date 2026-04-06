import { DivisionProblem, DivisionStep } from '../types';

export function createProblemFromDivisorAndDividend(divisor: number, dividend: number, id?: string): DivisionProblem {
  const dividendStr = dividend.toString();
  const steps: DivisionStep[] = [];
  
  let currentPos = 0;
  let currentPart = 0;
  let isFirstStep = true;

  while (currentPos < dividendStr.length) {
    const digit = parseInt(dividendStr[currentPos]);
    currentPart = currentPart * 10 + digit;
    currentPos++;

    if (currentPart >= divisor || (!isFirstStep)) {
      const qDigit = Math.floor(currentPart / divisor);
      const product = divisor * qDigit;
      const subResult = currentPart - product;
      
      if (qDigit > 0 || currentPos === dividendStr.length) {
        const minuend = currentPart;
        const minuendStr = minuend.toString();
        const prodStr = product.toString();
        const subResultStr = subResult.toString();
        
        const currentPartEndCol = currentPos - 1;
        
        const minuendColEnd = currentPartEndCol;
        const minuendColStart = minuendColEnd - minuendStr.length + 1;
        
        const productColEnd = currentPartEndCol;
        const productColStart = productColEnd - prodStr.length + 1;
        
        const subResultColEnd = currentPartEndCol;
        const subResultColStart = subResultColEnd - subResultStr.length + 1;

        steps.push({
          qDigit,
          minuend,
          minuendColStart,
          minuendColEnd,
          product,
          productColStart,
          productColEnd,
          subResult,
          subResultColStart,
          subResultColEnd
        });
      }
      
      currentPart = currentPart % divisor;
      isFirstStep = false;
    }
  }

  const actualQuotient = Math.floor(dividend / divisor);
  const actualRemainder = dividend % divisor;

  return {
    id: id || Math.random().toString(36).substr(2, 9),
    divisor,
    dividend,
    quotient: actualQuotient,
    remainder: actualRemainder,
    steps,
    dividendStr,
    quotientStr: actualQuotient.toString()
  };
}

export function generateComplexProblem(digits: number = 3): DivisionProblem {
  const divisor = Math.floor(Math.random() * 8) + 2; // 2-9
  const minDividend = Math.pow(10, digits - 1);
  const maxDividend = Math.pow(10, digits) - 1;
  const dividend = Math.floor(Math.random() * (maxDividend - minDividend + 1)) + minDividend;
  
  return createProblemFromDivisorAndDividend(divisor, dividend);
}
