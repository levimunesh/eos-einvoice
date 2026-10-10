// Generate UN/CEFACT Cross Industry Invoice (CII D16B) XML from the invoice model.
// The same XML serves as a standalone XRechnung file and as the embedded part of a ZUGFeRD / Factur-X PDF.
import { D, str, isZero } from './decimal.js';
import { computeTotals, fmt2, SPEC, PEPPOL_PROCESS } from './model.js';
import { cfg } from './countries.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // characters that are not allowed in XML 1.0
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '');
const has = v => v !== undefined && v !== null && String(v).trim() !== '';
const t = v => String(v).trim();
const el = (name, value, attrs = '') => (has(value) ? `<${name}${attrs}>${esc(t(value))}</${name}>` : '');
const wrap = (name, inner) => (inner ? `<${name}>${inner}</${name}>` : '');
const d102 = iso => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.replace(/-/g, '') : '');
const date = (name, iso, ns = 'udt') => (d102(iso) ? `<${name}><${ns}:DateTimeString format="102">${d102(iso)}</${ns}:DateTimeString></${name}>` : '');

// Why no VAT is charged (BT-120) and its code (BT-121), in the wording of the invoice's country.
export function exemptionFor(inv, category) {
  const c = cfg(inv.country);
  if (inv.smallBusiness) return { reason: has(inv.exemptionReason) ? inv.exemptionReason : c.smallBusiness.reason, code: has(inv.exemptionReason) ? '' : c.smallBusiness.code };
  const def = (c.exemption || {})[category] || cfg('DE').exemption[category];
  if (!def) return null;
  if (category === 'E') return { reason: has(inv.exemptionReason) ? inv.exemptionReason : def[1], code: '' };
  return { reason: def[1], code: def[0] };
}

function address(p) {
  return wrap('ram:PostalTradeAddress', el('ram:PostcodeCode', p.postcode) + el('ram:LineOne', p.street) + el('ram:CityName', p.city) + el('ram:CountryID', p.country));
}
// electronic address (BT-34 / BT-49): an email address, scheme "EM"
const electronicAddress = (v, scheme = 'EM') => (has(v) ? wrap('ram:URIUniversalCommunication', el('ram:URIID', v, ` schemeID="${scheme}"`)) : '');

function tradeTax(category, rate) {
  return '<ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode>' + el('ram:CategoryCode', category) + (category === 'O' ? '' : el('ram:RateApplicablePercent', str(D(rate) ?? D('0')))) + '</ram:ApplicableTradeTax>';
}

