// Sample invoices (form model) for Poland / KSeF FA(3). All businesses are fictional; the NIPs only have valid check digits.
import { emptyInvoice } from '../src/model.js';

const base = () => {
  const i = emptyInvoice(); i.country = 'PL'; i.currency = 'PLN';
  Object.assign(i, { number: 'FV/2026/10/017', issueDate: '2026-10-08', dueDate: '2026-10-22', deliveryDate: '2026-10-02', paymentTerms: 'Płatność przelewem w terminie 14 dni.', note: 'Dziękujemy za zamówienie.' });
  i.pl = { exemptionBasis: '', splitPayment: false, precedingKsef: '' };
  Object.assign(i.seller, { name: 'Stolarnia Przykładowa Sp. z o.o.', nationalId: '9991002009', street: 'ul. Warsztatowa 12', postcode: '00-950', city: 'Warszawa', country: 'PL', vatId: '', taxNumber: '', legalRegistration: 'KRS 0000999001', legalInfo: 'Kapitał zakładowy 50 000 zł', email: '', contactName: 'Anna Przykładowa', contactPhone: '+48 22 555 01 42', contactEmail: 'biuro@stolarnia-przykladowa.example' });
  Object.assign(i.buyer, { name: 'Kawiarnia Testowa Jan Fikcyjny', nationalId: '9995366547', street: 'ul. Lipowa 8/3', postcode: '31-001', city: 'Kraków', country: 'PL', vatId: '', email: 'faktury@kawiarnia-testowa.example', id: 'K-1007' });
  Object.assign(i.payment, { meansCode: '30', iban: 'PL61 1090 1014 0000 0712 1981 2874', bic: 'WBKPPLPP', accountName: 'Stolarnia Przykładowa Sp. z o.o.', remittance: 'FV/2026/10/017' });
  i.lines = [
    { id: '1', name: 'Lada dębowa na wymiar', description: '3,20 m, olejowana, z montażem', itemId: 'LD-320', quantity: '1', unit: 'C62', unitPrice: '4850.00', vatCategory: 'S', vatRate: '23' },
    { id: '2', name: 'Roboczogodziny montażu', description: '', itemId: '', quantity: '6.5', unit: 'HUR', unitPrice: '68.00', vatCategory: 'S', vatRate: '23' },
    { id: '3', name: 'Usługa remontowa w lokalu mieszkalnym', description: '', itemId: '', quantity: '12', unit: 'MTK', unitPrice: '95.50', vatCategory: 'S', vatRate: '8' },
  ];
  return i;
};
const german = () => ({ name: 'Café Morgenrot Muster GmbH', nationalId: '', siteId: '', street: 'Lindenstraße 8', postcode: '53111', city: 'Bonn', country: 'DE', vatId: 'DE987654321', email: 'buchhaltung@cafe-morgenrot.example', id: '' });

