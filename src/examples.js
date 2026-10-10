// Example data from made-up businesses, used to show how the tool works. Clearly labelled as examples in the interface.
import { emptyInvoice } from './model.js';
import { generateCII } from './cii.js';
import { generateUBL } from './ubl.js';
import { generateFA3 } from './fa3.js';

const day = offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const yr = () => new Date().getFullYear();
const L = (name, description, itemId, quantity, unit, unitPrice, vatRate) => ({ name, description, itemId, quantity, unit, unitPrice, vatCategory: 'S', vatRate });
const build = (country, head, seller, buyer, payment, lines, extra = {}) => {
  const i = emptyInvoice(); i.country = country;
  Object.assign(i, head, extra); Object.assign(i.seller, seller); Object.assign(i.buyer, buyer); Object.assign(i.payment, payment, { remittance: head.number });
  i.lines = lines.map((l, k) => ({ id: String(k + 1), ...l }));
  return i;
};

const OWN = {
  DE: () => build('DE', { number: `RE-${yr()}-0042`, issueDate: day(0), dueDate: day(14), deliveryDate: day(-6), currency: 'EUR', paymentTerms: 'Zahlbar innerhalb von 14 Tagen ohne Abzug.', note: 'Vielen Dank für Ihren Auftrag.' },
    { name: 'Tischlerei Brandt GmbH', street: 'Werkstattweg 12', postcode: '50667', city: 'Köln', country: 'DE', vatId: 'DE123456789', taxNumber: '214/5803/1234', legalRegistration: 'HRB 98765', legalInfo: 'Geschäftsführerin: Anna Brandt, Amtsgericht Köln', email: 'rechnung@tischlerei-brandt.example', contactName: 'Anna Brandt', contactPhone: '+49 221 5550142', contactEmail: 'anna@tischlerei-brandt.example' },
    { name: 'Café Morgenrot OHG', street: 'Lindenstraße 8', postcode: '53111', city: 'Bonn', country: 'DE', vatId: 'DE987654321', email: 'buchhaltung@cafe-morgenrot.example', id: 'K-1007' },
    { meansCode: '58', iban: 'DE02120300000000202051', bic: 'BYLADEM1001', accountName: 'Tischlerei Brandt GmbH' },
    [L('Tresen aus Eiche, Maßanfertigung', '3,20 m, geölt, inkl. Montage', 'TR-EI-320', '1', 'C62', '4850.00', '19'), L('Montagestunden', '', '', '6.5', 'HUR', '68.00', '19'), L('Fachbuch Holzpflege', '', '', '2', 'C62', '24.95', '7')]),
  FR: () => build('FR', { number: `F${yr()}-0187`, issueDate: day(0), dueDate: day(30), deliveryDate: day(-6), currency: 'EUR', paymentTerms: 'Paiement à 30 jours par virement.', note: 'Merci pour votre confiance.' },
    { name: 'Menuiserie Lefèvre SARL', nationalId: '123456782', siteId: '12345678200010', street: '14 rue des Tanneurs', postcode: '69005', city: 'Lyon', country: 'FR', vatId: 'FR11123456782', legalInfo: 'SARL au capital de 20 000 € – RCS Lyon 123 456 782', contactName: 'Claire Lefèvre', contactPhone: '+33 4 72 55 01 42', contactEmail: 'claire@menuiserie-lefevre.example' },
    { name: 'Boulangerie du Parc SAS', nationalId: '987654324', street: '3 place Bellecour', postcode: '69002', city: 'Lyon', country: 'FR', vatId: 'FR14987654324', id: 'C-0412' },
    { meansCode: '58', iban: 'FR7630006000011234567890189', bic: 'AGRIFRPP', accountName: 'Menuiserie Lefèvre SARL' },
    [L('Comptoir en chêne sur mesure', '3,20 m, huilé, pose comprise', 'CPT-CH-320', '1', 'C62', '4850.00', '20'), L('Heures de pose', '', '', '6.5', 'HUR', '68.00', '20'), L('Guide d’entretien du bois', '', '', '2', 'C62', '24.95', '5.5')], { fr: { cadre: 'M1', pmt: '', pmd: '', aab: '' } }),
  PL: () => build('PL', { number: `FV/${yr()}/10/042`, issueDate: day(0), dueDate: day(14), deliveryDate: day(-6), currency: 'PLN', paymentTerms: 'Płatność przelewem w terminie 14 dni.', note: 'Dziękujemy za zamówienie.' },
    { name: 'Stolarnia Brzoza sp. z o.o.', nationalId: '1234563218', street: 'ul. Warsztatowa 12', postcode: '00-950', city: 'Warszawa', country: 'PL', legalRegistration: '0000123456', contactName: 'Anna Brzoza', contactPhone: '+48 22 555 01 42', contactEmail: 'anna@stolarnia-brzoza.example' },
    { name: 'Kawiarnia Poranek s.c.', nationalId: '9998887778', street: 'ul. Lipowa 8', postcode: '30-001', city: 'Kraków', country: 'PL', id: 'K-1007' },
    { meansCode: '30', iban: 'PL61109010140000071219812874', bic: 'WBKPPLPP', accountName: 'Stolarnia Brzoza sp. z o.o.' },
    [L('Lada dębowa na wymiar', '3,20 m, olejowana, z montażem', 'LD-DB-320', '1', 'C62', '21500.00', '23'), L('Godziny montażu', '', '', '6.5', 'HUR', '290.00', '23'), L('Poradnik pielęgnacji drewna', '', '', '2', 'C62', '49.90', '5')]),
  AU: () => build('AU', { number: `INV-${yr()}-0187`, issueDate: day(0), dueDate: day(30), deliveryDate: day(-6), currency: 'AUD', paymentTerms: 'Payment within 30 days.', note: 'Thank you for your business.', buyerReference: 'PO-7731' },
    { name: 'Harbour Joinery Pty Ltd', nationalId: '53004109063', street: '14 Wharf Street', postcode: '2000', city: 'Sydney', state: 'NSW', country: 'AU', contactName: 'Claire Nguyen', contactPhone: '+61 2 5550 0142', contactEmail: 'claire@harbourjoinery.example' },
    { name: 'Parkside Bakery Pty Ltd', nationalId: '53004156572', street: '3 Collins Street', postcode: '3000', city: 'Melbourne', state: 'VIC', country: 'AU', id: 'C-0412' },
    { meansCode: '30', bsb: '062-000', account: '12345678', accountName: 'Harbour Joinery Pty Ltd' },
    [L('Oak counter, made to measure', '3.2 m, oiled, installed', 'CTR-OAK-320', '1', 'C62', '4850.00', '10'), L('Installation hours', '', '', '6.5', 'HUR', '68.00', '10'), L('Timber care guide', '', '', '2', 'C62', '24.95', '10')]),
  CA: () => build('CA', { number: `INV-${yr()}-0187`, issueDate: day(0), dueDate: day(30), deliveryDate: day(-6), currency: 'CAD', paymentTerms: 'Net 30 days.', note: 'Thank you for your business.', orderReference: 'PO-7731' },
    { name: 'Lakeshore Millwork Inc.', vatId: '123456789 RT0001', street: '14 Front Street West', postcode: 'M5J 2X2', city: 'Toronto', state: 'ON', country: 'CA', contactName: 'Claire Tremblay', contactPhone: '+1 416 555 0142', contactEmail: 'claire@lakeshoremillwork.example' },
    { name: 'Parkside Bakery Ltd.', street: '3 King Street East', postcode: 'L8N 1A1', city: 'Hamilton', state: 'ON', country: 'CA', id: 'C-0412' },
    { meansCode: '30', bsb: '00012-004', account: '1234567', accountName: 'Lakeshore Millwork Inc.' },
    [L('Oak counter, made to measure', '3.2 m, oiled, installed', 'CTR-OAK-320', '1', 'C62', '4850.00', '13'), L('Installation hours', '', '', '6.5', 'HUR', '68.00', '13'), L('Timber care guide', '', '', '2', 'C62', '24.95', '13')]),
};

