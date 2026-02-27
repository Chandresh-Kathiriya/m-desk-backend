import { IPaymentTerm } from '../models/PaymentTerm.js';

export const generatePaymentTermsText = (
  term: IPaymentTerm,
  invoiceDate: Date,
  baseAmount: number,
  totalAmount: number
): string => {
  // If no early discount, just return the standard term name
  if (!term.earlyPaymentDiscount) {
    return `Payment Terms: ${term.name}`;
  }

  // 1. Determine if the % applies to the base items price or the grand total
  const targetAmount = term.earlyPayDiscountComputation === 'total_amount' 
    ? totalAmount 
    : baseAmount;

  // 2. Calculate the exact monetary discount
  const discountValue = (targetAmount * term.discountPercentage) / 100;

  // 3. Calculate the exact expiration date
  const earlyPayDate = new Date(invoiceDate.getTime());
  earlyPayDate.setDate(earlyPayDate.getDate() + term.discountDays);

  // Format date to standard DD/MM/YYYY
  const formattedDate = earlyPayDate.toLocaleDateString('en-GB');

  // 4. Return the exact multi-line string required for the PDF
  return `Payment Terms: ${term.name}\nEarly payment discount: ${discountValue.toFixed(2)} if paid before ${formattedDate}`;
};