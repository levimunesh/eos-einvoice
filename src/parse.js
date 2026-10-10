// Read an e-invoice (CII or UBL syntax) into a plain object for display, and classify its format.
import { emptyInvoice, emptyLine } from './model.js';

// ---------- small namespace-agnostic DOM helpers (work in browsers and in slimdom)
const kids = (el, name) => { const out = []; if (!el) return out; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || n.localName === name)) out.push(n); return out; };
const kid = (el, name) => { if (!el) return null; for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && n.localName === name) return n; return null; };
const path = (el, p) => { let cur = el; for (const seg of p.split('/')) { cur = kid(cur, seg); if (!cur) return null; } return cur; };
const all = (el, p) => { const segs = p.split('/'); let cur = [el]; for (const seg of segs) cur = cur.flatMap(c => kids(c, seg)); return cur; };
const txt = (el, p) => { const n = p ? path(el, p) : el; return n ? (n.textContent || '').trim() : ''; };
const attr = (el, name) => (el && el.getAttribute(name)) || '';

// dates: CII uses format 102 (YYYYMMDD); UBL uses ISO dates
function ciiDate(el) { // el contains udt:DateTimeString or qdt:DateTimeString
  const s = txt(kid(el, 'DateTimeString')); const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}
const ublDate = s => (s || '').slice(0, 10);

export function classify(doc) {
  const root = doc.documentElement;
  const ln = root.localName, ns = root.namespaceURI || '';
  if (ln === 'CrossIndustryInvoice' && ns.includes('CrossIndustryInvoice:100')) return { syntax: 'CII', kind: 'Invoice' };
  if (ln === 'Invoice' && ns.includes('ubl:schema:xsd:Invoice-2')) return { syntax: 'UBL', kind: 'Invoice' };
  if (ln === 'CreditNote' && ns.includes('ubl:schema:xsd:CreditNote-2')) return { syntax: 'UBL', kind: 'CreditNote' };
  if (ln === 'CrossIndustryDocument') return { syntax: 'ZUGFeRD1', kind: 'Invoice' };
  return { syntax: null, kind: null, rootName: ln };
}

// What the specification identifier (BT-24) says about the format, and whether Germany accepts it as an e-invoice.
export function describeSpec(specId, syntax) {
  const s = (specId || '').trim(); const low = s.toLowerCase();
  if (syntax === 'ZUGFeRD1') return { key: 'zugferd1', label: 'ZUGFeRD 1.0', accepted: false, why: 'ZUGFeRD 1.0 does not follow the European standard EN 16931. An e-invoice needs ZUGFeRD 2.0.1 / Factur-X 1.0 or later.' };
  if (/:(minimum)$/.test(low)) return { key: 'minimum', label: 'ZUGFeRD / Factur-X MINIMUM', accepted: false, why: 'The MINIMUM profile leaves out the invoice lines and other mandatory data, so it does not count as an e-invoice.' };
  if (/:(basicwl)$/.test(low)) return { key: 'basicwl', label: 'ZUGFeRD / Factur-X BASIC WL', accepted: false, why: 'The BASIC WL profile has no invoice lines, so it is not a full e-invoice under EN 16931. Germany does not accept it; France tolerates it only for a transition period.' };
  if (low.startsWith('urn:peppol:pint:billing-1@aunz')) return { key: 'pint-aunz', label: 'Peppol PINT A-NZ', accepted: true };
  if (low.startsWith('urn:peppol:pint:')) return { key: 'pint', label: 'Peppol PINT', accepted: true };
  if (low.includes('xrechnung')) {
    const v = /xrechnung_(\d+\.\d+)/.exec(low)?.[1] || '';
    if (low.includes('extension:xrechnung')) return { key: 'xrechnung-extension', label: `XRechnung ${v} Extension`, accepted: true, xrechnung: true, version: v };
    if (low.includes('xrechnung:cvd')) return { key: 'xrechnung-cvd', label: `XRechnung ${v} CVD`, accepted: true, xrechnung: true, version: v };
    return { key: 'xrechnung', label: `XRechnung ${v}`, accepted: true, xrechnung: true, version: v };
  }
  if (low.includes(':extended')) return { key: 'extended', label: 'ZUGFeRD / Factur-X EXTENDED', accepted: true };
  if (/:basic$/.test(low)) return { key: 'basic', label: 'ZUGFeRD / Factur-X BASIC', accepted: true };
  if (low.includes('peppol.eu:2017:poacc:billing:3.0')) return { key: 'peppol', label: 'Peppol BIS Billing 3.0', accepted: true };
  if (low === 'urn:cen.eu:en16931:2017') return { key: 'en16931', label: syntax === 'CII' ? 'EN 16931 (ZUGFeRD / Factur-X EN 16931 profile)' : 'EN 16931', accepted: true };
  if (low.startsWith('urn:cen.eu:en16931:2017')) return { key: 'cius', label: 'EN 16931 with a national or industry extension', accepted: true };
  return { key: 'unknown', label: s ? 'Unrecognised specification' : 'No specification identifier', accepted: null, why: 'The file does not say which invoice standard it follows (BT-24).' };
}

