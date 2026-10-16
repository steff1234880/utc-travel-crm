import Decimal from 'decimal.js';

export interface GstCalculationResult {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
}

export const calculateGst = (
  baseAmount: number,
  gstRate: number,
  isInclusive: boolean = false,
  isInterState: boolean = false
): GstCalculationResult => {
  if (baseAmount <= 0 || gstRate <= 0) {
    return {
      taxableAmount: baseAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      totalAmount: baseAmount
    };
  }

  const amount = new Decimal(baseAmount);
  const rate = new Decimal(gstRate);

  let taxable = amount;
  let totalTax = new Decimal(0);
  let total = amount;

  if (isInclusive) {
    // If inclusive: Taxable = Amount / (1 + (Rate/100))
    // Tax = Amount - Taxable
    const rateDiv100 = rate.div(100);
    const onePlusRate = new Decimal(1).plus(rateDiv100);
    taxable = amount.div(onePlusRate);
    totalTax = amount.minus(taxable);
    total = amount;
  } else {
    // If exclusive: Tax = Amount * (Rate/100)
    // Total = Amount + Tax
    const rateDiv100 = rate.div(100);
    totalTax = amount.times(rateDiv100);
    total = amount.plus(totalTax);
    taxable = amount;
  }

  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  if (isInterState) {
    igst = totalTax;
  } else {
    cgst = totalTax.div(2);
    sgst = totalTax.div(2);
  }

  return {
    taxableAmount: taxable.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    cgstAmount: cgst.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    sgstAmount: sgst.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    igstAmount: igst.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalTaxAmount: totalTax.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    totalAmount: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
  };
};

export const calculateExempt = (baseAmount: number): GstCalculationResult => {
  return {
    taxableAmount: baseAmount,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    totalTaxAmount: 0,
    totalAmount: baseAmount
  };
};
