// The basic (offline) reader on plain-text invoices in each country's usual wording.
import { basicExtract } from '../src/extract.js';
const T = {
  FR: `Menuiserie Lefèvre SARL\n14 rue des Tanneurs 69005 Lyon\nSIREN : 123 456 782 - SIRET : 123 456 782 00010 - TVA FR11123456782\n\nFacture n° F2026-0187\nDate de facture : 08/10/2026\nÉchéance : 07/11/2026\nClient : Boulangerie du Parc SAS  SIREN 987654324\n\n1  Comptoir en chêne sur mesure   1  u   4 850,00   20 %   4 850,00\n2  Heures de pose   6,5  h   68,00   20 %   442,00\n\nTotal HT   5 292,00 €\nTVA 20 %   1 058,40 €\nTotal TTC   6 350,40 €\nIBAN FR76 3000 6000 0112 3456 7890 189  BIC AGRIFRPP`,
  PL: `Stolarnia Brzoza sp. z o.o.\nNIP: 123-456-32-18\nFaktura VAT nr FV/2026/10/042\nData wystawienia: 08.10.2026\nTermin płatności: 22.10.2026\nNabywca: Kawiarnia Poranek s.c. NIP 9998887778\n\n1  Lada dębowa na wymiar   1  szt.   21 500,00   23 %   21 500,00\n2  Godziny montażu   6,5  godz.   290,00   23 %   1 885,00\n\nRazem netto   23 385,00 zł\nVAT 23 %   5 378,55 zł\nRazem brutto   28 763,55 zł`,
  AU: `Harbour Joinery Pty Ltd  ABN 53 004 109 063\nTAX INVOICE\nInvoice number: INV-2026-0187\nInvoice date: 08/10/2026\nDue date: 07/11/2026\nBill to: Parkside Bakery Pty Ltd  ABN: 53 004 156 572\n\n1  Oak counter, made to measure   1  ea   4,850.00   4,850.00\n2  Installation hours   6.5  hrs   68.00   442.00\n\nSubtotal   $5,292.00\nGST 10%   $529.20\nTotal including GST   $5,821.20\nBSB: 062-000  Account number: 1234 5678`,
  CA: `Lakeshore Millwork Inc.\nGST/HST no. 123456789 RT0001\nInvoice number: INV-2026-0187\nInvoice date: 2026-10-08\nDue date: 2026-11-07\n\n1  Oak counter, made to measure   1  ea   4,850.00   4,850.00\n2  Installation hours   6.5  hrs   68.00   442.00\n\nSubtotal   $5,292.00\nHST 13%   $687.96\nTotal   $5,979.96`,
};
for (const [cc, text] of Object.entries(T)) {
  const r = basicExtract(text, cc); const i = r.invoice;
  console.log(cc, '| no:', i.number, '| date:', i.issueDate, '| due:', i.dueDate, '| seller id:', i.seller.nationalId || i.seller.vatId, '| buyer id:', i.buyer.nationalId, '| lines:', i.lines.map(l => `${l.name} ${l.quantity} ${l.unit} ${l.unitPrice} @${l.vatRate}`).join(' ; '), '| stated:', JSON.stringify(r.stated), '| bank:', i.payment.iban || `${i.payment.bsb}/${i.payment.account}`, '| cur:', i.currency);
}
