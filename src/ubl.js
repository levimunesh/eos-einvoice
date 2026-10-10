// Generate a UBL 2.1 Invoice / CreditNote from the invoice model.
// Australia: Peppol PINT A-NZ, the only format on the Australian e-invoicing network.
// Canada: plain UBL 2.1 (Canada has no national format); GST/HST and provincial taxes are listed as separate tax schemes.
import { D, str, isZero } from './decimal.js';
import { computeTotals, fmt2 } from './model.js';
import { cfg } from './countries.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
const has = v => v !== undefined && v !== null && String(v).trim() !== '';
const el = (name, value, attrs = '') => (has(value) ? `<${name}${attrs}>${esc(String(value).trim())}</${name}>` : '');
const wrap = (name, inner) => (inner ? `<${name}>${inner}</${name}>` : '');
const isoDate = v => (/^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : '');
const digits = v => String(v || '').replace(/[\s-]/g, '');

export const UBL_SPEC = {
  AU: { customization: 'urn:peppol:pint:billing-1@aunz-1', profile: 'urn:peppol:bis:billing', taxScheme: 'GST' },
  CA: { customization: '', profile: '', taxScheme: 'GST/HST' },
};

// Why no tax is charged, per category, in the wording of the invoice's country.
export function ublExemption(inv, category) {
  const c = cfg(inv.country);
  if (inv.smallBusiness) return has(inv.exemptionReason) ? inv.exemptionReason : c.smallBusiness.reason;
  if (category === 'E' && has(inv.exemptionReason)) return inv.exemptionReason;
  return (c.exemptionText || {})[category] || '';
}

// The model's tax categories, mapped to the ones the country's rules know.
export function localCategory(inv, cat) {
  if (inv.smallBusiness) return 'O';
  if (inv.country === 'AU' && (cat === 'K' || cat === 'AE')) return 'G';
  if (inv.country === 'CA' && ['K', 'AE', 'G'].includes(cat)) return 'Z';
  if (inv.country === 'CA' && cat === 'O') return 'E';
  return cat;
}
// The model with those categories applied: totals are calculated on this.
export function localModel(inv) {
  return { ...inv, smallBusiness: false, lines: inv.lines.map(l => ({ ...l, vatCategory: localCategory(inv, l.vatCategory) })), allowances: (inv.allowances || []).map(a => ({ ...a, vatCategory: localCategory(inv, a.vatCategory) })) };
}