function ciiParty(p) {
  if (!p) return null;
  const a = kid(p, 'PostalTradeAddress'); const c = kid(p, 'DefinedTradeContact');
  const reg = all(p, 'SpecifiedTaxRegistration/ID');
  const uri = path(p, 'URIUniversalCommunication/URIID');
  return {
    name: txt(p, 'Name'), tradingName: txt(p, 'SpecifiedLegalOrganization/TradingBusinessName'),
    ids: [...kids(p, 'ID').map(n => txt(n)), ...kids(p, 'GlobalID').map(n => txt(n))].filter(Boolean),
    legalRegistration: txt(p, 'SpecifiedLegalOrganization/ID'), legalInfo: txt(p, 'Description'),
    vatId: txt(reg.find(n => attr(n, 'schemeID') === 'VA')), taxNumber: txt(reg.find(n => attr(n, 'schemeID') === 'FC')),
    address: a ? { street: txt(a, 'LineOne'), line2: txt(a, 'LineTwo'), line3: txt(a, 'LineThree'), postcode: txt(a, 'PostcodeCode'), city: txt(a, 'CityName'), subdivision: txt(a, 'CountrySubDivisionName'), country: txt(a, 'CountryID') } : null,
    email: txt(uri), emailScheme: attr(uri, 'schemeID'),
    contact: c ? { name: txt(c, 'PersonName') || txt(c, 'DepartmentName'), phone: txt(c, 'TelephoneUniversalCommunication/CompleteNumber'), email: txt(c, 'EmailURIUniversalCommunication/URIID') } : null,
  };
}
function ciiAllowance(n) {
  return { charge: txt(n, 'ChargeIndicator/Indicator') === 'true', amount: txt(n, 'ActualAmount'), base: txt(n, 'BasisAmount'), percent: txt(n, 'CalculationPercent'), reason: txt(n, 'Reason'), reasonCode: txt(n, 'ReasonCode'), vatCategory: txt(n, 'CategoryTradeTax/CategoryCode'), vatRate: txt(n, 'CategoryTradeTax/RateApplicablePercent') };
}

