// Canada has no e-invoice format and no official validator. These checks follow the Canada Revenue Agency's
// "input tax credit information requirements" (guide RC4022): what an invoice must show so the customer can claim back GST/HST.
// They are checks of this tool, clearly labelled as such in the interface.
import { D, add, sub, mul, div, round, cmp, sum, str } from './decimal.js';

const has = v => v !== undefined && v !== null && String(v).trim() !== '';
const squash = v => String(v || '').replace(/[\s-]/g, '').toUpperCase();
const near = (a, b, tol = '0.01') => { const d = sub(a, b); const abs = d.n < 0n ? { n: -d.n, s: d.s } : d; return cmp(abs, D(tol)) <= 0; };

export function caChecks(data) {
  const out = []; const f = (id, severity, title, fix, field = null) => out.push({ id, severity, title, fix, field });
  const s = data.seller || {}, b = data.buyer || {}, t = data.totals || {};
  const total = D(t.grandTotal); const abs = total ? (total.n < 0n ? { n: -total.n, s: total.s } : total) : null;
  const atLeast = v => abs && cmp(abs, D(v)) >= 0;
  const schemes = new Set((data.breakdown || []).filter(g => D(g.tax) && D(g.tax).n !== 0n).map(g => (g.scheme || '').toUpperCase()));
  const charged = [...schemes].some(x => x === 'GST' || x === 'HST' || x === 'GST/HST');

  // every invoice
  if (!has(s.name)) f('CA-01', 'error', 'Your business name is missing.', 'Every invoice must show the name you do business under.', 'seller.name');
  if (!has(data.number)) f('CA-04', 'error', 'The invoice number is missing.', 'Give every invoice its own number.', 'number');
  if (!has(data.issueDate)) f('CA-02', 'error', 'The invoice date is missing.', 'Enter the date of the invoice.', 'issueDate');
  if (!total) f('CA-03', 'error', 'The total amount is missing.', 'Check that every line has a quantity and a price.', 'lines');

  // $100 or more: the GST/HST registration number and the tax itself
  const gst = squash(s.vatId);
  if (charged && !gst) f('CA-10', atLeast('100') ? 'error' : 'warning', 'Your GST/HST number is missing.', atLeast('100') ? 'For sales of $100 or more the invoice must show your GST/HST registration number, or your customer cannot claim the tax back.' : 'It is good practice to show your GST/HST registration number on every invoice; from $100 it is required.', 'seller.vatId');
  else if (gst && !/^\d{9}RT\d{4}$/.test(gst)) f('CA-11', 'error', 'Your GST/HST number does not have the right form.', 'A GST/HST number is the 9-digit business number followed by RT and 4 digits, for example 123456789 RT0001.', 'seller.vatId');
  if (schemes.has('QST')) {
    const qst = squash(s.taxNumber);
    if (!qst) f('CA-12', atLeast('100') ? 'error' : 'warning', 'Your QST number is missing.', 'Quebec sales tax is charged, so the invoice must show your QST registration number.', 'seller.taxNumber');
    else if (!/^\d{10}TQ\d{4}$/.test(qst)) f('CA-13', 'error', 'Your QST number does not have the right form.', 'A QST number is 10 digits followed by TQ and 4 digits, for example 1234567890 TQ0001.', 'seller.taxNumber');
  }
  if (schemes.has('PST') && !has(s.pstNumber)) f('CA-14', 'warning', 'Provincial sales tax is charged without a PST number.', 'British Columbia, Saskatchewan and Manitoba expect your provincial registration number on the invoice.', 'seller.siteId');
  if (!charged && gst && (data.breakdown || []).length && (data.breakdown || []).every(g => g.category === 'O')) f('CA-15', 'warning', 'A GST/HST number is shown although no tax is charged as a small supplier.', 'A small supplier who is not registered has no GST/HST number. If you are registered, charge the tax.', 'seller.vatId');

  // $500 or more: who bought, what, and on which terms
  if (atLeast('500')) {
    if (!has(b.name)) f('CA-20', 'error', 'The customer’s name is missing.', 'For sales of $500 or more the invoice must name the buyer.', 'buyer.name');
    if ((data.lines || []).some(l => !has(l.name) && !has(l.description))) f('CA-21', 'error', 'A line has no description.', 'For sales of $500 or more each supply must be described well enough to identify it.', 'lines');
    if (!has(data.payment?.terms) && !has(data.dueDate)) f('CA-22', 'error', 'The terms of payment are missing.', 'For sales of $500 or more the invoice must state the payment terms, for example “Net 30 days”, or a due date.', 'paymentTerms');
  }

  // arithmetic (no official rule set exists for Canada, so the sums are checked here)
  for (const g of data.breakdown || []) {
    const basis = D(g.basis), tax = D(g.tax), rate = D(g.rate);
    if (basis && tax && rate && !near(tax, round(div(mul(basis, rate), '100', 6), 2))) f('CA-30', 'error', `The ${g.scheme || 'tax'} amount does not match its rate.`, `Tax = taxable amount × rate ÷ 100. Here: ${str(basis)} × ${str(rate)} % should give ${str(round(div(mul(basis, rate), '100', 6), 2), 2)}, not ${str(tax, 2)}.`, 'lines');
  }
  const lineSum = sum((data.lines || []).map(l => D(l.netAmount)).filter(Boolean));
  if (D(t.lineTotal) && (data.lines || []).length && !near(D(t.lineTotal), lineSum)) f('CA-31', 'error', 'The sum of the lines does not match the stated line total.', 'Add up the amounts of all lines; the result must equal the “sum of lines”.', 'lines');
  for (const l of data.lines || []) { const q = D(l.quantity), p = D(l.unitPrice), n = D(l.netAmount); if (q && p && n && !(l.allowances || []).length && !near(n, round(mul(q, p), 2))) { f('CA-32', 'error', 'A line amount does not match quantity × price.', 'Line amount = quantity × unit price.', 'lines'); break; } }
  if (D(t.taxBasis) && D(t.taxTotal) && total && !near(total, add(D(t.taxBasis), D(t.taxTotal)))) f('CA-33', 'error', 'The total is calculated wrongly.', 'Total = total before tax + all taxes.', 'lines');
  const taxSum = sum((data.breakdown || []).map(g => D(g.tax)).filter(Boolean));
  if (D(t.taxTotal) && (data.breakdown || []).length && !near(D(t.taxTotal), taxSum)) f('CA-34', 'error', 'The tax total does not match the taxes listed.', 'The tax total must equal the sum of GST/HST and provincial tax amounts.', 'lines');
  if (D(t.due) && total && !near(D(t.due), sub(total, D(t.prepaid) || D('0')))) f('CA-35', 'error', 'The amount due is calculated wrongly.', 'Amount due = total − amount already paid.', 'prepaid');
  return out;
}