export const plSamples = {
  // 23% and 8% VAT, bank transfer, order and contract references
  plStandard: (() => { const i = base(); i.orderReference = 'ZAM/2026/441'; i.contractReference = 'UM-2026-11'; i.buyerReference = 'DZ-7'; return i; })(),
  // VAT-exempt small taxpayer (art. 113): every line "zw"
  plSmallBusiness: (() => { const i = base(); i.smallBusiness = true; i.number = 'R/2026/031'; Object.assign(i.seller, { name: 'Pracownia Drewna Ewa Zmyślona', nationalId: '9993188722', legalRegistration: '', legalInfo: '' }); i.pl.exemptionBasis = 'Zwolnienie na podstawie art. 113 ust. 1 ustawy o VAT'; i.lines = [i.lines[1], { id: '2', name: 'Renowacja krzesła', description: '', itemId: '', quantity: '4', unit: 'C62', unitPrice: '120', vatCategory: 'S', vatRate: '23' }]; i.payment = { ...i.payment, meansCode: '10', iban: '', bic: '' }; return i; })(),
  // correcting invoice (KOR) for an invoice that has a KSeF number
  plCorrection: (() => { const i = base(); i.typeCode = '381'; i.number = 'KOR/2026/10/003'; i.precedingNumber = 'FV/2026/10/017'; i.precedingDate = '2026-10-08'; i.pl.precedingKsef = '9991002009-20261008-0A1B2C-3D4E5F-A7'; i.note = 'Zwrot części towaru\nKorekta zmniejszająca.'; i.lines = [{ ...i.lines[1], quantity: '2' }]; i.dueDate = ''; i.deliveryDate = ''; i.paymentTerms = ''; return i; })(),
  // correction of an invoice issued outside KSeF, no note (default reason)
  plCorrectionOutsideKsef: (() => { const i = base(); i.typeCode = '384'; i.number = 'KOR/2026/10/004'; i.precedingNumber = 'FV/2025/12/090'; i.precedingDate = '2025-12-19'; i.note = ''; i.lines = [{ ...i.lines[2], quantity: '1.5' }]; i.deliveryDate = ''; return i; })(),
  // services for a German business: outside Polish VAT, the buyer accounts for the tax ("np II")
  plEuServices: (() => { const i = base(); i.buyer = german(); i.currency = 'EUR'; i.payment.iban = 'PL27114020040000300201355387'; i.lines = [{ id: '1', name: 'Projekt wnętrza kawiarni', description: 'usługa projektowa', itemId: '', quantity: '12', unit: 'HUR', unitPrice: '95.00', vatCategory: 'AE', vatRate: '0' }]; return i; })(),
  // goods delivered to a German business: intra-EU supply at 0% ("0 WDT")
  plEuGoods: (() => { const i = base(); i.buyer = german(); i.lines = [{ id: '1', name: 'Regał bukowy', description: '', itemId: 'RG-BU', quantity: '4', unit: 'C62', unitPrice: '312.50', vatCategory: 'K', vatRate: '0' }]; return i; })(),
  // export outside the EU ("0 EX"), buyer with a non-EU tax number
  plExport: (() => { const i = base(); i.buyer = { name: 'Alpenblick Hotel Muster AG', nationalId: '', siteId: '', street: 'Seestrasse 20', postcode: '8002', city: 'Zürich', country: 'CH', vatId: 'CHE-123.456.789 MWST', email: 'einkauf@alpenblick.example', id: '' }; i.lines = [{ id: '1', name: 'Lada recepcyjna orzechowa', description: '', itemId: '', quantity: '1', unit: 'C62', unitPrice: '7400', vatCategory: 'G', vatRate: '0' }]; return i; })(),
  // private customer without any tax ID, paid in cash
  plConsumer: (() => { const i = base(); i.buyer = { name: 'Jan Kowalski-Testowy', nationalId: '', siteId: '', street: 'ul. Polna 1 m. 2', postcode: '00-001', city: 'Warszawa', country: 'PL', vatId: '', email: '', id: '' }; i.payment = { ...i.payment, meansCode: '10', iban: '', bic: '', remittance: '' }; i.lines = [i.lines[0]]; return i; })(),
  // 60 lines with three VAT rates
  plManyLines: (() => { const i = base(); i.lines = Array.from({ length: 60 }, (_, k) => ({ id: String(k + 1), name: k % 5 === 0 ? 'Szafa wnękowa na wymiar, front dębowy fornirowany, korpus biały, z okuciami i listwami uchwytowymi' : 'Półka ' + (k + 1), description: k % 7 === 0 ? 'wykonanie specjalne' : '', itemId: 'A-' + (100 + k), quantity: String((k % 4) + 1) + (k % 9 === 0 ? '.25' : ''), unit: k % 11 === 0 ? 'MTR' : 'C62', unitPrice: (19.9 + k).toFixed(2), vatCategory: 'S', vatRate: k % 3 === 0 ? '8' : k % 10 === 4 ? '5' : '23' })); return i; })(),
  // characters that need escaping, line breaks in the note, long unit price
  plSpecialChars: (() => { const i = base(); i.seller.name = 'Żółć & Synowie <Drewno> "Budowa" Sp. j.'; i.note = 'Wiersz 1\nWiersz 2 – „cudzysłów” & spółka <ok>\tkoniec'; i.lines[0].name = 'Drzwi 2,10 m × 0,90 m – „dąb” & szkło'; i.lines[1].unitPrice = '68.12345'; i.lines[1].quantity = '0.333'; i.buyer.name = "O'Neil & Córki S.A."; i.seller.legalRegistration = 'CEIDG, REGON w trakcie nadawania'; return i; })(),
  // settlement period instead of a delivery date
  plPeriod: (() => { const i = base(); i.deliveryDate = ''; i.periodStart = '2026-09-01'; i.periodEnd = '2026-09-30'; i.lines = [{ id: '1', name: 'Abonament serwisowy', description: 'wrzesień 2026', itemId: 'ABO-1', quantity: '1', unit: 'MON', unitPrice: '450.00', vatCategory: 'S', vatRate: '23' }]; return i; })(),
  // domestic reverse charge ("oo") together with split payment, buyer identified by a PL-prefixed VAT ID
  plReverseChargeSplit: (() => { const i = base(); i.buyer.nationalId = ''; i.buyer.vatId = 'PL 999-645-54-54'; i.pl.splitPayment = true; i.lines = [{ id: '1', name: 'Usługa podwykonawcza', description: '', itemId: '', quantity: '1', unit: 'LS', unitPrice: '18500', vatCategory: 'AE', vatRate: '0' }, i.lines[0]]; return i; })(),
  // one exempt line (art. 43) next to a taxed one, 0% domestic and not-subject lines
  plMixedExempt: (() => { const i = base(); i.pl.exemptionBasis = 'art. 43 ust. 1 pkt 29 ustawy o VAT'; i.lines = [{ id: '1', name: 'Szkolenie zawodowe', description: '', itemId: '', quantity: '2', unit: 'DAY', unitPrice: '900', vatCategory: 'E', vatRate: '0' }, i.lines[0], { id: '3', name: 'Książka branżowa', description: '', itemId: '', quantity: '3', unit: 'C62', unitPrice: '40', vatCategory: 'S', vatRate: '5' }, { id: '4', name: 'Dostawa ze stawką 0%', description: '', itemId: '', quantity: '1', unit: 'SET', unitPrice: '100', vatCategory: 'Z', vatRate: '0' }, { id: '5', name: 'Dostawa poza terytorium kraju', description: '', itemId: '', quantity: '1', unit: 'XPK', unitPrice: '250.10', vatCategory: 'O', vatRate: '0' }]; return i; })(),
  // minimal data: no optional fields at all
  plMinimal: (() => { const i = emptyInvoice(); i.country = 'PL'; i.currency = 'PLN'; Object.assign(i, { number: '1/2026', issueDate: '2026-10-08' }); Object.assign(i.seller, { name: 'Jan Przykładowy Usługi', nationalId: '9997544361', street: 'Testowa 5', postcode: '', city: '', country: 'PL' }); Object.assign(i.buyer, { name: '', country: '' }); i.payment.meansCode = '1'; i.lines = [{ id: '1', name: 'Usługa', description: '', itemId: '', quantity: '1', unit: 'C62', unitPrice: '100', vatCategory: 'S', vatRate: '23' }]; return i; })(),
};