function parseCII(root) {
  const ctx = kid(root, 'ExchangedDocumentContext'), hd = kid(root, 'ExchangedDocument'), tx = kid(root, 'SupplyChainTradeTransaction');
  const ag = kid(tx, 'ApplicableHeaderTradeAgreement'), dl = kid(tx, 'ApplicableHeaderTradeDelivery'), st = kid(tx, 'ApplicableHeaderTradeSettlement');
  const sum = kid(st, 'SpecifiedTradeSettlementHeaderMonetarySummation');
  const terms = kids(st, 'SpecifiedTradePaymentTerms');
  const means = kids(st, 'SpecifiedTradeSettlementPaymentMeans');
  const cur = txt(st, 'InvoiceCurrencyCode');
  const taxTotals = kids(sum, 'TaxTotalAmount');
  const d = {
    specId: txt(ctx, 'GuidelineSpecifiedDocumentContextParameter/ID'), businessProcess: txt(ctx, 'BusinessProcessSpecifiedDocumentContextParameter/ID'),
    number: txt(hd, 'ID'), typeCode: txt(hd, 'TypeCode'), issueDate: ciiDate(kid(hd, 'IssueDateTime')),
    notes: kids(hd, 'IncludedNote').filter(n => !txt(n, 'SubjectCode')).map(n => kids(n, 'Content').map(c => txt(c)).join('\n')).filter(Boolean),
    codedNotes: kids(hd, 'IncludedNote').filter(n => txt(n, 'SubjectCode')).map(n => ({ code: txt(n, 'SubjectCode'), text: kids(n, 'Content').map(c => txt(c)).join('\n') })),
    currency: cur, taxCurrency: txt(st, 'TaxCurrencyCode'),
    buyerReference: txt(ag, 'BuyerReference'), orderReference: txt(ag, 'BuyerOrderReferencedDocument/IssuerAssignedID'), salesOrderReference: txt(ag, 'SellerOrderReferencedDocument/IssuerAssignedID'),
    contractReference: txt(ag, 'ContractReferencedDocument/IssuerAssignedID'), projectReference: txt(ag, 'SpecifiedProcuringProject/ID'),
    despatchReference: txt(dl, 'DespatchAdviceReferencedDocument/IssuerAssignedID'), receivingReference: txt(dl, 'ReceivingAdviceReferencedDocument/IssuerAssignedID'),
    precedingInvoices: kids(st, 'InvoiceReferencedDocument').map(n => ({ number: txt(n, 'IssuerAssignedID'), date: ciiDate(kid(n, 'FormattedIssueDateTime')) })),
    deliveryDate: ciiDate(path(dl, 'ActualDeliverySupplyChainEvent/OccurrenceDateTime')),
    periodStart: ciiDate(path(st, 'BillingSpecifiedPeriod/StartDateTime')), periodEnd: ciiDate(path(st, 'BillingSpecifiedPeriod/EndDateTime')),
    seller: ciiParty(kid(ag, 'SellerTradeParty')), buyer: ciiParty(kid(ag, 'BuyerTradeParty')),
    taxRepresentative: ciiParty(kid(ag, 'SellerTaxRepresentativeTradeParty')), payee: ciiParty(kid(st, 'PayeeTradeParty')), deliverTo: ciiParty(kid(dl, 'ShipToTradeParty')),
    payment: {
      meansCode: txt(means[0], 'TypeCode'), meansText: txt(means[0], 'Information'), remittance: txt(st, 'PaymentReference'),
      accounts: means.map(m => ({ iban: txt(m, 'PayeePartyCreditorFinancialAccount/IBANID') || txt(m, 'PayeePartyCreditorFinancialAccount/ProprietaryID'), accountName: txt(m, 'PayeePartyCreditorFinancialAccount/AccountName'), bic: txt(m, 'PayeeSpecifiedCreditorFinancialInstitution/BICID') })).filter(a => a.iban),
      card: txt(means[0], 'ApplicableTradeSettlementFinancialCard/ID'),
      mandateId: terms.map(t => txt(t, 'DirectDebitMandateID')).find(Boolean) || '', creditorId: txt(st, 'CreditorReferenceID'), debtorIban: means.map(m => txt(m, 'PayerPartyDebtorFinancialAccount/IBANID')).find(Boolean) || '',
      terms: terms.map(t => txt(t, 'Description')).filter(Boolean).join('\n'),
    },
    dueDate: terms.map(t => ciiDate(kid(t, 'DueDateDateTime'))).find(Boolean) || '',
    allowances: kids(st, 'SpecifiedTradeAllowanceCharge').map(ciiAllowance),
    breakdown: kids(st, 'ApplicableTradeTax').map(n => ({ category: txt(n, 'CategoryCode'), rate: txt(n, 'RateApplicablePercent'), basis: txt(n, 'BasisAmount'), tax: txt(n, 'CalculatedAmount'), exemptionReason: txt(n, 'ExemptionReason'), exemptionCode: txt(n, 'ExemptionReasonCode') })),
    totals: {
      lineTotal: txt(sum, 'LineTotalAmount'), allowanceTotal: txt(sum, 'AllowanceTotalAmount'), chargeTotal: txt(sum, 'ChargeTotalAmount'), taxBasis: txt(sum, 'TaxBasisTotalAmount'),
      taxTotal: txt(taxTotals.find(n => !attr(n, 'currencyID') || attr(n, 'currencyID') === cur) || taxTotals[0]), grandTotal: txt(sum, 'GrandTotalAmount'), prepaid: txt(sum, 'TotalPrepaidAmount'), rounding: txt(sum, 'RoundingAmount'), due: txt(sum, 'DuePayableAmount'),
    },
    attachments: kids(ag, 'AdditionalReferencedDocument').map(n => { const bin = kid(n, 'AttachmentBinaryObject'); return { id: txt(n, 'IssuerAssignedID'), typeCode: txt(n, 'TypeCode'), description: txt(n, 'Name'), uri: txt(n, 'URIID'), filename: attr(bin, 'filename'), mime: attr(bin, 'mimeCode'), base64: bin ? txt(bin).replace(/\s+/g, '') : '' }; }),
    lines: kids(tx, 'IncludedSupplyChainTradeLineItem').map(li => {
      const pr = kid(li, 'SpecifiedTradeProduct'), la = kid(li, 'SpecifiedLineTradeAgreement'), ld = kid(li, 'SpecifiedLineTradeDelivery'), ls = kid(li, 'SpecifiedLineTradeSettlement');
      const q = kid(ld, 'BilledQuantity');
      return {
        id: txt(li, 'AssociatedDocumentLineDocument/LineID'), note: txt(li, 'AssociatedDocumentLineDocument/IncludedNote/Content'),
        name: txt(pr, 'Name'), description: txt(pr, 'Description'), sellerItemId: txt(pr, 'SellerAssignedID'), buyerItemId: txt(pr, 'BuyerAssignedID'), standardItemId: txt(pr, 'GlobalID'),
        attributes: kids(pr, 'ApplicableProductCharacteristic').map(c => ({ name: txt(c, 'Description'), value: txt(c, 'Value') })),
        quantity: txt(q), unit: attr(q, 'unitCode'), unitPrice: txt(la, 'NetPriceProductTradePrice/ChargeAmount'), baseQuantity: txt(la, 'NetPriceProductTradePrice/BasisQuantity'),
        grossPrice: txt(la, 'GrossPriceProductTradePrice/ChargeAmount'), netAmount: txt(ls, 'SpecifiedTradeSettlementLineMonetarySummation/LineTotalAmount'),
        vatCategory: txt(ls, 'ApplicableTradeTax/CategoryCode'), vatRate: txt(ls, 'ApplicableTradeTax/RateApplicablePercent'),
        periodStart: ciiDate(path(ls, 'BillingSpecifiedPeriod/StartDateTime')), periodEnd: ciiDate(path(ls, 'BillingSpecifiedPeriod/EndDateTime')),
        allowances: kids(ls, 'SpecifiedTradeAllowanceCharge').map(ciiAllowance), orderLineRef: txt(la, 'BuyerOrderReferencedDocument/LineID'),
      };
    }),
  };
  return d;
}