export function generateUBL(inv) {
  const ca = inv.country === 'CA';
  const spec = UBL_SPEC[inv.country] || UBL_SPEC.AU;
  const T = computeTotals(localModel(inv));
  const cur = inv.currency || cfg(inv.country).currency;
  const credit = inv.typeCode === '381';
  const root = credit ? 'CreditNote' : 'Invoice';
  const s = inv.seller, b = inv.buyer, pay = inv.payment;
  const amt = (name, d) => `<cbc:${name} currencyID="${esc(cur)}">${fmt2(d)}</cbc:${name}>`;
  const scheme = id => `<cac:TaxScheme><cbc:ID>${esc(id)}</cbc:ID></cac:TaxScheme>`;
  const parts = ca ? cfg('CA').taxParts : null;
  // one tax category element per tax: Canada lists GST and the provincial tax separately
  const taxCategories = (tag, cat, rate, withReason) => {
    const split = (parts && cat === 'S' && parts[str(D(rate) ?? D('0'))]) || [[spec.taxScheme === 'GST/HST' ? 'GST' : spec.taxScheme, rate]];
    return split.map(([sch, r]) => `<cac:${tag}><cbc:ID>${esc(cat)}</cbc:ID>${cat === 'O' ? '' : el('cbc:Percent', str(D(r) ?? D('0')))}${withReason ? el('cbc:TaxExemptionReason', ublExemption(inv, cat)) : ''}${scheme(sch)}</cac:${tag}>`).join('');
  };
  const registered = !inv.smallBusiness;

  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += `<${root} xmlns="urn:oasis:names:specification:ubl:schema:xsd:${root}-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`;
  x += el('cbc:UBLVersionID', ca ? '2.1' : '') + el('cbc:CustomizationID', spec.customization) + el('cbc:ProfileID', spec.profile) + el('cbc:ID', inv.number) + el('cbc:IssueDate', isoDate(inv.issueDate));
  if (!credit) x += el('cbc:DueDate', isoDate(inv.dueDate));
  x += el(credit ? 'cbc:CreditNoteTypeCode' : 'cbc:InvoiceTypeCode', credit ? '381' : (inv.typeCode || '380'));
  x += el('cbc:Note', inv.note) + el('cbc:DocumentCurrencyCode', cur) + el('cbc:BuyerReference', inv.buyerReference);
  if (isoDate(inv.periodStart) || isoDate(inv.periodEnd)) x += wrap('cac:InvoicePeriod', el('cbc:StartDate', isoDate(inv.periodStart)) + el('cbc:EndDate', isoDate(inv.periodEnd)));
  if (has(inv.orderReference)) x += wrap('cac:OrderReference', el('cbc:ID', inv.orderReference));
  if (has(inv.precedingNumber)) x += wrap('cac:BillingReference', wrap('cac:InvoiceDocumentReference', el('cbc:ID', inv.precedingNumber) + el('cbc:IssueDate', isoDate(inv.precedingDate))));
  if (has(inv.contractReference)) x += wrap('cac:ContractDocumentReference', el('cbc:ID', inv.contractReference));

  const address = p => '<cac:PostalAddress>' + el('cbc:StreetName', p.street) + el('cbc:CityName', p.city) + el('cbc:PostalZone', p.postcode) + el('cbc:CountrySubentity', p.state)
    + `<cac:Country>${el('cbc:IdentificationCode', p.country)}</cac:Country></cac:PostalAddress>`;
  // Business number scheme by country: ABN (0151) in Australia, NZBN (0088) in New Zealand; elsewhere a 13-digit GLN (0088) or 9-digit DUNS (0060).
  const schemeOf = p => { const id = digits(p.nationalId); return p.country === 'AU' ? '0151' : p.country === 'NZ' ? '0088' : /^\d{13}$/.test(id) ? '0088' : /^\d{9}$/.test(id) && !ca ? '0060' : ''; };
  // electronic address (the Peppol ID the network delivers to) and legal registration, both from the business number
  const endpoint = p => (!ca && has(p.nationalId) && schemeOf(p) ? el('cbc:EndpointID', digits(p.nationalId), ` schemeID="${schemeOf(p)}"`) : '');
  const legal = p => '<cac:PartyLegalEntity>' + el('cbc:RegistrationName', p.name) + (has(p.nationalId) ? el('cbc:CompanyID', digits(p.nationalId), schemeOf(p) ? ` schemeID="${schemeOf(p)}"` : '') : '') + '</cac:PartyLegalEntity>';
  // tax registrations. Australia: the ABN. Canada: the GST/HST number, and the Quebec (QST) and provincial (PST) numbers when given.
  const taxReg = (id, sch) => (has(id) ? `<cac:PartyTaxScheme>${el('cbc:CompanyID', String(id).replace(/\s/g, ''))}${scheme(sch)}</cac:PartyTaxScheme>` : '');
  const sellerTax = !registered ? '' : ca ? taxReg(s.vatId, 'GST/HST') + taxReg(s.taxNumber, 'QST') + taxReg(s.siteId, 'PST') : taxReg(digits(s.nationalId), spec.taxScheme);

  x += '<cac:AccountingSupplierParty><cac:Party>' + endpoint(s)
    + (has(s.id) ? wrap('cac:PartyIdentification', el('cbc:ID', s.id)) : '')
    + wrap('cac:PartyName', el('cbc:Name', s.name)) + address(s) + sellerTax + legal(s)
    + wrap('cac:Contact', el('cbc:Name', s.contactName) + el('cbc:Telephone', s.contactPhone) + el('cbc:ElectronicMail', s.contactEmail))
    + '</cac:Party></cac:AccountingSupplierParty>';
  x += '<cac:AccountingCustomerParty><cac:Party>' + endpoint(b)
    + (has(b.id) ? wrap('cac:PartyIdentification', el('cbc:ID', b.id)) : '')
    + wrap('cac:PartyName', el('cbc:Name', b.name)) + address(b) + (ca ? taxReg(b.vatId, 'GST/HST') : '') + legal(b)
    + '</cac:Party></cac:AccountingCustomerParty>';
  if (isoDate(inv.deliveryDate)) x += wrap('cac:Delivery', el('cbc:ActualDeliveryDate', inv.deliveryDate));

  // payment: bank transfer with branch (BSB / transit) and account number, or an IBAN for overseas accounts
  const acct = has(pay.account) ? digits(pay.account) : has(pay.iban) ? digits(pay.iban) : '';
  x += '<cac:PaymentMeans>' + el('cbc:PaymentMeansCode', pay.meansCode === '58' || pay.meansCode === '59' ? '30' : (pay.meansCode || '30')) + el('cbc:PaymentID', pay.remittance);
  if (acct) x += '<cac:PayeeFinancialAccount>' + el('cbc:ID', acct) + el('cbc:Name', pay.accountName)
    + (has(pay.bsb) ? wrap('cac:FinancialInstitutionBranch', el('cbc:ID', digits(pay.bsb))) : has(pay.bic) ? wrap('cac:FinancialInstitutionBranch', el('cbc:ID', digits(pay.bic))) : '') + '</cac:PayeeFinancialAccount>';
  x += '</cac:PaymentMeans>';
  if (has(inv.paymentTerms)) x += wrap('cac:PaymentTerms', el('cbc:Note', inv.paymentTerms));

  for (const a of T.allowances) {
    if (!a.amt) continue;
    x += '<cac:AllowanceCharge>' + `<cbc:ChargeIndicator>${a.charge ? 'true' : 'false'}</cbc:ChargeIndicator>`
      + el('cbc:AllowanceChargeReason', has(a.reason) ? a.reason : (a.charge ? 'Charge' : 'Discount')) + amt('Amount', a.amt)
      + taxCategories('TaxCategory', a.vatCategory, a.vatRate, false) + '</cac:AllowanceCharge>';
  }

  x += '<cac:TaxTotal>' + amt('TaxAmount', T.taxTotal);
  for (const g of T.breakdown) {
    const reason = g.category === 'E' || g.category === 'O' || (ca && g.category === 'Z');
    if (g.parts) for (const p of g.parts) x += '<cac:TaxSubtotal>' + amt('TaxableAmount', g.basis) + amt('TaxAmount', p.tax) + `<cac:TaxCategory><cbc:ID>S</cbc:ID>${el('cbc:Percent', p.rate)}${scheme(p.scheme)}</cac:TaxCategory></cac:TaxSubtotal>`;
    else x += '<cac:TaxSubtotal>' + amt('TaxableAmount', g.basis) + amt('TaxAmount', g.tax) + taxCategories('TaxCategory', g.category, g.rate, reason) + '</cac:TaxSubtotal>';
  }
  x += '</cac:TaxTotal>';

  x += '<cac:LegalMonetaryTotal>' + amt('LineExtensionAmount', T.lineTotal) + amt('TaxExclusiveAmount', T.taxBasis) + amt('TaxInclusiveAmount', T.grandTotal)
    + (isZero(T.allowanceTotal) ? '' : amt('AllowanceTotalAmount', T.allowanceTotal)) + (isZero(T.chargeTotal) ? '' : amt('ChargeTotalAmount', T.chargeTotal))
    + (T.prepaid ? amt('PrepaidAmount', T.prepaid) : '') + amt('PayableAmount', T.due) + '</cac:LegalMonetaryTotal>';

  T.lines.forEach((l, i) => {
    const line = credit ? 'CreditNoteLine' : 'InvoiceLine';
    x += `<cac:${line}>` + el('cbc:ID', has(l.id) ? l.id : String(i + 1))
      + el(credit ? 'cbc:CreditedQuantity' : 'cbc:InvoicedQuantity', D(l.quantity) ? str(D(l.quantity)) : '', ` unitCode="${esc(l.unit || 'C62')}"`)
      + (l.net ? amt('LineExtensionAmount', l.net) : '')
      + '<cac:Item>' + el('cbc:Description', l.description) + el('cbc:Name', l.name)
      + (has(l.itemId) ? wrap('cac:SellersItemIdentification', el('cbc:ID', l.itemId)) : '')
      + taxCategories('ClassifiedTaxCategory', l.vatCategory, l.vatRate, false) + '</cac:Item>'
      + wrap('cac:Price', D(l.unitPrice) ? `<cbc:PriceAmount currencyID="${esc(cur)}">${str(D(l.unitPrice))}</cbc:PriceAmount>` : '')
      + `</cac:${line}>`;
  });
  x += `</${root}>`;
  return x;
}
