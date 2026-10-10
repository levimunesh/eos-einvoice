// Sample invoices covering the VAT situations a small German business meets.
import { emptyInvoice } from '../src/model.js';
const base = () => {
  const i = emptyInvoice();
  Object.assign(i, { number: 'RE-2026-0042', issueDate: '2026-10-08', dueDate: '2026-10-22', deliveryDate: '2026-10-02', paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.', note: 'Vielen Dank für Ihren Auftrag.' });
  Object.assign(i.seller, { name: 'Tischlerei Brandt GmbH', street: 'Werkstattweg 12', postcode: '50667', city: 'Köln', country: 'DE', vatId: 'DE123456789', taxNumber: '214/5803/1234', legalRegistration: 'HRB 98765', legalInfo: 'Geschäftsführerin: Anna Brandt, Amtsgericht Köln', email: 'rechnung@tischlerei-brandt.example', contactName: 'Anna Brandt', contactPhone: '+49 221 5550142', contactEmail: 'anna@tischlerei-brandt.example' });
  Object.assign(i.buyer, { name: 'Café Morgenrot OHG', street: 'Lindenstraße 8', postcode: '53111', city: 'Bonn', country: 'DE', vatId: 'DE987654321', email: 'buchhaltung@cafe-morgenrot.example', id: 'K-1007' });
  Object.assign(i.payment, { meansCode: '58', iban: 'DE02120300000000202051', bic: 'BYLADEM1001', accountName: 'Tischlerei Brandt GmbH', remittance: 'RE-2026-0042' });
  i.lines = [
    { id: '1', name: 'Tresen aus Eiche, Maßanfertigung', description: '3,20 m, geölt, inkl. Montage', itemId: 'TR-EI-320', quantity: '1', unit: 'C62', unitPrice: '4850.00', vatCategory: 'S', vatRate: '19' },
    { id: '2', name: 'Montagestunden', description: '', itemId: '', quantity: '6.5', unit: 'HUR', unitPrice: '68.00', vatCategory: 'S', vatRate: '19' },
    { id: '3', name: 'Fachbuch Holzpflege', description: '', itemId: '', quantity: '2', unit: 'C62', unitPrice: '24.95', vatCategory: 'S', vatRate: '7' },
  ];
  return i;
};
const frBase = () => {
  const i = emptyInvoice(); i.country = 'FR';
  Object.assign(i, { number: 'F2026-0187', issueDate: '2026-10-08', dueDate: '2026-11-07', deliveryDate: '2026-10-02', paymentTerms: 'Paiement à 30 jours par virement.', note: 'Merci pour votre confiance.' });
  i.fr = { cadre: 'M1', pmt: '', pmd: '', aab: '' };
  Object.assign(i.seller, { name: 'Menuiserie Lefèvre SARL', nationalId: '123456782', siteId: '12345678200010', street: '14 rue des Tanneurs', postcode: '69005', city: 'Lyon', country: 'FR', vatId: 'FR11123456782', legalInfo: 'SARL au capital de 20 000 € – RCS Lyon 123 456 782', contactName: 'Claire Lefèvre', contactPhone: '+33 4 72 55 01 42', contactEmail: 'claire@menuiserie-lefevre.example' });
  Object.assign(i.buyer, { name: 'Boulangerie du Parc SAS', nationalId: '987654324', street: '3 place Bellecour', postcode: '69002', city: 'Lyon', country: 'FR', vatId: 'FR14987654324', id: 'C-0412' });
  Object.assign(i.payment, { meansCode: '30', iban: 'FR7630006000011234567890189', bic: 'AGRIFRPP', accountName: 'Menuiserie Lefèvre SARL', remittance: 'F2026-0187' });
  i.lines = [
    { id: '1', name: 'Comptoir en chêne sur mesure', description: '3,20 m, huilé, pose comprise', itemId: 'CPT-CH-320', quantity: '1', unit: 'C62', unitPrice: '4850.00', vatCategory: 'S', vatRate: '20' },
    { id: '2', name: 'Heures de pose', description: '', itemId: '', quantity: '6.5', unit: 'HUR', unitPrice: '68.00', vatCategory: 'S', vatRate: '20' },
    { id: '3', name: 'Guide d’entretien du bois', description: '', itemId: '', quantity: '2', unit: 'C62', unitPrice: '24.95', vatCategory: 'S', vatRate: '5.5' },
  ];
  return i;
};
const auBase = () => {
  const i = emptyInvoice(); i.country = 'AU'; i.currency = 'AUD';
  Object.assign(i, { number: 'INV-2026-0187', issueDate: '2026-10-08', dueDate: '2026-11-07', deliveryDate: '2026-10-02', paymentTerms: 'Payment within 30 days.', note: 'Thank you for your business.', buyerReference: 'PO-7731' });
  Object.assign(i.seller, { name: 'Harbour Joinery Pty Ltd', nationalId: '53 004 109 063', street: '14 Wharf Street', postcode: '2000', city: 'Sydney', state: 'NSW', country: 'AU', contactName: 'Claire Nguyen', contactPhone: '+61 2 5550 0142', contactEmail: 'claire@harbourjoinery.example' });
  Object.assign(i.buyer, { name: 'Parkside Bakery Pty Ltd', nationalId: '53 004 156 572', street: '3 Collins Street', postcode: '3000', city: 'Melbourne', state: 'VIC', country: 'AU', id: 'C-0412' });
  Object.assign(i.payment, { meansCode: '30', iban: '', bic: '', bsb: '062-000', account: '1234 5678', accountName: 'Harbour Joinery Pty Ltd', remittance: 'INV-2026-0187' });
  i.lines = [
    { id: '1', name: 'Oak counter, made to measure', description: '3.2 m, oiled, installed', itemId: 'CTR-OAK-320', quantity: '1', unit: 'C62', unitPrice: '4850.00', vatCategory: 'S', vatRate: '10' },
    { id: '2', name: 'Installation hours', description: '', itemId: '', quantity: '6.5', unit: 'HUR', unitPrice: '68.00', vatCategory: 'S', vatRate: '10' },
    { id: '3', name: 'Timber care guide', description: '', itemId: '', quantity: '2', unit: 'C62', unitPrice: '24.95', vatCategory: 'S', vatRate: '10' },
  ];
  return i;
};
export const auSamples = {
  auStandard: auBase(),
  auNotRegistered: (() => { const i = auBase(); i.smallBusiness = true; i.seller.name = 'Claire Nguyen Woodwork'; i.lines = [i.lines[1]]; return i; })(),
  auCredit: (() => { const i = auBase(); i.typeCode = '381'; i.number = 'ADJ-2026-0012'; i.precedingNumber = 'INV-2026-0187'; i.precedingDate = '2026-10-08'; i.lines = [i.lines[1]]; i.lines[0].quantity = '2'; i.dueDate = ''; return i; })(),
  auGstFree: (() => { const i = auBase(); i.lines.push({ id: '4', name: 'Fresh bread for staff event', description: '', itemId: '', quantity: '12', unit: 'C62', unitPrice: '6.50', vatCategory: 'Z', vatRate: '0' }); return i; })(),
  auDiscount: (() => { const i = auBase(); i.allowances = [{ charge: false, amount: '250.00', reason: 'Loyalty discount', vatCategory: 'S', vatRate: '10' }, { charge: true, amount: '89.90', reason: 'Freight', vatCategory: 'S', vatRate: '10' }]; i.prepaid = '2000.00'; i.periodStart = '2026-09-01'; i.periodEnd = '2026-09-30'; i.orderReference = 'B-7731'; i.contractReference = 'V-2026-11'; return i; })(),
  auExport: (() => { const i = auBase(); i.buyer = { name: 'Kauri Cafe Limited', nationalId: '9429041234563', siteId: '', street: '8 Queen Street', postcode: '1010', city: 'Auckland', state: '', country: 'NZ', vatId: '', email: 'accounts@kauricafe.example', id: '' }; i.lines = [{ id: '1', name: 'Beech shelving unit', description: '', itemId: 'SH-BE', quantity: '4', unit: 'C62', unitPrice: '312.50', vatCategory: 'G', vatRate: '0' }]; return i; })(),
  auRounding: (() => { const i = auBase(); i.lines = [
    { id: '1', name: 'Screws 4x40', description: '', itemId: '', quantity: '3', unit: 'XPK', unitPrice: '3.335', vatCategory: 'S', vatRate: '10' },
    { id: '2', name: 'Glue', description: '', itemId: '', quantity: '0.333', unit: 'LTR', unitPrice: '14.99', vatCategory: 'S', vatRate: '10' },
    { id: '3', name: 'Dowels & "plugs" <8 mm>', description: '', itemId: '', quantity: '7', unit: 'C62', unitPrice: '0.105', vatCategory: 'S', vatRate: '10' }]; return i; })(),
};
const caBase = () => {
  const i = emptyInvoice(); i.country = 'CA'; i.currency = 'CAD';
  Object.assign(i, { number: 'INV-2026-0187', issueDate: '2026-10-08', dueDate: '2026-11-07', deliveryDate: '2026-10-02', paymentTerms: 'Net 30 days.', note: 'Thank you for your business.', orderReference: 'PO-7731' });
  Object.assign(i.seller, { name: 'Lakeshore Millwork Inc.', vatId: '123456789 RT0001', street: '14 Front Street West', postcode: 'M5J 2X2', city: 'Toronto', state: 'ON', country: 'CA', contactName: 'Claire Tremblay', contactPhone: '+1 416 555 0142', contactEmail: 'claire@lakeshoremillwork.example' });
  Object.assign(i.buyer, { name: 'Parkside Bakery Ltd.', street: '3 King Street East', postcode: 'L8N 1A1', city: 'Hamilton', state: 'ON', country: 'CA', id: 'C-0412' });
  Object.assign(i.payment, { meansCode: '30', iban: '', bic: '', bsb: '00012-004', account: '1234567', accountName: 'Lakeshore Millwork Inc.', remittance: 'INV-2026-0187' });
  i.lines = [
    { id: '1', name: 'Oak counter, made to measure', description: '3.2 m, oiled, installed', itemId: 'CTR-OAK-320', quantity: '1', unit: 'C62', unitPrice: '4850.00', vatCategory: 'S', vatRate: '13' },
    { id: '2', name: 'Installation hours', description: '', itemId: '', quantity: '6.5', unit: 'HUR', unitPrice: '68.00', vatCategory: 'S', vatRate: '13' },
    { id: '3', name: 'Timber care guide', description: '', itemId: '', quantity: '2', unit: 'C62', unitPrice: '24.95', vatCategory: 'S', vatRate: '13' },
  ];
  return i;
};
export const caSamples = {
  caOntario: caBase(),
  caQuebec: (() => { const i = caBase(); Object.assign(i.seller, { name: 'Menuiserie du Lac inc.', street: '14 rue Saint-Paul', postcode: 'H2Y 1G6', city: 'Montréal', state: 'QC', taxNumber: '1234567890 TQ0001' }); Object.assign(i.buyer, { name: 'Boulangerie du Parc ltée', street: '3 rue Sainte-Catherine', postcode: 'G1R 4S9', city: 'Québec', state: 'QC' }); for (const l of i.lines) l.vatRate = '14.975'; return i; })(),
  caBC: (() => { const i = caBase(); i.seller.state = 'BC'; i.seller.siteId = 'PST-1234-5678'; i.buyer.state = 'BC'; for (const l of i.lines) l.vatRate = '12'; i.lines[1].vatRate = '5'; return i; })(),
  caSmallSupplier: (() => { const i = caBase(); i.smallBusiness = true; i.seller.vatId = ''; i.seller.name = 'Claire Tremblay Woodwork'; i.lines = [i.lines[1]]; return i; })(),
  caCredit: (() => { const i = caBase(); i.typeCode = '381'; i.number = 'CN-2026-0012'; i.precedingNumber = 'INV-2026-0187'; i.precedingDate = '2026-10-08'; i.lines = [i.lines[1]]; i.lines[0].quantity = '2'; i.dueDate = ''; return i; })(),
  caMixed: (() => { const i = caBase(); i.lines.push({ id: '4', name: 'Fresh bread for staff event', description: '', itemId: '', quantity: '12', unit: 'C62', unitPrice: '6.50', vatCategory: 'Z', vatRate: '0' }); i.allowances = [{ charge: false, amount: '250.00', reason: 'Loyalty discount', vatCategory: 'S', vatRate: '13' }, { charge: true, amount: '89.90', reason: 'Freight', vatCategory: 'S', vatRate: '13' }]; i.prepaid = '2000.00'; return i; })(),
  caExportUS: (() => { const i = caBase(); i.currency = 'USD'; i.buyer = { ...i.buyer, name: 'Lakeview Cafe LLC', street: '8 Main Street', postcode: '14202', city: 'Buffalo', state: 'NY', country: 'US' }; i.lines = [{ id: '1', name: 'Beech shelving unit', description: '', itemId: 'SH-BE', quantity: '4', unit: 'C62', unitPrice: '312.50', vatCategory: 'G', vatRate: '0' }]; return i; })(),
};
export const samples = {
  frStandard: (() => frBase())(),
  frFranchise: (() => { const i = frBase(); i.smallBusiness = true; i.seller.vatId = ''; i.seller.taxNumber = '123456782'; i.seller.name = 'Atelier Lefèvre (EI)'; i.fr.cadre = 'S1'; i.lines = [i.lines[1]]; return i; })(),
  frCredit: (() => { const i = frBase(); i.typeCode = '381'; i.number = 'AV2026-0012'; i.precedingNumber = 'F2026-0187'; i.precedingDate = '2026-10-08'; i.lines = [i.lines[1]]; i.lines[0].quantity = '2'; i.dueDate = ''; return i; })(),
  frDiscount: (() => { const i = frBase(); i.allowances = [{ charge: false, amount: '250.00', reason: 'Remise fidélité', vatCategory: 'S', vatRate: '20' }, { charge: true, amount: '89.90', reason: 'Livraison', vatCategory: 'S', vatRate: '20' }]; i.fr.cadre = 'B1'; return i; })(),
  frExportDE: (() => { const i = frBase(); i.buyer = { name: 'Café Morgenrot OHG', nationalId: '', siteId: '', street: 'Lindenstraße 8', postcode: '53111', city: 'Bonn', country: 'DE', vatId: 'DE987654321', email: 'cafe-morgenrot', id: '' }; i.lines = [{ id: '1', name: 'Étagère en hêtre', description: '', itemId: '', quantity: '4', unit: 'C62', unitPrice: '312.50', vatCategory: 'K', vatRate: '0' }]; i.fr.cadre = 'B1'; return i; })(),

  standard: (() => base())(),
  xrechnung: (() => { const i = base(); i.profile = 'xrechnung'; i.buyerReference = '04011000-12345-06'; return i; })(),
  smallBusiness: (() => { const i = base(); i.smallBusiness = true; i.seller.vatId = ''; i.seller.name = 'Brandt Holzdesign (Einzelunternehmen)'; i.seller.legalRegistration = ''; i.seller.id = i.seller.taxNumber; return i; })(),
  reverseCharge: (() => { const i = base(); i.buyer = { name: 'Bakkerij De Molen B.V.', street: 'Molenweg 4', postcode: '6211 AB', city: 'Maastricht', country: 'NL', vatId: 'NL123456789B01', email: 'admin@demolen.example', id: '' }; i.lines = [{ id: '1', name: 'Planungsleistung Ladenbau', description: '', itemId: '', quantity: '12', unit: 'HUR', unitPrice: '95.00', vatCategory: 'AE', vatRate: '0' }]; return i; })(),
  intraEU: (() => { const i = base(); i.buyer = { name: 'Bakkerij De Molen B.V.', street: 'Molenweg 4', postcode: '6211 AB', city: 'Maastricht', country: 'NL', vatId: 'NL123456789B01', email: 'admin@demolen.example', id: '' }; i.lines = [{ id: '1', name: 'Regalsystem Buche', description: '', itemId: 'RG-BU', quantity: '4', unit: 'C62', unitPrice: '312.50', vatCategory: 'K', vatRate: '0' }]; return i; })(),
  exportG: (() => { const i = base(); i.buyer = { name: 'Alpenblick Hotel AG', street: 'Seestrasse 20', postcode: '8002', city: 'Zürich', country: 'CH', vatId: '', email: 'einkauf@alpenblick.example', id: '' }; i.lines = [{ id: '1', name: 'Empfangstheke Nussbaum', description: '', itemId: '', quantity: '1', unit: 'C62', unitPrice: '7400', vatCategory: 'G', vatRate: '0' }]; return i; })(),
  creditNote: (() => { const i = base(); i.typeCode = '381'; i.number = 'GS-2026-0007'; i.precedingNumber = 'RE-2026-0042'; i.precedingDate = '2026-10-08'; i.lines = [i.lines[1]]; i.lines[0].quantity = '2'; i.dueDate = ''; i.paymentTerms = 'Der Betrag wird Ihnen gutgeschrieben.'; return i; })(),
  allowancesPrepaid: (() => { const i = base(); i.allowances = [{ charge: false, amount: '250.00', reason: 'Treuerabatt', vatCategory: 'S', vatRate: '19' }, { charge: true, amount: '89.90', reason: 'Lieferung und Anfahrt', vatCategory: 'S', vatRate: '19' }]; i.prepaid = '2000.00'; i.periodStart = '2026-09-01'; i.periodEnd = '2026-09-30'; i.orderReference = 'B-7731'; i.contractReference = 'V-2026-11'; return i; })(),
  directDebit: (() => { const i = base(); i.profile = 'xrechnung'; i.buyerReference = 'K-1007'; i.payment = { meansCode: '59', iban: '', bic: '', accountName: '', remittance: 'RE-2026-0042', mandateId: 'MANDAT-2026-001', creditorId: 'DE98ZZZ09999999999', debtorIban: 'DE02500105170137075030' }; return i; })(),
  zeroRated: (() => { const i = base(); i.lines = [{ id: '1', name: 'Photovoltaikmodul 420 W', description: 'Lieferung nach § 12 Abs. 3 UStG', itemId: '', quantity: '10', unit: 'C62', unitPrice: '119.90', vatCategory: 'Z', vatRate: '0' }]; return i; })(),
  rounding: (() => { const i = base(); i.lines = [
    { id: '1', name: 'Schrauben 4x40', description: '', itemId: '', quantity: '3', unit: 'XPK', unitPrice: '3.335', vatCategory: 'S', vatRate: '19' },
    { id: '2', name: 'Leim', description: '', itemId: '', quantity: '0.333', unit: 'LTR', unitPrice: '14.99', vatCategory: 'S', vatRate: '19' },
    { id: '3', name: 'Dübel', description: '', itemId: '', quantity: '7', unit: 'C62', unitPrice: '0.105', vatCategory: 'S', vatRate: '7' }]; return i; })(),
  long: (() => { const i = base(); i.lines = Array.from({ length: 46 }, (_, k) => ({ id: String(k + 1), name: k % 5 === 0 ? 'Einbauschrank nach Aufmaß, Front Eiche furniert, Korpus weiß, inklusive Beschlägen und Griffleisten' : 'Regalboden ' + (k + 1), description: k % 7 === 0 ? 'Sonderanfertigung' : '', itemId: 'A-' + (100 + k), quantity: String(k % 4 + 1), unit: 'C62', unitPrice: (19.9 + k).toFixed(2), vatCategory: 'S', vatRate: k % 3 === 0 ? '7' : '19' })); return i; })(),
  special: (() => { const i = base(); i.seller.name = 'Müller & Söhne <Holz> "Bau" GmbH'; i.note = 'Zeile 1\nZeile 2 – „Anführung“ & Co. <ok>'; i.lines[0].name = 'Tür 2,10 m × 0,90 m – „Eiche“ & Glas'; return i; })(),
};
