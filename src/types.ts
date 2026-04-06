export interface DivisionStep {
  qDigit: number;
  minuend: number;
  minuendColStart: number;
  minuendColEnd: number;
  product: number;
  productColStart: number;
  productColEnd: number;
  subResult: number;
  subResultColStart: number;
  subResultColEnd: number;
}

export interface DivisionProblem {
  id: string;
  divisor: number;
  dividend: number;
  quotient: number;
  remainder: number;
  steps: DivisionStep[];
  dividendStr: string;
  quotientStr: string;
}