function ublParty(p) {
  if (!p) return null;
  const a = kid(p, 'PostalAddress'); const c = kid(p, 'Contact'); const le = kid(p, 'PartyLegalEntity');
  const ts = kids(p, 'PartyTaxScheme'); const ep = kid(p, 'EndpointID');
  const sch = n => txt(n, 'TaxScheme/ID').toUpperCase();
  const isVat = n => ['VAT', 'GST', 'GST/HST', 'HST'].includes(sch(n));
  const main = ts.find(isVat);
  return {
    name: txt(le, 'RegistrationName') || txt(p, 'PartyName/Name'), tradingName: txt(p, 'PartyName/Name'),
    ids: all(p, 'PartyIdentification/ID').map(n => txt(n)).filter(Boolean), sepaCreditorId: txt(all(p, 'PartyIdentification/ID').find(n => attr(n, 'schemeID') === 'SEPA')),
    legalRegistration: txt(le, 'CompanyID'), legalInfo: txt(le, 'CompanyLegalForm'),
    vatId: txt(main, 'CompanyID'), taxScheme: main ? sch(main) : '', taxNumber: txt(ts.find(n => !isVat(n) && sch(n) !== 'PST'), 'CompanyID'), taxNumberScheme: sch(ts.find(n => !isVat(n) && sch(n) !== 'PST') || null) || '', pstNumber: txt(ts.find(n => sch(n) === 'PST'), 'CompanyID'),
    address: a ? { street: txt(a, 'StreetName'), line2: txt(a, 'AdditionalStreetName'), line3: txt(a, 'AddressLine/Line'), postcode: txt(a, 'PostalZone'), city: txt(a, 'CityName'), subdivision: txt(a, 'CountrySubentity'), country: txt(a, 'Country/IdentificationCode') } : null,
    email: txt(ep), emailScheme: attr(ep, 'schemeID'),
    contact: c ? { name: txt(c, 'Name'), phone: txt(c, 'Telephone'), email: txt(c, 'ElectronicMail') } : null,
  };
}
function ublAllowance(n) {
  return { charge: txt(n, 'ChargeIndicator') === 'true', amount: txt(n, 'Amount'), base: txt(n, 'BaseAmount'), percent: txt(n, 'MultiplierFactorNumeric'), reason: txt(n, 'AllowanceChargeReason'), reasonCode: txt(n, 'AllowanceChargeReasonCode'), vatCategory: txt(n, 'TaxCategory/ID'), vatRate: txt(n, 'TaxCategory/Percent') };
}