export function generateCII(inv) {
  const T = computeTotals(inv);
  const cur = inv.currency || 'EUR';
  const fr = inv.country === 'FR'; const frc = fr ? cfg('FR') : null;
  const xr = !fr && inv.profile === 'xrechnung';
  const s = inv.seller, b = inv.buyer, pay = inv.payment;
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += '<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">';

  // --- context: which specification this invoice follows (BT-23, BT-24)
  x += '<rsm:ExchangedDocumentContext>';
  if (xr) x += `<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${PEPPOL_PROCESS}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>`;
  // France: the billing framework (cadre de facturation, BT-23) says whether goods or services are invoiced
  if (fr) x += `<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>${esc((inv.fr && inv.fr.cadre) || 'S1')}</ram:ID></ram:BusinessProcessSpecifiedDocumentContextParameter>`;
  x += `<ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${xr ? SPEC.xrechnung : SPEC.en16931}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>`;
  x += '</rsm:ExchangedDocumentContext>';

  // --- document header (BT-1, BT-3, BT-2, BT-22)
  x += '<rsm:ExchangedDocument>' + el('ram:ID', inv.number) + el('ram:TypeCode', inv.typeCode || '380') + date('ram:IssueDateTime', inv.issueDate);
  if (has(inv.note)) x += wrap('ram:IncludedNote', el('ram:Content', inv.note));
  if (fr) { // three legal mentions every French invoice must carry, each as a coded note
    const f = inv.fr || {};
    for (const [code, text] of [['PMT', f.pmt], ['PMD', f.pmd], ['AAB', f.aab]]) x += wrap('ram:IncludedNote', el('ram:Content', has(text) ? text : frc.notes[code]) + el('ram:SubjectCode', code));
  }
  x += '</rsm:ExchangedDocument>';

  x += '<rsm:SupplyChainTradeTransaction>';
  // --- lines (BG-25)
  T.lines.forEach((l, i) => {
    x += '<ram:IncludedSupplyChainTradeLineItem>';
    x += wrap('ram:AssociatedDocumentLineDocument', el('ram:LineID', has(l.id) ? l.id : String(i + 1)));
    x += wrap('ram:SpecifiedTradeProduct', el('ram:SellerAssignedID', l.itemId) + el('ram:Name', l.name) + el('ram:Description', l.description));
    x += wrap('ram:SpecifiedLineTradeAgreement', wrap('ram:NetPriceProductTradePrice', el('ram:ChargeAmount', D(l.unitPrice) ? str(D(l.unitPrice)) : '')));
    x += wrap('ram:SpecifiedLineTradeDelivery', el('ram:BilledQuantity', D(l.quantity) ? str(D(l.quantity)) : '', ` unitCode="${esc(l.unit || 'C62')}"`));
    x += '<ram:SpecifiedLineTradeSettlement>' + tradeTax(l.vatCategory, l.vatRate);
    x += wrap('ram:SpecifiedTradeSettlementLineMonetarySummation', el('ram:LineTotalAmount', l.net ? fmt2(l.net) : ''));
    x += '</ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>';
  });

  // --- parties and references (BG-4, BG-7)
  x += '<ram:ApplicableHeaderTradeAgreement>' + el('ram:BuyerReference', inv.buyerReference);
  const digits = v => String(v || '').replace(/\s/g, '');
  x += '<ram:SellerTradeParty>' + el('ram:ID', s.id) + (fr && has(s.siteId) ? el('ram:GlobalID', digits(s.siteId), ' schemeID="0009"') : '') + el('ram:Name', s.name) + el('ram:Description', s.legalInfo);
  if (fr) { if (has(s.nationalId)) x += wrap('ram:SpecifiedLegalOrganization', el('ram:ID', digits(s.nationalId), ' schemeID="0002"')); }
  else if (has(s.legalRegistration)) x += wrap('ram:SpecifiedLegalOrganization', el('ram:ID', s.legalRegistration));
  const contact = el('ram:PersonName', s.contactName)
    + (has(s.contactPhone) ? wrap('ram:TelephoneUniversalCommunication', el('ram:CompleteNumber', s.contactPhone)) : '')
    + (has(s.contactEmail) ? wrap('ram:EmailURIUniversalCommunication', el('ram:URIID', s.contactEmail)) : '');
  x += wrap('ram:DefinedTradeContact', contact);
  x += address(s) + (fr ? electronicAddress(has(s.email) ? s.email : digits(s.nationalId), '0225') : electronicAddress(has(s.email) ? s.email : (xr ? s.contactEmail : '')));
  if (has(s.vatId)) x += wrap('ram:SpecifiedTaxRegistration', el('ram:ID', s.vatId.replace(/\s/g, ''), ' schemeID="VA"'));
  if (has(s.taxNumber)) x += wrap('ram:SpecifiedTaxRegistration', el('ram:ID', s.taxNumber, ' schemeID="FC"'));
  x += '</ram:SellerTradeParty>';
  x += '<ram:BuyerTradeParty>' + el('ram:ID', b.id) + (fr && has(b.siteId) ? el('ram:GlobalID', digits(b.siteId), ' schemeID="0009"') : '') + el('ram:Name', b.name)
    + (fr && has(b.nationalId) ? wrap('ram:SpecifiedLegalOrganization', el('ram:ID', digits(b.nationalId), ' schemeID="0002"')) : '')
    + address(b) + (fr ? electronicAddress(has(b.email) ? b.email : digits(b.nationalId), '0225') : electronicAddress(b.email));
  if (has(b.vatId)) x += wrap('ram:SpecifiedTaxRegistration', el('ram:ID', b.vatId.replace(/\s/g, ''), ' schemeID="VA"'));
  x += '</ram:BuyerTradeParty>';
  if (has(inv.orderReference)) x += wrap('ram:BuyerOrderReferencedDocument', el('ram:IssuerAssignedID', inv.orderReference));
  if (has(inv.contractReference)) x += wrap('ram:ContractReferencedDocument', el('ram:IssuerAssignedID', inv.contractReference));
  x += '</ram:ApplicableHeaderTradeAgreement>';

  // --- delivery (BT-72)
  x += '<ram:ApplicableHeaderTradeDelivery>';
  // an intra-EU supply (category K) must state the country the goods are delivered to (BT-80): the buyer's address
  if (T.lines.some(l => l.vatCategory === 'K')) x += wrap('ram:ShipToTradeParty', address(b));
  if (d102(inv.deliveryDate)) x += wrap('ram:ActualDeliverySupplyChainEvent', date('ram:OccurrenceDateTime', inv.deliveryDate));
  x += '</ram:ApplicableHeaderTradeDelivery>';

  // --- settlement: payment, VAT breakdown, totals
  x += '<ram:ApplicableHeaderTradeSettlement>';
  const directDebit = pay.meansCode === '59';
  if (directDebit) x += el('ram:CreditorReferenceID', pay.creditorId);
  x += el('ram:PaymentReference', pay.remittance) + el('ram:InvoiceCurrencyCode', cur);
  x += '<ram:SpecifiedTradeSettlementPaymentMeans>' + el('ram:TypeCode', pay.meansCode || '58');
  if (directDebit) x += has(pay.debtorIban) ? wrap('ram:PayerPartyDebtorFinancialAccount', el('ram:IBANID', pay.debtorIban.replace(/\s/g, ''))) : '';
  else if (has(pay.iban)) {
    x += wrap('ram:PayeePartyCreditorFinancialAccount', el('ram:IBANID', pay.iban.replace(/\s/g, '')) + el('ram:AccountName', pay.accountName));
    if (has(pay.bic)) x += wrap('ram:PayeeSpecifiedCreditorFinancialInstitution', el('ram:BICID', pay.bic.replace(/\s/g, '')));
  }
  x += '</ram:SpecifiedTradeSettlementPaymentMeans>';
  for (const g of T.breakdown) {
    const ex = exemptionFor(inv, g.category);
    x += '<ram:ApplicableTradeTax>' + el('ram:CalculatedAmount', fmt2(g.tax)) + '<ram:TypeCode>VAT</ram:TypeCode>'
      + (ex ? el('ram:ExemptionReason', ex.reason) : '') + el('ram:BasisAmount', fmt2(g.basis)) + el('ram:CategoryCode', g.category)
      + (ex && ex.code ? el('ram:ExemptionReasonCode', ex.code) : '')
      + (g.category === 'O' ? '' : el('ram:RateApplicablePercent', g.rate)) + '</ram:ApplicableTradeTax>';
  }
  if (d102(inv.periodStart) || d102(inv.periodEnd)) x += wrap('ram:BillingSpecifiedPeriod', date('ram:StartDateTime', inv.periodStart) + date('ram:EndDateTime', inv.periodEnd));
  for (const a of T.allowances) {
    if (!a.amt) continue;
    x += '<ram:SpecifiedTradeAllowanceCharge>' + `<ram:ChargeIndicator><udt:Indicator>${a.charge ? 'true' : 'false'}</udt:Indicator></ram:ChargeIndicator>`
      + el('ram:ActualAmount', fmt2(a.amt)) + el('ram:Reason', has(a.reason) ? a.reason : (a.charge ? 'Zuschlag' : 'Rabatt'))
      + '<ram:CategoryTradeTax><ram:TypeCode>VAT</ram:TypeCode>' + el('ram:CategoryCode', a.vatCategory) + (a.vatCategory === 'O' ? '' : el('ram:RateApplicablePercent', str(D(a.vatRate) ?? D('0')))) + '</ram:CategoryTradeTax>'
      + '</ram:SpecifiedTradeAllowanceCharge>';
  }
  const terms = el('ram:Description', inv.paymentTerms) + date('ram:DueDateDateTime', inv.dueDate) + (directDebit ? el('ram:DirectDebitMandateID', pay.mandateId) : '');
  x += wrap('ram:SpecifiedTradePaymentTerms', terms);
  x += '<ram:SpecifiedTradeSettlementHeaderMonetarySummation>' + el('ram:LineTotalAmount', fmt2(T.lineTotal))
    + (isZero(T.chargeTotal) ? '' : el('ram:ChargeTotalAmount', fmt2(T.chargeTotal)))
    + (isZero(T.allowanceTotal) ? '' : el('ram:AllowanceTotalAmount', fmt2(T.allowanceTotal)))
    + el('ram:TaxBasisTotalAmount', fmt2(T.taxBasis)) + el('ram:TaxTotalAmount', fmt2(T.taxTotal), ` currencyID="${esc(cur)}"`)
    + el('ram:GrandTotalAmount', fmt2(T.grandTotal)) + (T.prepaid ? el('ram:TotalPrepaidAmount', fmt2(T.prepaid)) : '')
    + el('ram:DuePayableAmount', fmt2(T.due)) + '</ram:SpecifiedTradeSettlementHeaderMonetarySummation>';
  if (has(inv.precedingNumber)) x += wrap('ram:InvoiceReferencedDocument', el('ram:IssuerAssignedID', inv.precedingNumber) + date('ram:FormattedIssueDateTime', inv.precedingDate, 'qdt'));
  x += '</ram:ApplicableHeaderTradeSettlement>';
  x += '</rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>';
  return x;
}

// Human-friendly indentation (does not change content): used for the copy/preview view only.
export function prettyXml(xml) {
  let out = '', depth = 0;
  const tokens = xml.replace(/>\s*</g, '>\n<').split('\n');
  for (const tok of tokens) {
    if (/^<\//.test(tok)) depth = Math.max(0, depth - 1);
    out += '  '.repeat(depth) + tok + '\n';
    if (/^<[^!?/][^>]*[^/]>$/.test(tok) && !/<\/[^>]+>$/.test(tok)) depth++;
  }
  return out;
}