const SUPPLIER = {
  DE: () => build('DE', { number: `${yr()}-11873`, issueDate: day(-3), dueDate: day(27), deliveryDate: day(-5), currency: 'EUR', orderReference: 'B-2291', paymentTerms: 'Zahlbar innerhalb von 30 Tagen netto.', note: 'Lieferung frei Werkstatt.' },
    { name: 'Holzgroßhandel Lindner KG', street: 'Am Sägewerk 3', postcode: '57072', city: 'Siegen', country: 'DE', vatId: 'DE811234567', taxNumber: '342/5811/0456', legalRegistration: 'HRA 4471', legalInfo: 'Persönlich haftender Gesellschafter: Jonas Lindner, Amtsgericht Siegen', email: 'faktura@lindner-holz.example', contactName: 'Buchhaltung', contactPhone: '+49 271 5550190', contactEmail: 'faktura@lindner-holz.example' },
    { name: 'Tischlerei Brandt GmbH', street: 'Werkstattweg 12', postcode: '50667', city: 'Köln', country: 'DE', vatId: 'DE123456789', email: 'rechnung@tischlerei-brandt.example', id: '40218' },
    { meansCode: '58', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', accountName: 'Holzgroßhandel Lindner KG' },
    [L('Eiche Schnittholz, besäumt, 40 mm', 'Qualität A/B, kammergetrocknet', 'EI-40-AB', '1.85', 'MTQ', '1380.00', '19'), L('Multiplexplatte Birke 18 mm, 2500 × 1250 mm', '', 'MPX-BI-18', '12', 'C62', '74.90', '19'), L('Hartwachsöl farblos, 2,5 l', '', 'HWO-25', '4', 'C62', '58.40', '19')],
    { allowances: [{ charge: true, amount: '65.00', reason: 'Fracht', vatCategory: 'S', vatRate: '19' }] }),
  FR: () => build('FR', { number: `${yr()}-11873`, issueDate: day(-3), dueDate: day(27), deliveryDate: day(-5), currency: 'EUR', orderReference: 'B-2291', paymentTerms: 'Paiement à 30 jours nets.', note: 'Livraison franco atelier.' },
    { name: 'Négoce Bois Durand SAS', nationalId: '111222337', siteId: '11122233700011', street: '3 chemin de la Scierie', postcode: '39100', city: 'Dole', country: 'FR', vatId: 'FR21111222337', legalInfo: 'SAS au capital de 150 000 € – RCS Lons-le-Saunier 111 222 337', contactName: 'Comptabilité', contactPhone: '+33 3 84 55 01 90', contactEmail: 'factures@bois-durand.example' },
    { name: 'Menuiserie Lefèvre SARL', nationalId: '123456782', street: '14 rue des Tanneurs', postcode: '69005', city: 'Lyon', country: 'FR', vatId: 'FR11123456782', id: '40218' },
    { meansCode: '58', iban: 'FR1420041010050500013M02606', bic: 'PSSTFRPPLIL', accountName: 'Négoce Bois Durand SAS' },
    [L('Chêne avivé, 40 mm', 'Qualité A/B, séché en séchoir', 'CH-40-AB', '1.85', 'MTQ', '1380.00', '20'), L('Contreplaqué bouleau 18 mm, 2500 × 1250 mm', '', 'CTP-BO-18', '12', 'C62', '74.90', '20'), L('Huile-cire incolore, 2,5 l', '', 'HC-25', '4', 'C62', '58.40', '20')],
    { fr: { cadre: 'B1', pmt: '', pmd: '', aab: '' }, allowances: [{ charge: true, amount: '65.00', reason: 'Transport', vatCategory: 'S', vatRate: '20' }] }),
  PL: () => build('PL', { number: `FS/${yr()}/11873`, issueDate: day(-3), dueDate: day(27), deliveryDate: day(-5), currency: 'PLN', orderReference: 'B-2291', paymentTerms: 'Płatność przelewem w terminie 30 dni.', note: 'Dostawa do warsztatu.' },
    { name: 'Hurtownia Drewna Lipa sp. j.', nationalId: '5554443334', street: 'ul. Tartaczna 3', postcode: '05-800', city: 'Pruszków', country: 'PL', contactPhone: '+48 22 555 01 90', contactEmail: 'faktury@hurtownia-lipa.example' },
    { name: 'Stolarnia Brzoza sp. z o.o.', nationalId: '1234563218', street: 'ul. Warsztatowa 12', postcode: '00-950', city: 'Warszawa', country: 'PL', id: '40218' },
    { meansCode: '30', iban: 'PL27114020040000300201355387', bic: 'BREXPLPW', accountName: 'Hurtownia Drewna Lipa sp. j.' },
    [L('Tarcica dębowa obrzynana, 40 mm', 'Klasa A/B, suszona komorowo', 'DB-40-AB', '1.85', 'MTQ', '6200.00', '23'), L('Sklejka brzozowa 18 mm, 2500 × 1250 mm', '', 'SKL-BR-18', '12', 'C62', '329.00', '23'), L('Olejowosk bezbarwny, 2,5 l', '', 'OW-25', '4', 'C62', '259.00', '23')]),
  AU: () => build('AU', { number: `${yr()}-11873`, issueDate: day(-3), dueDate: day(27), deliveryDate: day(-5), currency: 'AUD', orderReference: 'B-2291', paymentTerms: 'Payment within 30 days.', note: 'Delivered to your workshop.' },
    { name: 'Ridgeline Timber Supplies Pty Ltd', nationalId: '53004209017', street: '3 Sawmill Road', postcode: '2650', city: 'Wagga Wagga', state: 'NSW', country: 'AU', contactName: 'Accounts', contactPhone: '+61 2 5550 0190', contactEmail: 'accounts@ridgelinetimber.example' },
    { name: 'Harbour Joinery Pty Ltd', nationalId: '53004109063', street: '14 Wharf Street', postcode: '2000', city: 'Sydney', state: 'NSW', country: 'AU', id: '40218' },
    { meansCode: '30', bsb: '032-000', account: '87654321', accountName: 'Ridgeline Timber Supplies Pty Ltd' },
    [L('Oak boards, square-edged, 40 mm', 'Grade A/B, kiln dried', 'OAK-40-AB', '1.85', 'MTQ', '1380.00', '10'), L('Birch plywood 18 mm, 2500 × 1250 mm', '', 'PLY-BI-18', '12', 'C62', '74.90', '10'), L('Hardwax oil clear, 2.5 l', '', 'HWO-25', '4', 'C62', '58.40', '10')],
    { allowances: [{ charge: true, amount: '65.00', reason: 'Freight', vatCategory: 'S', vatRate: '10' }] }),
  CA: () => build('CA', { number: `${yr()}-11873`, issueDate: day(-3), dueDate: day(27), deliveryDate: day(-5), currency: 'CAD', orderReference: 'B-2291', paymentTerms: 'Net 30 days.', note: 'Livré à votre atelier.' },
    { name: 'Bois Laurentides inc.', vatId: '987654321 RT0001', taxNumber: '1234567890 TQ0001', street: '3 chemin de la Scierie', postcode: 'J8E 1T1', city: 'Mont-Tremblant', state: 'QC', country: 'CA', contactName: 'Comptabilité', contactPhone: '+1 819 555 0190', contactEmail: 'factures@boislaurentides.example' },
    { name: 'Lakeshore Millwork Inc.', street: '14 Front Street West', postcode: 'M5J 2X2', city: 'Toronto', state: 'ON', country: 'CA', id: '40218' },
    { meansCode: '30', bsb: '00022-006', account: '7654321', accountName: 'Bois Laurentides inc.' },
    [L('Oak boards, square-edged, 40 mm', 'Grade A/B, kiln dried', 'OAK-40-AB', '1.85', 'MTQ', '1380.00', '14.975'), L('Birch plywood 18 mm, 2500 × 1250 mm', '', 'PLY-BI-18', '12', 'C62', '74.90', '14.975'), L('Hardwax oil clear, 2.5 l', '', 'HWO-25', '4', 'C62', '58.40', '14.975')],
    { allowances: [{ charge: true, amount: '65.00', reason: 'Freight', vatCategory: 'S', vatRate: '14.975' }] }),
};

export const exampleInvoice = (country = 'DE') => (OWN[country] || OWN.DE)();
export const exampleSupplierInvoice = (country = 'DE') => (SUPPLIER[country] || SUPPLIER.DE)();
export const generateXml = inv => (inv.country === 'PL' ? generateFA3(inv) : inv.country === 'AU' || inv.country === 'CA' ? generateUBL(inv) : generateCII(inv));

// A file with the mistakes that come up most often in practice, per country.
export function faultyExampleXml(country = 'DE') {
  const i = exampleInvoice(country); const bump = v => (Number(v) + 1).toFixed(2);
  if (country === 'FR') {
    let x = generateCII(i);
    x = x.replace(/<ram:IncludedNote><ram:Content>[^<]*<\/ram:Content><ram:SubjectCode>PMT<\/ram:SubjectCode><\/ram:IncludedNote>/, '');   // legal mention missing
    x = x.replace('schemeID="0002">123456782<', 'schemeID="0002">12345678<');                                     // SIREN with 8 digits
    x = x.replace('unitCode="HUR"', 'unitCode="H"');                                                              // home-made unit code
    x = x.replace(/<ram:RateApplicablePercent>5\.5<\/ram:RateApplicablePercent>/g, '<ram:RateApplicablePercent>5.6</ram:RateApplicablePercent>'); // a rate France does not use
    x = x.replace(/<ram:GrandTotalAmount>([\d.]+)</, (_, v) => `<ram:GrandTotalAmount>${bump(v)}<`).replace(/<ram:DuePayableAmount>([\d.]+)</, (_, v) => `<ram:DuePayableAmount>${bump(v)}<`); // total does not add up
    return x;
  }
  if (country === 'AU') {
    let x = generateUBL(i);
    x = x.replace(/<cbc:BuyerReference>[^<]*<\/cbc:BuyerReference>/, '');                                        // no buyer reference or order number
    x = x.replace(/53004156572/g, '53004156573');                                                                  // typing error in the customer's ABN
    x = x.replace('unitCode="HUR"', 'unitCode="HRS"');                                                            // home-made unit code
    x = x.replace(/<cac:PayeeFinancialAccount>.*?<\/cac:PayeeFinancialAccount>/, '');                             // bank transfer without an account
    x = x.replace(/(<cbc:TaxInclusiveAmount currencyID="AUD">)([\d.]+)</, (_, a, v) => `${a}${bump(v)}<`).replace(/(<cbc:PayableAmount currencyID="AUD">)([\d.]+)</, (_, a, v) => `${a}${bump(v)}<`);
    return x;
  }
  if (country === 'CA') {
    let x = generateUBL(i);
    x = x.replace(/<cbc:CompanyID>123456789RT0001<\/cbc:CompanyID>/, '<cbc:CompanyID>12345678RT001</cbc:CompanyID>');     // GST/HST number in the wrong form
    x = x.replace(/<cac:PaymentTerms>.*?<\/cac:PaymentTerms>/, '').replace(/<cbc:DueDate>[^<]*<\/cbc:DueDate>/, '');       // no payment terms on a sale over $500
    x = x.replace(/(<cac:AccountingCustomerParty>.*?<cbc:Name>)[^<]*(<\/cbc:Name>)/s, '$1$2').replace(/(<cac:AccountingCustomerParty>.*?<cbc:RegistrationName>)[^<]*(<\/cbc:RegistrationName>)/s, '$1$2'); // customer not named
    x = x.replace(/(<cbc:TaxInclusiveAmount currencyID="CAD">)([\d.]+)</, (_, a, v) => `${a}${bump(v)}<`).replace(/(<cbc:PayableAmount currencyID="CAD">)([\d.]+)</, (_, a, v) => `${a}${bump(v)}<`); // total does not add up
    return x;
  }
  if (country === 'PL') {
    let x = generateFA3(i);
    x = x.replace(/<P_12>5<\/P_12>/, '<P_12>6</P_12>');                                                           // a VAT rate that does not exist
    x = x.replace(/<P_2>[^<]*<\/P_2>/, '<P_2></P_2>');                                                            // empty invoice number
    x = x.replace(/(<Podmiot2>.*?<NIP>)9998887778/s, '$19998887779');                                             // typing error in the customer's NIP
    x = x.replace(/<P_1>(\d{4})-\d{2}-\d{2}<\/P_1>/, '<P_1>$1-02-30</P_1>');                                      // a date that does not exist
    return x;
  }
  i.profile = 'xrechnung'; i.buyerReference = '04011000-12345-06';
  let x = generateCII(i);
  x = x.replace(/<ram:BuyerReference>[^<]*<\/ram:BuyerReference>/, '');                                   // buyer reference missing
  x = x.replace('unitCode="HUR"', 'unitCode="STD"');                                                           // home-made unit code
  x = x.replace(/(<ram:IBANID>DE)02/, '$103');                                                                 // typing error in the IBAN
  x = x.replace(/schemeID="VA">DE123456789</, 'schemeID="VA">123456789<');                                     // VAT ID without country prefix
  x = x.replace(/<ram:GrandTotalAmount>([\d.]+)</, (_, v) => `<ram:GrandTotalAmount>${bump(v)}<`);        // total does not add up
  x = x.replace(/<ram:DuePayableAmount>([\d.]+)</, (_, v) => `<ram:DuePayableAmount>${bump(v)}<`);
  return x;
}