function parseUBL(root, kind) {
  const credit = kind === 'CreditNote';
  const cur = txt(root, 'DocumentCurrencyCode');
  const means = kids(root, 'PaymentMeans'); const lmt = kid(root, 'LegalMonetaryTotal');
  const taxTotals = kids(root, 'TaxTotal');
  const mainTax = taxTotals.find(t => kids(t, 'TaxSubtotal').length) || taxTotals[0];
  const sup = path(root, 'AccountingSupplierParty/Party'); const dlv = kid(root, 'Delivery');
  const seller = ublParty(sup);
  const dparty = dlv ? { name: txt(dlv, 'DeliveryParty/PartyName/Name'), address: (() => { const a = path(dlv, 'DeliveryLocation/Address'); return a ? { street: txt(a, 'StreetName'), line2: txt(a, 'AdditionalStreetName'), line3: txt(a, 'AddressLine/Line'), postcode: txt(a, 'PostalZone'), city: txt(a, 'CityName'), subdivision: txt(a, 'CountrySubentity'), country: txt(a, 'Country/IdentificationCode') } : null; })() } : null;
  return {
    specId: txt(root, 'CustomizationID'), businessProcess: txt(root, 'ProfileID'),
    number: txt(root, 'ID'), typeCode: txt(root, credit ? 'CreditNoteTypeCode' : 'InvoiceTypeCode'), issueDate: ublDate(txt(root, 'IssueDate')),
    dueDate: ublDate(txt(root, 'DueDate') || means.map(m => txt(m, 'PaymentDueDate')).find(Boolean) || ''),
    notes: kids(root, 'Note').map(n => txt(n)).filter(Boolean), currency: cur, taxCurrency: txt(root, 'TaxCurrencyCode'),
    buyerReference: txt(root, 'BuyerReference'), orderReference: txt(root, 'OrderReference/ID'), salesOrderReference: txt(root, 'OrderReference/SalesOrderID'),
    contractReference: txt(root, 'ContractDocumentReference/ID'), projectReference: txt(root, 'ProjectReference/ID'),
    despatchReference: txt(root, 'DespatchDocumentReference/ID'), receivingReference: txt(root, 'ReceiptDocumentReference/ID'),
    precedingInvoices: all(root, 'BillingReference/InvoiceDocumentReference').map(n => ({ number: txt(n, 'ID'), date: ublDate(txt(n, 'IssueDate')) })),
    deliveryDate: ublDate(txt(dlv, 'ActualDeliveryDate')), periodStart: ublDate(txt(root, 'InvoicePeriod/StartDate')), periodEnd: ublDate(txt(root, 'InvoicePeriod/EndDate')),
    seller, buyer: ublParty(path(root, 'AccountingCustomerParty/Party')), taxRepresentative: ublParty(kid(root, 'TaxRepresentativeParty')), payee: ublParty(kid(root, 'PayeeParty')),
    deliverTo: dparty && (dparty.name || dparty.address) ? dparty : null,
    payment: {
      meansCode: txt(means[0], 'PaymentMeansCode'), meansText: attr(kid(means[0], 'PaymentMeansCode'), 'name'), remittance: txt(means[0], 'PaymentID'),
      accounts: means.map(m => ({ iban: txt(m, 'PayeeFinancialAccount/ID'), accountName: txt(m, 'PayeeFinancialAccount/Name'), bic: txt(m, 'PayeeFinancialAccount/FinancialInstitutionBranch/ID') })).filter(a => a.iban),
      card: txt(means[0], 'CardAccount/PrimaryAccountNumberID'), mandateId: means.map(m => txt(m, 'PaymentMandate/ID')).find(Boolean) || '',
      creditorId: (seller && seller.sepaCreditorId) || '', debtorIban: means.map(m => txt(m, 'PaymentMandate/PayerFinancialAccount/ID')).find(Boolean) || '',
      terms: kids(root, 'PaymentTerms').map(t => txt(t, 'Note')).filter(Boolean).join('\n'),
    },
    allowances: kids(root, 'AllowanceCharge').map(ublAllowance),
    breakdown: kids(mainTax, 'TaxSubtotal').map(n => ({ scheme: txt(n, 'TaxCategory/TaxScheme/ID'), category: txt(n, 'TaxCategory/ID'), rate: txt(n, 'TaxCategory/Percent'), basis: txt(n, 'TaxableAmount'), tax: txt(n, 'TaxAmount'), exemptionReason: txt(n, 'TaxCategory/TaxExemptionReason'), exemptionCode: txt(n, 'TaxCategory/TaxExemptionReasonCode') })),
    totals: { lineTotal: txt(lmt, 'LineExtensionAmount'), allowanceTotal: txt(lmt, 'AllowanceTotalAmount'), chargeTotal: txt(lmt, 'ChargeTotalAmount'), taxBasis: txt(lmt, 'TaxExclusiveAmount'), taxTotal: txt(mainTax, 'TaxAmount'), grandTotal: txt(lmt, 'TaxInclusiveAmount'), prepaid: txt(lmt, 'PrepaidAmount'), rounding: txt(lmt, 'PayableRoundingAmount'), due: txt(lmt, 'PayableAmount') },
    attachments: kids(root, 'AdditionalDocumentReference').map(n => { const bin = path(n, 'Attachment/EmbeddedDocumentBinaryObject'); return { id: txt(n, 'ID'), typeCode: txt(n, 'DocumentTypeCode'), description: txt(n, 'DocumentDescription'), uri: txt(n, 'Attachment/ExternalReference/URI'), filename: attr(bin, 'filename'), mime: attr(bin, 'mimeCode'), base64: bin ? txt(bin).replace(/\s+/g, '') : '' }; }),
    lines: kids(root, credit ? 'CreditNoteLine' : 'InvoiceLine').map(li => {
      const it = kid(li, 'Item'), pr = kid(li, 'Price'); const q = kid(li, credit ? 'CreditedQuantity' : 'InvoicedQuantity');
      return {
        id: txt(li, 'ID'), note: txt(li, 'Note'), name: txt(it, 'Name'), description: txt(it, 'Description'),
        sellerItemId: txt(it, 'SellersItemIdentification/ID'), buyerItemId: txt(it, 'BuyersItemIdentification/ID'), standardItemId: txt(it, 'StandardItemIdentification/ID'),
        attributes: kids(it, 'AdditionalItemProperty').map(c => ({ name: txt(c, 'Name'), value: txt(c, 'Value') })),
        quantity: txt(q), unit: attr(q, 'unitCode'), unitPrice: txt(pr, 'PriceAmount'), baseQuantity: txt(pr, 'BaseQuantity'), grossPrice: txt(pr, 'AllowanceCharge/BaseAmount'),
        netAmount: txt(li, 'LineExtensionAmount'), vatCategory: txt(it, 'ClassifiedTaxCategory/ID'), vatRate: txt(it, 'ClassifiedTaxCategory/Percent'),
        taxes: kids(it, 'ClassifiedTaxCategory').map(c => ({ scheme: txt(c, 'TaxScheme/ID'), category: txt(c, 'ID'), rate: txt(c, 'Percent') })),
        periodStart: ublDate(txt(li, 'InvoicePeriod/StartDate')), periodEnd: ublDate(txt(li, 'InvoicePeriod/EndDate')),
        allowances: kids(li, 'AllowanceCharge').map(ublAllowance), orderLineRef: txt(li, 'OrderLineReference/LineID'),
        sublines: kids(li, 'SubInvoiceLine').length,
      };
    }),
  };
}

// Parse a DOM document. Returns { ok, syntax, kind, spec, data } or { ok:false, reason }.
export function parseInvoice(doc) {
  const c = classify(doc);
  if (c.syntax === 'CII') { const data = parseCII(doc.documentElement); return { ok: true, ...c, spec: describeSpec(data.specId, 'CII'), data }; }
  if (c.syntax === 'UBL') { const data = parseUBL(doc.documentElement, c.kind); return { ok: true, ...c, spec: describeSpec(data.specId, 'UBL'), data }; }
  if (c.syntax === 'ZUGFeRD1') return { ok: false, ...c, spec: describeSpec('', 'ZUGFeRD1'), reason: 'This file is in the old ZUGFeRD 1.0 format, which does not count as an e-invoice.' };
  return { ok: false, ...c, reason: `This XML is not an e-invoice we recognise (root element “${c.rootName}”). Expected a CII “CrossIndustryInvoice”, a UBL “Invoice” / “CreditNote” or a Polish KSeF “Faktura”.` };
}

// Map a parsed invoice onto the editable form model (used for "open in editor").
// country: which country's form the invoice is opened in ('DE', 'FR', 'AU'); it decides where identifiers go.
export function toFormModel(data, spec, country = 'DE') {
  const inv = emptyInvoice(); inv.country = country;
  const fr = country === 'FR', au = country === 'AU', ca = country === 'CA';
  const digits = v => String(v || '').replace(/\s/g, '');
  const p = (src, withContact) => {
    const a = (src && src.address) || {};
    const o = { name: src?.name || '', street: [a.street, a.line2, a.line3].filter(Boolean).join(', '), postcode: a.postcode || '', city: a.city || '', state: a.subdivision || '', country: a.country || country, vatId: src?.vatId || '', email: src?.email || '', nationalId: '', siteId: '' };
    const ids = src?.ids || [];
    if (fr) {
      o.nationalId = /^\d{9}$/.test(digits(src?.legalRegistration)) ? digits(src.legalRegistration) : '';
      o.siteId = ids.find(x => /^\d{14}$/.test(digits(x))) || '';
      o.id = ids.find(x => digits(x) !== digits(o.siteId)) || '';
      if (digits(o.email) === o.nationalId) o.email = ''; // the electronic address defaults to the SIREN
    } else if (au) {
      o.nationalId = digits(src?.legalRegistration) || (src?.emailScheme && src.emailScheme !== 'EM' ? digits(src.email) : '');
      o.id = ids.find(x => digits(x) !== o.nationalId) || ''; o.email = ''; o.vatId = '';
    } else if (ca) { o.id = ids[0] || ''; o.siteId = src?.pstNumber || ''; o.email = ''; }
    else o.id = ids[0] || '';
    if (withContact) Object.assign(o, { taxNumber: src?.taxNumber || '', legalRegistration: fr || au || ca ? '' : (src?.legalRegistration || ''), legalInfo: src?.legalInfo || '', contactName: src?.contact?.name || '', contactPhone: src?.contact?.phone || '', contactEmail: src?.contact?.email || '' });
    return o;
  };
  Object.assign(inv, {
    profile: spec && spec.xrechnung ? 'xrechnung' : 'en16931', typeCode: data.typeCode || '380', number: data.number, issueDate: data.issueDate, dueDate: data.dueDate, currency: data.currency || inv.currency,
    buyerReference: data.buyerReference, orderReference: data.orderReference, contractReference: data.contractReference,
    precedingNumber: data.precedingInvoices[0]?.number || '', precedingDate: data.precedingInvoices[0]?.date || '',
    deliveryDate: data.deliveryDate, periodStart: data.periodStart, periodEnd: data.periodEnd, note: data.notes.join('\n'), paymentTerms: data.payment.terms,
    seller: { ...inv.seller, ...p(data.seller, true) }, buyer: { ...inv.buyer, ...p(data.buyer, false) }, prepaid: data.totals.prepaid || '',
  });
  const acct = data.payment.accounts[0] || {};
  inv.payment = { ...inv.payment, meansCode: data.payment.meansCode || (au || ca ? '30' : '58'), iban: au || ca ? '' : (acct.iban || ''), bic: au || ca ? '' : (acct.bic || ''), account: au || ca ? (acct.iban || '') : '', bsb: au || ca ? (acct.bic || '') : '', accountName: acct.accountName || '', remittance: data.payment.remittance || '', mandateId: data.payment.mandateId || '', creditorId: data.payment.creditorId || '', debtorIban: data.payment.debtorIban || '' };
  inv.lines = data.lines.map((l, i) => ({ ...emptyLine(i + 1), id: l.id || String(i + 1), name: l.name, description: l.description, itemId: l.sellerItemId, quantity: l.quantity, unit: l.unit || 'C62', unitPrice: l.unitPrice, vatCategory: l.vatCategory || 'S', vatRate: l.vatRate || '0' }));
  if (!inv.lines.length) inv.lines = [emptyLine(1)];
  inv.allowances = data.allowances.map(a => ({ charge: a.charge, amount: a.amount, reason: a.reason, vatCategory: a.vatCategory || 'S', vatRate: a.vatRate || '0' }));
  const ex = data.breakdown.find(b => b.category === 'E');
  if (ex) inv.exemptionReason = ex.exemptionReason || '';
  const onlyExempt = data.breakdown.length > 0 && data.breakdown.every(b => b.category === 'E');
  if (ex && onlyExempt && (fr ? /293\s*B|franchise/i.test(ex.exemptionReason || '') || ex.exemptionCode === 'VATEX-FR-FRANCHISE' : /§\s*19|kleinunternehm/i.test(ex.exemptionReason || ''))) { inv.smallBusiness = true; if (ex.exemptionCode === 'VATEX-FR-FRANCHISE') inv.exemptionReason = ''; }
  if (fr) {
    const coded = Object.fromEntries((data.codedNotes || []).map(n => [n.code, n.text]));
    inv.fr = { cadre: /^[BSM]\d$/.test(data.businessProcess || '') ? data.businessProcess : 'S1', pmt: coded.PMT || '', pmd: coded.PMD || '', aab: coded.AAB || '' };
    if (/2$/.test(inv.fr.cadre)) inv.prepaid = '';
  }
  if (ca) { // a line with two taxes (GST + provincial) is one choice in the form: its rate is the sum
    data.lines.forEach((l, i) => { const t = (l.taxes || []).filter(x => x.category === 'S'); if (t.length > 1) inv.lines[i].vatRate = String(Math.round(t.reduce((a, x) => a + Number(x.rate || 0), 0) * 1000) / 1000); });
    data.allowances.forEach((a, i) => { const same = data.lines.findIndex(l => l.vatCategory === a.vatCategory && (l.taxes || []).some(t => t.rate === a.vatRate)); if (same >= 0 && a.vatCategory === 'S') inv.allowances[i].vatRate = inv.lines[same].vatRate; });
  }
  if (au || ca) {
    if (data.breakdown.length > 0 && data.breakdown.every(b => b.category === 'O')) { inv.smallBusiness = true; const o = data.breakdown[0]; inv.exemptionReason = o.exemptionReason || ''; for (const l of inv.lines) { l.vatCategory = 'S'; l.vatRate = ca ? '5' : '10'; } }
    if (ex) inv.exemptionReason = ex.exemptionReason || '';
  }
  return inv;
}
